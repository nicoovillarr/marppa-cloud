import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_QUEUE_CLIENT_SYMBOL = Symbol('REDIS_QUEUE_CLIENT');

export const RedisQueueProvider: Provider = {
  provide: REDIS_QUEUE_CLIENT_SYMBOL,
  useFactory: () => {
    const { REDIS_URL } = process.env;

    // Without a queue client every dispatch silently no-ops: resources would sit
    // in QUEUED forever with no error anywhere. Fail at boot instead.
    if (!REDIS_URL) {
      throw new Error(
        'REDIS_URL is required: it is the BullMQ queue shared with cloud-scripts. ' +
        'Without it no infrastructure event is ever delivered.',
      );
    }

    return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  },
};
