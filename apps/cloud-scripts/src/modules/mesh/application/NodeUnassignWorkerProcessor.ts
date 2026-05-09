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

@EventProcessor(EventType.NODE_UNASSIGN_WORKER)
export class NodeUnassignWorkerProcessor implements IEventProcessor {

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
    let node: { id: string; status: string; zoneId: string; [k: string]: unknown } | null = null;

    const updateNodeStatus = async (status: ResourceStatus) => {
      await this.prisma.node.update({
        where: { id: node!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendNodeMessage(node!, 'UPDATED', { status });
    };

    try {
      const resourceNode = event.resources.find((r) => r.resourceType === 'Node');
      if (!resourceNode) throw new Error(`No node resource found for event ID: ${event.id}`);

      node = await this.prisma.node.findUnique({
        where: { id: resourceNode.resourceId, status: { not: ResourceStatus.DELETED } },
      });

      if (!node) throw new Error(`Node not found for event ID: ${event.id}`);
      if (node.status !== ResourceStatus.ACTIVE) {
        throw new Error(`Node is not in ACTIVE state for event ID: ${event.id}`);
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

      await updateNodeStatus(ResourceStatus.TERMINATING);

      await this.meshService.deleteNodeFromZone(node.zoneId, worker.macAddress);
      await this.hiveService.editWorkerZone(worker.id, null);

      await this.prisma.worker.update({
        where: { id: worker.id },
        data: { node: { disconnect: true }, updatedBy: event.createdBy },
      });

      await updateNodeStatus(ResourceStatus.INACTIVE);

      this.wsServer.sendWorkerMessage(worker, 'UPDATED', { node: null });

      await this.prisma.node.update({
        where: { id: node.id },
        data: { worker: { disconnect: true } },
      });

      const createdEventId = await this.repository.createEvent(EventType.NODE_UNASSIGNED_WORKER, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Node', node.id);
      await this.repository.addEventResource(createdEventId, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (node) {
        await updateNodeStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}

