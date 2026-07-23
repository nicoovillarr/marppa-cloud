import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { getRefreshTokenTtlDays } from '@/auth/domain/config/refresh-token-ttl';
import {
  AUTH_REPOSITORY_SYMBOL,
  type AuthRepository,
} from '@/auth/domain/repositories/auth.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    @Inject(AUTH_REPOSITORY_SYMBOL)
    private readonly repo: AuthRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - getRefreshTokenTtlDays() * MS_PER_DAY);
    const deleted = await this.repo.deleteExpiredSessions(cutoff);

    if (deleted > 0) {
      this.logger.log(
        `Purged ${deleted} expired session(s) older than ${cutoff.toISOString()}`,
      );
    }
  }
}
