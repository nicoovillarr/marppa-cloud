import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_QUEUE_CLIENT_SYMBOL } from '../providers/redis-queue.provider';

const QUEUE_NAME = 'infrastructure-events';
const RESOURCE_QUEUE_PREFIX = 'resource-queue';

export interface PrimaryResourceRef {
  type: string;
  id: string;
}

export interface EventJobData {
  eventId: number;
  primary?: PrimaryResourceRef;
}

const ENQUEUE_LUA = `
local key = KEYS[1]
local eventId = ARGV[1]
local len = redis.call('RPUSH', key, eventId)
if len == 1 then
  return 1
end
return 0
`;

@Injectable()
export class EventQueueService implements OnModuleDestroy {
  private readonly queue: Queue | null = null;
  private readonly redis: Redis | null;

  constructor(
    @Inject(REDIS_QUEUE_CLIENT_SYMBOL)
    redis: Redis | null,
  ) {
    this.redis = redis;

    if (redis) {
      this.queue = new Queue(QUEUE_NAME, { connection: redis as never });
    }
  }

  async enqueue(eventId: number, primary?: PrimaryResourceRef): Promise<void> {
    if (!this.queue) return;

    const data: EventJobData = { eventId, primary };
    const jobId = String(eventId);

    if (!primary || !this.redis) {
      await this.queue.add('process-event', data, { jobId });
      return;
    }

    const key = resourceQueueKey(primary);
    const isHead = (await this.redis.eval(
      ENQUEUE_LUA,
      1,
      key,
      String(eventId),
    )) as number;

    if (isHead === 1) {
      await this.queue.add('process-event', data, { jobId });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}

export function resourceQueueKey(primary: PrimaryResourceRef): string {
  return `${RESOURCE_QUEUE_PREFIX}:${primary.type}:${primary.id}`;
}
