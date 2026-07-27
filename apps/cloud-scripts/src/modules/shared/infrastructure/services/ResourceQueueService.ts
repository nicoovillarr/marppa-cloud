import { Injectable } from '@/decorators/Injectable';
import { RedisService } from './RedisService';
import { Queue } from 'bullmq';
import { LoggerService } from './LoggerService';
import { OnModuleInit, OnModuleDestroy } from '@/libs/Container';
import { eventJobId } from '@marppa-cloud/shared';
import type {
  EventJobData,
  PrimaryResourceRef,
} from '@/event/domain/models/PrimaryResourceRef';

const QUEUE_NAME = 'infrastructure-events';
const RESOURCE_QUEUE_PREFIX = 'resource-queue';

const ADVANCE_LUA = `
local key = KEYS[1]
local id = ARGV[1]
local headBefore = redis.call('LINDEX', key, 0)
redis.call('LREM', key, 0, id)
local headAfter = redis.call('LINDEX', key, 0)
if headBefore == id and headAfter then
  return headAfter
end
return ''
`;

@Injectable()
export class ResourceQueueService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  public onModuleInit(): void {
    // Same retry policy as the backend's EventQueueService: jobs added when the
    // resource FIFO advances must retry too, or a transient failure on a
    // follow-up event permanently jams that resource's lane.
    this.queue = new Queue(QUEUE_NAME, {
      connection: this.redis as never,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  public async advance(
    primary: PrimaryResourceRef,
    eventId: number,
  ): Promise<void> {
    if (!this.queue) return;

    const key = resourceQueueKey(primary);
    const nextRaw = (await this.redis.eval(
      ADVANCE_LUA,
      1,
      key,
      String(eventId),
    )) as string;

    if (!nextRaw) return;

    const nextEventId = Number(nextRaw);
    const jobData: EventJobData = { eventId: nextEventId, primary };

    await this.queue.add('process-event', jobData, {
      jobId: eventJobId(nextEventId),
    });

    this.logger.info(
      `[ResourceQueueService] Advanced ${key}: enqueued next event ${nextEventId}`,
    );
  }

  public async enqueue(primary: PrimaryResourceRef, eventId: number): Promise<void> {
    if (!this.queue) return;

    const jobData: EventJobData = { eventId, primary };
    await this.queue.add('process-event', jobData, {
      jobId: eventJobId(eventId),
    });
  }

  public async cancel(
    primary: PrimaryResourceRef,
    eventId: number,
  ): Promise<void> {
    if (!this.queue) return;

    try {
      await this.queue.remove(String(eventId));
    } catch (err) {
      this.logger.warn(
        `[ResourceQueueService] Failed to remove BullMQ job ${eventId}: ${String(err)}`,
      );
    }

    await this.advance(primary, eventId);
  }
}

export function resourceQueueKey(primary: PrimaryResourceRef): string {
  return `${RESOURCE_QUEUE_PREFIX}:${primary.type}:${primary.id}`;
}
