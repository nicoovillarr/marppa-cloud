import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import { ILogger, ILOGGER_TOKEN } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/websocket/WebSocketServer';
import { IMeshService } from '../infrastructure/IMeshService';
import { IHiveService } from '@/worker/infrastructure/IHiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';

@Injectable()
@EventProcessor(EventType.NODE_UNASSIGN_WORKER)
export class NodeUnassignWorkerProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly wsServer: WebSocketServer,
    private readonly meshService: IMeshService,
    private readonly hiveService: IHiveService,
    
    @Inject(ILOGGER_TOKEN)
    private readonly logger: ILogger,
  ) { }

  async handle(event: EventPayload): Promise<void> {
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

      const createdEvent = await this.repository.createEvent(EventType.NODE_UNASSIGNED_WORKER, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Node', node.id);
      await this.repository.addEventResource(createdEvent.id, 'Worker', worker.id);
    } catch (error) {
      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);
      if (node) {
        await updateNodeStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}

