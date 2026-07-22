import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '@/event/domain/repositories/EventRepository';
import { AbortError } from '@/event/domain/errors/AbortError';
import { MESH_SERVICE_TOKEN, MeshService } from '@/mesh/domain/services/MeshService';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.WORKER_START);

/** Poll cadence while waiting for the VM's first boot. */
const CONNECTIVITY_POLL_MS = 5_000;
/** How long a vnet may take to appear after `virsh start`. */
const VNET_TIMEOUT_MS = 30_000;
const VNET_POLL_MS = 2_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

@EventProcessor(EventType.WORKER_START)
export class WorkerStartProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) {}

  /** Boot budget for a worker's first boot, in ms. */
  private get bootTimeoutMs(): number {
    const configured = Number(process.env.WORKER_BOOT_TIMEOUT_MS);
    return Number.isFinite(configured) && configured >= 0 ? configured : 180_000;
  }

  /**
   * The vnet only exists once QEMU has attached the tap device, which lags
   * `virsh start` slightly.
   */
  private async waitForVnet(
    workerId: string,
    zoneId: string,
  ): Promise<string | null> {
    const deadline = Date.now() + VNET_TIMEOUT_MS;

    for (;;) {
      const vnet = await this.hiveService.getWorkerVnet(workerId, zoneId);
      if (vnet) return vnet;
      if (Date.now() >= deadline) return null;

      await sleep(VNET_POLL_MS);
    }
  }

  private async waitForConnectivity(ip: string): Promise<boolean> {
    const deadline = Date.now() + this.bootTimeoutMs;

    for (;;) {
      if (await this.meshService.verifyWorkerConnectivity(ip, 5)) {
        return true;
      }

      if (Date.now() >= deadline) return false;

      this.logger.log(`Waiting for worker at ${ip} to finish booting...`);
      await sleep(CONNECTIVITY_POLL_MS);
    }
  }

  public async handle(event: EventPayload): Promise<void> {
    let statusFinalized = false;
    let worker: {
      id: string;
      status: string;
      ownerId: string;
      macAddress: string;
      node: { ipAddress: string; zoneId: string; status: string } | null;
      [k: string]: unknown;
    } | null = null;

    const updateWorkerStatus = async (status: ResourceStatus) => {
      await this.prisma.worker.update({
        where: { id: worker!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendWorkerMessage(worker!, 'UPDATED', { status });
    };

    try {
      const resourceWorker = event.resources.find(
        (r) => r.resourceType === 'Worker',
      );
      if (!resourceWorker) {
        throw new Error(`No worker resource found for event ID: ${event.id}`);
      }

      worker = await this.prisma.worker.findUnique({
        where: {
          id: resourceWorker.resourceId,
          status: { not: ResourceStatus.DELETED },
        },
        include: { node: true },
      });

      if (!worker)
        throw new Error(`Worker not found for event ID: ${event.id}`);
      if (worker.status !== STATES.entry) {
        throw new Error(
          `Worker is not in ${STATES.entry} state for event ID: ${event.id}`,
        );
      }
      if (!worker.node)
        throw new Error(`Worker node not found for event ID: ${event.id}`);
      if (worker.node.status !== ResourceStatus.ACTIVE) {
        throw new Error(
          `Worker node is not in ACTIVE state for event ID: ${event.id}`,
        );
      }

      await updateWorkerStatus(STATES.work);

      await this.hiveService.startWorker(worker.id);

      const vnet = await this.waitForVnet(worker.id, worker.node.zoneId);
      if (!vnet) throw new Error(`VNet not found for worker ID: ${worker.id}`);

      await this.meshService.linkVnetToBridge(vnet, worker.node.zoneId);

      // A cloud image needs 30-60s to finish its first boot, so a single check a
      // few seconds after `virsh start` always failed. Poll until the boot
      // budget is spent before treating the worker as unreachable.
      let isConnected = await this.waitForConnectivity(worker.node.ipAddress);
      if (!isConnected) {
        this.logger.warn(
          `Worker ${worker.id} not immediately reachable; running diagnostics...`,
        );

        const bridgeDiag = await this.meshService.diagnoseBridgeConnectivity(
          worker.node.zoneId,
          worker.node.ipAddress,
        );
        this.logger.log(
          `Bridge diagnostics: ${JSON.stringify(bridgeDiag, null, 2)}`,
        );

        const workerDiag = await this.hiveService.diagnoseWorkerNetwork(
          worker.id,
          worker.node.ipAddress,
          worker.node.zoneId,
        );
        this.logger.log(
          `Worker VM diagnostics: ${JSON.stringify(workerDiag, null, 2)}`,
        );

        const cloudInit = await this.hiveService.checkCloudInitStatus(
          worker.id,
        );
        this.logger.log(
          `Cloud-init status: ${JSON.stringify(cloudInit, null, 2)}`,
        );

        const canLogin = await this.hiveService.testWorkerLogin(worker.id);
        this.logger.log(`Login test: ${canLogin ? 'Success' : 'Failed'}`);

        if (!workerDiag.vmRunning) {
          this.logger.error(`Worker VM ${worker.id} is not running`);
        } else if (!workerDiag.vmHasInterface) {
          this.logger.error(
            `Worker VM ${worker.id} has no network interface on bridge ${worker.node.zoneId}`,
          );
        } else if (!workerDiag.vnetConnectedToBridge) {
          this.logger.error(
            `vnet not connected to bridge ${worker.node.zoneId}; attempting fix...`,
          );
          const retestVnet = await this.hiveService.getWorkerVnet(
            worker.id,
            worker.node.zoneId,
          );
          if (retestVnet) {
            const fixed = await this.meshService.fixVnetBridgeConnection(
              retestVnet,
              worker.node.zoneId,
            );
            if (fixed) {
              await sleep(3000);
              isConnected = await this.meshService.verifyWorkerConnectivity(
                worker.node.ipAddress,
                10,
              );
              if (isConnected) {
                this.logger.log(`Worker ${worker.id} now reachable`);
              } else {
                this.logger.warn('Fixed bridge but worker is still unreachable');
              }
            }
          }
        } else if (!workerDiag.cloudInitComplete) {
          this.logger.error(`Cloud-init not complete on worker ${worker.id}`);
        } else if (
          canLogin &&
          workerDiag.vmRunning &&
          workerDiag.vnetConnectedToBridge
        ) {
          const dhcpFixed = await this.meshService.forceRenewDhcpLease(
            worker.node.zoneId,
            worker.macAddress,
          );
          if (dhcpFixed) {
            await this.hiveService.forceStopWorker(worker.id);
            await sleep(3000);
            await this.hiveService.startWorker(worker.id);
            isConnected = await this.waitForConnectivity(worker.node.ipAddress);
            if (isConnected) {
              this.logger.log(
                `Worker ${worker.id} reachable at correct IP after DHCP renewal`,
              );
            } else {
              this.logger.warn('Worker may need manual intervention');
            }
          }
        }

        this.logger.warn(`Worker ${worker.id} may have connectivity issues.`);
      } else {
        this.logger.log(
          `Worker ${worker.id} reachable at ${worker.node.ipAddress}`,
        );
      }

      if (!isConnected) {
        await updateWorkerStatus(STATES.fail);
        statusFinalized = true;
        throw new AbortError(`Worker ${worker.id} unreachable after start`);
      }

      await updateWorkerStatus(STATES.ok);
      statusFinalized = true;
      this.wsServer.sendWorkerMessage(worker, 'WORKER_STARTED', null);

      const eventUpdatedId = await this.repository.createEvent(
        EventType.WORKER_STARTED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(
        eventUpdatedId,
        'Event',
        String(event.id),
      );
      await this.repository.addEventResource(
        eventUpdatedId,
        'Worker',
        worker.id,
      );
    } catch (error) {
      this.logger.error(
        `Error processing event ID ${event.id}: ${String(error)}`,
      );
      if (worker && !statusFinalized) {
        await updateWorkerStatus(
          event.retries >= 4 ? STATES.fail : STATES.entry,
        );
      }
      throw error;
    }
  }
}
