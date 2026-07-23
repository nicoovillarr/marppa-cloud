import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';

@EventProcessor(EventType.WORKER_UPDATE)
export class WorkerUpdateProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,
    
    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) {}

  public async handle(event: EventPayload): Promise<void> {
    let worker: {
      id: string;
      status: string;
      ownerId: string;
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
        where: { id: resourceWorker.resourceId },
        include: { node: true },
      });

      if (!worker) {
        throw new Error(`Worker not found for event ID: ${event.id}`);
      }

      if (worker.status !== ResourceStatus.INACTIVE) {
        throw new Error(
          `Worker is not in INACTIVE state for event ID: ${event.id}`,
        );
      }

      await updateWorkerStatus(ResourceStatus.UPDATING);

      await new Promise<void>((resolve) => setTimeout(resolve, 3500));

      await updateWorkerStatus(ResourceStatus.INACTIVE);

      const eventUpdatedId = await this.repository.createEvent(
        EventType.WORKER_UPDATED,
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

      if (worker) {
        await this.prisma.worker.update({
          where: { id: worker.id },
          data: {
            status:
              event.retries >= 4
                ? ResourceStatus.FAILED
                : ResourceStatus.QUEUED,
            updatedBy: event.createdBy,
          },
        });
      }
      throw error;
    }
  }
}
