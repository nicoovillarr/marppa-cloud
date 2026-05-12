import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_QUEUE_CLIENT_SYMBOL } from '../providers/redis-queue.provider';

const QUEUE_NAME = 'infrastructure-events';

@Injectable()
export class EventQueueService implements OnModuleDestroy {
  private readonly queue: Queue | null = null;

  constructor(
    @Inject(REDIS_QUEUE_CLIENT_SYMBOL)
    redis: Redis | null,
  ) {
    if (redis) {
      this.queue = new Queue(QUEUE_NAME, { connection: redis as never });
    }
  }

  async enqueue(eventId: number): Promise<void> {
    await this.queue?.add('process-event', { eventId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
