import type { EventPayload } from '../domain/models/EventPayload';
import { DelayedError, Worker, type Job } from 'bullmq';
import { Injectable } from '@/decorators/Injectable';
import { ProcessorRegistry } from './ProcessorRegistry';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '../domain/repositories/EventRepository';
import { AbortError } from '../domain/errors/AbortError';
import { expectedPrimaryResources } from '../domain/models/SystemScopedEvents';
import { RedisService } from '@/shared/infrastructure/services/RedisService';
import { Inject } from '@/decorators/Inject';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';
import { EventResourceRole, EventType } from '@marppa-cloud/db';
import { ParentStateService } from '@/shared/infrastructure/services/ParentStateService';
import { FAILED_VARIANT } from '../domain/models/FailedVariant';
import type { EventJobData } from '../domain/models/PrimaryResourceRef';

const QUEUE_NAME = 'infrastructure-events';
const WORKER_CONCURRENCY = 10;
const MAX_JOB_ATTEMPTS = 5;
const PARENT_DEFER_BASE_MS = 2000;
const PARENT_DEFER_CAP_MS = 30000;

export interface IEventProcessor {
  handle(event: EventPayload): Promise<void>;
}

@Injectable()
export class EventWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly registry: ProcessorRegistry,
    private readonly logger: LoggerService,
    private readonly parentState: ParentStateService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,
  ) {}

  public onModuleInit(): void {
    this.worker = new Worker(QUEUE_NAME, (job: Job) => this.process(job), {
      connection: this.redis as never,
      concurrency: WORKER_CONCURRENCY,
    });

    this.worker.on('completed', (job) => {
      this.logger.info(`[EventWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', async (job, err) => {
      try {
        if (job?.attemptsMade !== undefined && job.attemptsMade >= MAX_JOB_ATTEMPTS) {
          const { eventId } = (job.data ?? {}) as EventJobData;
          if (typeof eventId === 'number') {
            await this.repository.markFailed(eventId);
          }
        }
      } catch (markFailedError) {
        this.logger.error(
          `[EventWorker] Failed to mark event as failed after job ${job?.id ?? 'unknown'} exhausted retries: ${String(markFailedError)}`,
        );
      }

      this.logger.error(
        `[EventWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`,
      );
    });

    this.logger.info(
      `[EventWorker] Worker started (concurrency: ${WORKER_CONCURRENCY})`,
    );
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async process(job: Job): Promise<void> {
    const data = (job.data ?? {}) as EventJobData;
    const { eventId } = data;

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

    const primaries = event.resources.filter(
      (r) => r.role === EventResourceRole.PRIMARY,
    );
    const expectedPrimaries = expectedPrimaryResources(event.type as EventType);
    if (primaries.length !== expectedPrimaries) {
      this.logger.error(
        `[EventWorker] Event ${eventId} has ${primaries.length} PRIMARY resources ` +
        `(expected ${expectedPrimaries}). Marking as failed.`,
      );
      await this.repository.markFailed(eventId);
      return;
    }

    const parents = event.resources.filter(
      (r) => r.role === EventResourceRole.PARENT,
    );
    if (parents.length > 1) {
      this.logger.error(
        `[EventWorker] Event ${eventId} has ${parents.length} PARENT resources (expected 0 or 1). Marking as failed.`,
      );
      await this.repository.markFailed(eventId);
      return;
    }

    if (parents.length === 1) {
      const parent = parents[0];
      const classification = await this.parentState.classify(
        parent.resourceType,
        parent.resourceId,
      );

      if (classification.kind === 'transient') {
        const attempt = job.attemptsMade ?? 0;
        const delay = Math.min(
          PARENT_DEFER_BASE_MS * Math.pow(2, attempt),
          PARENT_DEFER_CAP_MS,
        );
        this.logger.warn(
          `[EventWorker] Event ${eventId} parent ${parent.resourceType}:${parent.resourceId} is transient (${classification.status}). Deferring ${delay}ms.`,
        );
        await job.moveToDelayed(Date.now() + delay, job.token);
        throw new DelayedError();
      }

      if (classification.kind === 'failed' || classification.kind === 'missing') {
        throw new AbortError(
          `Parent ${parent.resourceType}:${parent.resourceId} is ${classification.kind === 'missing' ? 'missing' : `terminal-failed (${classification.status})`} for event ${eventId}.`,
          FAILED_VARIANT[event.type as EventType],
        );
      }
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

        try {
          if (err.failureEventType) {
            const failedEventId = await this.repository.createEvent(
              err.failureEventType,
              event.createdBy,
              event.companyId,
              undefined,
              err.message,
            );
            await this.repository.addEventResource(
              failedEventId,
              'Event',
              String(eventId),
            );
          }

          await this.repository.markFailed(eventId);
        } catch (innerErr) {
          this.logger.error(
            `[EventWorker] Failed to record event failure for ${eventId}: ${String(innerErr)}`,
          );
        }

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
