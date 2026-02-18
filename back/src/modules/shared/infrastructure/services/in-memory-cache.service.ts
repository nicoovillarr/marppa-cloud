import { Injectable } from '@nestjs/common';
import { CacheStorage } from '@/shared/domain/services/cache.service';

type CacheEntry = { value: string; expires: number };

@Injectable()
export class InMemoryCacheService implements CacheStorage {
  private store = new Map<string, CacheEntry>();

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (value === undefined) {
      this.store.delete(key);
      return;
    }

    const expires =
      ttlSeconds !== undefined
        ? Date.now() + ttlSeconds * 1000
        : Number.POSITIVE_INFINITY;

    const serialized = JSON.stringify(value);
    this.store.set(key, { value: serialized, expires });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }

    return JSON.parse(entry.value) as T;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
