import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_QUEUE_CLIENT_SYMBOL = Symbol('REDIS_QUEUE_CLIENT');

export const RedisQueueProvider: Provider = {
  provide: REDIS_QUEUE_CLIENT_SYMBOL,
  useFactory: () => {
    const { REDIS_URL } = process.env;
    if (!REDIS_URL) return null;

    return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  },
};
