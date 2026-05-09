import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import { ILogger, ILOGGER_TOKEN } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import { AbortError } from '@/event/domain/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/websocket/WebSocketServer';
import { IHiveService } from '../infrastructure/IHiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';

@Injectable()
@EventProcessor(EventType.WORKER_DELETE)
export class WorkerDeleteProcessor implements IEventProcessor {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly wsServer: WebSocketServer,
    private readonly hiveService: IHiveService,
    
    @Inject(ILOGGER_TOKEN)
    private readonly logger: ILogger,
  ) { }

  async handle(event: EventPayload): Promise<void> {
    let worker: { id: string; status: string; ownerId: string; node: unknown; updatedBy?: string; [k: string]: unknown } | null = null;

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
        throw new AbortError(
          `No worker resource found for event ID: ${event.id}`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      worker = await this.prisma.worker.findUnique({
        where: { id: resourceWorker.resourceId, status: { not: ResourceStatus.DELETED } },
        include: { node: true },
      });

      if (!worker) {
        throw new AbortError(
          `Worker not found for event ID: ${event.id}`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      if (worker.status !== ResourceStatus.QUEUED) {
        throw new AbortError(
          `Worker is not in QUEUED state for event ID: ${event.id}`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      if (await this.hiveService.isWorkerRunning(worker.id)) {
        throw new AbortError(
          `Worker ${worker.id} is running`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      if (worker.node) {
        throw new AbortError(
          `Worker ${worker.id} is assigned to a node`,
          EventType.WORKER_DELETE_FAILED,
        );
      }

      await updateWorkerStatus(ResourceStatus.DELETING);

      await this.hiveService.deleteWorker(worker.id);

      await updateWorkerStatus(ResourceStatus.DELETED);

      this.wsServer.sendWorkerMessage(worker, 'DELETED', null);

      const createdEvent = await this.repository.createEvent(EventType.WORKER_DELETED, event.createdBy, event.companyId);
      await this.repository.addEventResource(createdEvent.id, 'Event', String(event.id));
      await this.repository.addEventResource(createdEvent.id, 'Worker', worker.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;

      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);

      if (worker) {
        await updateWorkerStatus(event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED);
      }
      throw error;
    }
  }
}

