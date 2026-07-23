import { Queue } from 'bullmq';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { RedisService } from '@/shared/infrastructure/services/RedisService';
import { EventQueueRepository } from '../../domain/repositories/EventQueueRepository';
import { OnModuleDestroy } from '@/libs/Container';

const QUEUE_NAME = 'infrastructure-events';

@Injectable()
export class BullMQEventQueueRepository
  extends EventQueueRepository
  implements OnModuleDestroy
{
  private readonly queue: Queue;

  constructor(
    redis: RedisService,
    private readonly logger: LoggerService,
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

  public async enqueue(eventId: number): Promise<void> {
    await this.queue.add('process-event', { eventId });
    this.logger.info(`[BullMQEventQueue] Enqueued event ${eventId}`);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
