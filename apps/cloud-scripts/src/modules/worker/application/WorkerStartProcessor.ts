import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import { ILogger, ILOGGER_TOKEN } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/websocket/WebSocketServer';
import { IHiveService } from '../infrastructure/IHiveService';
import { IMeshService } from '@/mesh/infrastructure/IMeshService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Inject } from '@/decorators/Inject';

@EventProcessor(EventType.WORKER_START)
export class WorkerStartProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly wsServer: WebSocketServer,
    private readonly hiveService: IHiveService,
    private readonly meshService: IMeshService,
    
    @Inject(ILOGGER_TOKEN)
    private readonly logger: ILogger,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let worker: { id: string; status: string; ownerId: string; macAddress: string; node: { ipAddress: string; zoneId: string; status: string } | null; [k: string]: unknown } | null = null;

    const updateWorkerStatus = async (status: ResourceStatus) => {
      await this.prisma.worker.update({
        where: { id: worker!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendWorkerMessage(worker!, 'UPDATED', { status });
    };

    try {
      const resourceWorker = event.resources.find((r) => r.resourceType === 'Worker');
      if (!resourceWorker) {
        throw new Error(`No worker resource found for event ID: ${event.id}`);
      }

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { node: true },
      });

      if (!worker) throw new Error(`Worker not found for event ID: ${event.id}`);
      if (worker.status !== ResourceStatus.INACTIVE) {
        throw new Error(`Worker is not in INACTIVE state for event ID: ${event.id}`);
      }
      if (!worker.node) throw new Error(`Worker node not found for event ID: ${event.id}`);
      if (worker.node.status !== ResourceStatus.ACTIVE) {
        throw new Error(`Worker node is not in ACTIVE state for event ID: ${event.id}`);
      }

      await updateWorkerStatus(ResourceStatus.PROVISIONING);

      await this.hiveService.startWorker(worker.id);
      await new Promise<void>((resolve) => setTimeout(resolve, 5000));

      const vnet = await this.hiveService.getWorkerVnet(worker.id, worker.node.zoneId);
      if (!vnet) throw new Error(`VNet not found for worker ID: ${worker.id}`);

      await this.meshService.linkVnetToBridge(vnet, worker.node.zoneId);
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));

      const isConnected = await this.meshService.verifyWorkerConnectivity(worker.node.ipAddress, 10);
      if (!isConnected) {
        this.logger.warn(`Worker ${worker.id} not immediately reachable; running diagnostics...`);

        const bridgeDiag = await this.meshService.diagnoseBridgeConnectivity(worker.node.zoneId, worker.node.ipAddress);
        this.logger.log(`Bridge diagnostics: ${JSON.stringify(bridgeDiag, null, 2)}`);

        const workerDiag = await this.hiveService.diagnoseWorkerNetwork(worker.id, worker.node.ipAddress, worker.node.zoneId);
        this.logger.log(`Worker VM diagnostics: ${JSON.stringify(workerDiag, null, 2)}`);

        const cloudInit = await this.hiveService.checkCloudInitStatus(worker.id);
        this.logger.log(`Cloud-init status: ${JSON.stringify(cloudInit, null, 2)}`);

        const canLogin = await this.hiveService.testWorkerLogin(worker.id);
        this.logger.log(`Login test: ${canLogin ? '✅ Success' : '❌ Failed'}`);

        if (!workerDiag.vmRunning) {
          this.logger.error(`❌ Worker VM ${worker.id} is not running!`);
        } else if (!workerDiag.vmHasInterface) {
          this.logger.error(`❌ Worker VM ${worker.id} has no network interface on bridge ${worker.node.zoneId}`);
        } else if (!workerDiag.vnetConnectedToBridge) {
          this.logger.error(`❌ vnet not connected to bridge ${worker.node.zoneId}; attempting fix...`);
          const retestVnet = await this.hiveService.getWorkerVnet(worker.id, worker.node.zoneId);
          if (retestVnet) {
            const fixed = await this.meshService.fixVnetBridgeConnection(retestVnet, worker.node.zoneId);
            if (fixed) {
              await new Promise<void>((resolve) => setTimeout(resolve, 3000));
              const retest = await this.meshService.verifyWorkerConnectivity(worker.node.ipAddress, 10);
              if (retest) this.logger.log(`🎉 Worker ${worker.id} now reachable!`);
              else this.logger.warn(`⚠️ Fixed bridge but still unreachable.`);
            }
          }
        } else if (!workerDiag.cloudInitComplete) {
          this.logger.error(`❌ Cloud-init not complete on worker ${worker.id}`);
        } else if (canLogin && workerDiag.vmRunning && workerDiag.vnetConnectedToBridge) {
          const dhcpFixed = await this.meshService.forceRenewDhcpLease(worker.node.zoneId, worker.macAddress);
          if (dhcpFixed) {
            await this.hiveService.forceStopWorker(worker.id);
            await new Promise<void>((resolve) => setTimeout(resolve, 3000));
            await this.hiveService.startWorker(worker.id);
            await new Promise<void>((resolve) => setTimeout(resolve, 8000));
            const finalTest = await this.meshService.verifyWorkerConnectivity(worker.node.ipAddress, 15);
            if (finalTest) this.logger.log(`🎉 Worker ${worker.id} reachable at correct IP!`);
            else this.logger.warn(`⚠️ May need manual intervention.`);
          }
        }

        this.logger.warn(`Worker ${worker.id} may have connectivity issues.`);
      } else {
        this.logger.log(`✅ Worker ${worker.id} reachable at ${worker.node.ipAddress}`);
      }

      await updateWorkerStatus(ResourceStatus.ACTIVE);
      this.wsServer.sendWorkerMessage(worker, 'WORKER_STARTED', null);

      const eventUpdated = await this.repository.createEvent(EventType.WORKER_STARTED, event.createdBy, event.companyId);
      await this.repository.addEventResource(eventUpdated.id, 'Event', String(event.id));
      await this.repository.addEventResource(eventUpdated.id, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (worker) {
        await updateWorkerStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}

