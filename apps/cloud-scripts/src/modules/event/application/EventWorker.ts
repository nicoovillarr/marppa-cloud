import { Worker, type Job } from 'bullmq';
import type Redis from 'ioredis';
import type { IEventRepository } from '../domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { ProcessorRegistry } from './ProcessorRegistry';
import { AbortError } from '../domain/EventPayload';

const QUEUE_NAME = 'infrastructure-events';

export class EventWorker {
  private readonly worker: Worker;

  constructor(
    redis: Redis,
    private readonly registry: ProcessorRegistry,
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
  ) {
    this.worker = new Worker(
      QUEUE_NAME,
      (job: Job) => this.process(job),
      {
        connection: redis as never,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`[EventWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `[EventWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`,
      );
    });

    this.logger.info('[EventWorker] Worker started (concurrency: 1)');
  }

  private async process(job: Job): Promise<void> {
    const { eventId } = job.data as { eventId: number };

    const event = await this.repository.findById(eventId);
    if (!event) {
      this.logger.warn(
        `[EventWorker] Event ${eventId} not found — may have been deleted. Skipping.`,
      );
      return;
    }

    if (event.processedAt || event.failedAt) {
      this.logger.warn(
        `[EventWorker] Event ${eventId} already processed/failed. Skipping.`,
      );
      return;
    }

    const processor = this.registry.resolve(event.type);
    if (!processor) {
      this.logger.error(
        `[EventWorker] No processor registered for event type "${event.type}". Marking as failed.`,
      );
      await this.repository.markFailed(eventId);
      return;
    }

    this.logger.log(
      `[EventWorker] Processing event ${eventId} (type: ${event.type})`,
    );

    try {
      await processor.handle(event);
      await this.repository.markProcessed(eventId);
      this.logger.log(
        `[EventWorker] Event ${eventId} processed successfully`,
      );
    } catch (err) {
      if (err instanceof AbortError) {
        this.logger.warn(
          `[EventWorker] Event ${eventId} aborted: ${err.message}`,
        );

        if (err.failureEventType) {
          try {
            const failedEvent = await this.repository.createEvent(
              err.failureEventType,
              event.createdBy,
              event.companyId,
              null,
              err.message,
            );
            await this.repository.addEventResource(
              failedEvent.id,
              'Event',
              String(eventId),
            );
          } catch (innerErr) {
            this.logger.error(
              `[EventWorker] Failed to create failure event for ${eventId}: ${String(innerErr)}`,
            );
          }
        }

        await this.repository.markFailed(eventId);

        return;
      }

      this.logger.error(
        `[EventWorker] Unexpected error processing event ${eventId}: ${String(err)}`,
      );
      await this.repository.incrementRetry(eventId);
      throw err;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
