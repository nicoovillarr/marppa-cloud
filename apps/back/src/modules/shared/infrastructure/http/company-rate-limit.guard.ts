import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { CACHE_STORAGE_SYMBOL } from '@/shared/domain/services/cache.service';
import { type CacheStorage } from '@/shared/domain/services/cache.service';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { TooManyRequestsError } from '@/shared/domain/errors/too-many-requests.error';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 60;

@Injectable()
export class CompanyRateLimitGuard implements CanActivate {
  constructor(
    @Inject(CACHE_STORAGE_SYMBOL)
    private readonly cache: CacheStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(req.method)) return true;

    const user = getCurrentUser();
    if (!user) return true;

    const limit = Number(process.env.EVENT_QUEUE_RATE_LIMIT_PER_MINUTE) || DEFAULT_LIMIT;
    const key = `event-queue-rate:${user.companyId}`;
    const count = (await this.cache.get<number>(key)) ?? 0;

    if (count >= limit) {
      throw new TooManyRequestsError(
        'Tu empresa alcanzó el límite de acciones por minuto. Probá de nuevo en un rato.',
      );
    }

    await this.cache.set(key, count + 1, WINDOW_SECONDS);
    return true;
  }
}
