import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { PrismaClient } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { AbortError } from '../../event/domain/EventPayload';
import { HiveService } from '../infrastructure/HiveService';

import { EventProcessor } from '../../../decorators/EventProcessor';

@EventProcessor
export class WorkerImageCreateProcessor implements IEventProcessor {
  readonly eventType = EventType.WORKER_IMAGE_CREATE;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly hiveService: HiveService,
  ) {}

  async handle(event: EventPayload): Promise<void> {
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

      const eventCreated = await this.repository.createEvent(
        EventType.WORKER_IMAGE_CREATED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(
        eventCreated.id,
        'Event',
        String(event.id),
      );
      await this.repository.addEventResource(
        eventCreated.id,
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
