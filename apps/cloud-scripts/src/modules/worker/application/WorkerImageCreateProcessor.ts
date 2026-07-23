import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { AbortError } from '@/event/domain/errors/AbortError';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { HIVE_SERVICE_TOKEN, HiveService } from '../domain/services/HiveService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';

@EventProcessor(EventType.WORKER_IMAGE_CREATE)
export class WorkerImageCreateProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,
  ) {}

  public async handle(event: EventPayload): Promise<void> {
    try {
      const resourceWorkerImage = event.resources.find(
        (r) => r.resourceType === 'WorkerImage',
      );
      if (!resourceWorkerImage) {
        throw new AbortError(
          `No worker image resource found for event ID: ${event.id}`,
          EventType.WORKER_IMAGE_CREATE_FAILED,
        );
      }

      const workerImage = await this.prisma.workerImage.findUnique({
        where: { id: Number(resourceWorkerImage.resourceId) },
      });

      if (!workerImage) {
        throw new AbortError(
          `Worker image not found for event ID: ${event.id}`,
          EventType.WORKER_IMAGE_CREATE_FAILED,
        );
      }

      if (!(await this.hiveService.ensureWorkerImageExists(workerImage))) {
        throw new AbortError(
          `Could not generate worker image for event ID: ${event.id}.`,
          EventType.WORKER_IMAGE_CREATE_FAILED,
        );
      }

      const eventCreatedId = await this.repository.createEvent(
        EventType.WORKER_IMAGE_CREATED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(
        eventCreatedId,
        'Event',
        String(event.id),
      );
      await this.repository.addEventResource(
        eventCreatedId,
        'WorkerImage',
        String(workerImage.id),
      );
    } catch (error) {
      if (error instanceof AbortError) throw error;

      this.logger.error(
        `Error processing event ID ${event.id}: ${String(error)}`,
      );
      throw error;
    }
  }
}
