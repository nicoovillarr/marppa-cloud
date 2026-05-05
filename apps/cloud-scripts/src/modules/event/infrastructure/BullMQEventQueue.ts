import { Queue } from 'bullmq';
import type { IQueue } from '../domain/IQueue';
import type { ILogger } from '@/shared/infrastructure/logger/ILogger';
import Redis from 'ioredis';

const QUEUE_NAME = 'infrastructure-events';

export class BullMQEventQueue implements IQueue {
  private readonly queue: Queue;

  constructor(
    redis: Redis,
    private readonly logger: ILogger,
  ) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redis as never,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });

    this.logger.info(`[BullMQEventQueue] Queue "${QUEUE_NAME}" initialized`);
  }

  async enqueue(eventId: number): Promise<void> {
    await this.queue.add('process-event', { eventId });
    this.logger.info(`[BullMQEventQueue] Enqueued event ${eventId}`);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
