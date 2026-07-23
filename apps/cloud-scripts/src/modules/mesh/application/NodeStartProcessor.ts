import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';
import { HIVE_SERVICE_TOKEN, HiveService } from '@/worker/domain/services/HiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.NODE_START);

/**
 * Turn a node back on: re-add its DHCP reservation and re-attach the worker NIC
 * to the (already active) zone bridge, restoring the same reserved IP. The
 * inverse of NODE_STOP; mirrors the host side of NODE_ASSIGN_WORKER without
 * re-creating the node row.
 */
@EventProcessor(EventType.NODE_START)
export class NodeStartProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let node: any = null;

    const updateNodeStatus = async (status: ResourceStatus) => {
      await this.prisma.node.update({
        where: { id: node!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendNodeMessage(
        { id: node!.id, ownerId: node!.zone.ownerId },
        'UPDATED',
        { status },
      );
    };

    try {
      const resourceNode = event.resources.find((r) => r.resourceType === 'Node');
      if (!resourceNode) throw new Error(`No node resource found for event ID: ${event.id}`);

      node = await this.prisma.node.findUnique({
        where: { id: resourceNode.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { zone: true },
      });

      if (!node) throw new Error(`Node not found for event ID: ${event.id}`);
      if (node.status !== STATES.entry) {
        throw new Error(`Node is not in ${STATES.entry} state for event ID: ${event.id}`);
      }

      if (node.zone.status !== ResourceStatus.ACTIVE) {
        throw new Error(`Zone ${node.zoneId} is not ACTIVE; cannot start node ${node.id}`);
      }

      const resourceWorker = event.resources.find((r) => r.resourceType === 'Worker');
      if (!resourceWorker) throw new Error(`No worker resource found for event ID: ${event.id}`);

      const worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId, status: { not: ResourceStatus.DELETED } },
      });

      if (!worker) throw new Error(`Worker not found for event ID: ${event.id}`);
      if (worker.status !== ResourceStatus.INACTIVE) {
        throw new Error(`Worker is not in INACTIVE state for event ID: ${event.id}`);
      }

      await updateNodeStatus(STATES.work);

      // Re-bake the static-IP cloud-init seed (idempotent; the IP reservation is
      // unchanged) so the next boot configures networking deterministically.
      const prefix = Number(node.zone.cidr.split('/')[1]);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`Invalid CIDR prefix on zone ${node.zoneId}: ${node.zone.cidr}`);
      }
      await this.hiveService.rearmCloudInitISO(worker.id, worker.name, worker.macAddress, {
        ipAddress: node.ipAddress,
        gateway: node.zone.gateway,
        prefix,
      });

      await this.meshService.addNodeToZone(node.zoneId, worker.macAddress, node.ipAddress);
      try {
        await this.hiveService.editWorkerZone(worker.id, node.zoneId, worker.macAddress);
      } catch (err) {
        await this.meshService.deleteNodeFromZone(node.zoneId, worker.macAddress);
        throw err;
      }

      await updateNodeStatus(STATES.ok);

      const createdEventId = await this.repository.createEvent(EventType.NODE_STARTED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Node', node.id);
      await this.repository.addEventResource(createdEventId, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (node) {
        await updateNodeStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}
