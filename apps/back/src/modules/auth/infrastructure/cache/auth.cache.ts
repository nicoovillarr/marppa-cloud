import { Inject, Injectable } from '@nestjs/common';

import { type CacheStorage } from '@/shared/domain/services/cache.service';
import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';

const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthCache {
  private readonly prefix: string = 'auth';

  constructor(
    @Inject(CACHE_STORAGE_SYMBOL)
    private readonly cache: CacheStorage,
  ) { }

  private failedLoginKey(email: string): string {
    return `${this.prefix}:login-attempts:${email.toLowerCase()}`;
  }

  async recordFailedLogin(email: string): Promise<void> {
    const key = this.failedLoginKey(email);
    const attempts = (await this.cache.get<number>(key)) ?? 0;

    await this.cache.set(key, attempts + 1, LOGIN_LOCKOUT_WINDOW_SECONDS);
  }

  async isLoginLockedOut(email: string): Promise<boolean> {
    const attempts = (await this.cache.get<number>(this.failedLoginKey(email))) ?? 0;

    return attempts >= LOGIN_LOCKOUT_THRESHOLD;
  }

  async clearFailedLogins(email: string): Promise<void> {
    await this.cache.delete(this.failedLoginKey(email));
  }
}
