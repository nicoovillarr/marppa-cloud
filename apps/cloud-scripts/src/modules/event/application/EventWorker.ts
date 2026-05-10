import type { EventPayload } from '../domain/models/EventPayload';
import { Worker, type Job } from 'bullmq';
import { Injectable } from '@/decorators/Injectable';
import { ProcessorRegistry } from './ProcessorRegistry';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '../domain/repositories/EventRepository';
import { AbortError } from '../domain/errors/AbortError';
import { RedisService } from '@/shared/infrastructure/services/RedisService';
import { Inject } from '@/decorators/Inject';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

const QUEUE_NAME = 'infrastructure-events';

export interface IEventProcessor {
  handle(event: EventPayload): Promise<void>;
}

@Injectable()
export class EventWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;

  constructor(
    private readonly redis: RedisService,
    private readonly registry: ProcessorRegistry,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) {}
  
  public onModuleInit(): void {
    this.worker = new Worker(QUEUE_NAME, (job: Job) => this.process(job), {
      connection: this.redis as never,
      concurrency: 1,
    });

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
  public async onModuleDestroy(): Promise<void> {
    await this.worker.close();
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
      this.logger.log(`[EventWorker] Event ${eventId} processed successfully`);
    } catch (err) {
      if (err instanceof AbortError) {
        this.logger.warn(
          `[EventWorker] Event ${eventId} aborted: ${err.message}`,
        );

        if (err.failureEventType) {
          try {
            const failedEventId = await this.repository.createEvent(
              err.failureEventType,
              event.createdBy,
              event.companyId,
              null,
              err.message,
            );
            await this.repository.addEventResource(
              failedEventId,
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
}
