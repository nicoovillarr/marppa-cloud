import { Queue } from 'bullmq';
import { Injectable } from '@/decorators/Injectable';
import { IQueue } from '../domain/IQueue';
import { ILogger, ILOGGER_TOKEN } from '@/shared/infrastructure/logger/ILogger';
import Redis from 'ioredis';
import { Inject } from '@/decorators/Inject';

const QUEUE_NAME = 'infrastructure-events';

@Injectable()
export class BullMQEventQueue extends IQueue {
  private readonly queue: Queue;

  constructor(
    redis: Redis,

    @Inject(ILOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    super();
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
