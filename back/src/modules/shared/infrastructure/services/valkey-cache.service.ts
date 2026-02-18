import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { VALKEY_CLIENT_SYMBOL } from '@/shared/infrastructure/providers/valkey.provider';
import { CacheStorage } from '@/shared/domain/services/cache.service';

@Injectable()
export class ValkeyCacheService implements CacheStorage {
  constructor(
    @Inject(VALKEY_CLIENT_SYMBOL)
    private readonly redis: Redis,
  ) { }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (value === undefined) {
      await this.delete(key);
      return;
    }

    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);

    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
