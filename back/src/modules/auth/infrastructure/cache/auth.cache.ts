import { Inject, Injectable } from '@nestjs/common';

import { type CacheStorage } from '@/shared/domain/services/cache.service';
import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';

@Injectable()
export class AuthCache {
  private readonly prefix: string = 'auth';

  constructor(
    @Inject(CACHE_STORAGE_SYMBOL)
    private readonly cache: CacheStorage,
  ) {}

  setIsUserAdmin(userId: number, isAdmin: boolean): void {
    this.cache.set(
      `${this.prefix}:user:${userId}:admin`,
      isAdmin ? 'true' : 'false',
      60 * 5,
    );
  }

  isUserAdmin(userId: number): boolean | undefined {
    const data = this.cache.get(`${this.prefix}:user:${userId}:admin`);
    if (data === 'true') return true;
    if (data === 'false') return false;
    return undefined;
  }
}
