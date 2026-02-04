import { Injectable } from '@nestjs/common';

import { CacheStorage } from '@/shared/domain/services/cache.service';

@Injectable()
export class RedisCacheService implements CacheStorage {
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    throw new Error('Method not implemented.');
  }
  get<T>(key: string): T | undefined {
    throw new Error('Method not implemented.');
  }
  delete(key: string): void {
    throw new Error('Method not implemented.');
  }
}
