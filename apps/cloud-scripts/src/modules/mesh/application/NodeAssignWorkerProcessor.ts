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

@EventProcessor(EventType.NODE_ASSIGN_WORKER)
export class NodeAssignWorkerProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
    
    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let node: any = null;

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
        include: { zone: true, fibers: true, transponders: true },
      });

      if (!node) throw new Error(`Node not found for event ID: ${event.id}`);
      if (node.status !== ResourceStatus.QUEUED) {
        throw new Error(`Node is not in QUEUED state for event ID: ${event.id}`);
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

      await updateNodeStatus(ResourceStatus.PROVISIONING);

      await this.meshService.addNodeToZone(node.zoneId, worker.macAddress, node.ipAddress);
      try {
        await this.hiveService.editWorkerZone(worker.id, node.zoneId, worker.macAddress);
      } catch (err) {
        await this.meshService.deleteNodeFromZone(node.zoneId, worker.macAddress);
        throw err;
      }

      await this.prisma.worker.update({
        where: { id: worker.id },
        data: { node: { connect: { id: node.id } }, updatedBy: event.createdBy },
      });

      await updateNodeStatus(ResourceStatus.ACTIVE);

      this.wsServer.sendWorkerMessage(worker, 'UPDATED', { node });

      const createdEventId = await this.repository.createEvent(EventType.NODE_ASSIGNED_WORKER, event.createdBy, event.companyId);
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

