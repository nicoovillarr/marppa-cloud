import { Injectable } from '@/decorators/Injectable';
import Redis from 'ioredis';
import { LoggerService } from './LoggerService';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private static requireRedisUrl(): string {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL environment variable is required');

    if (process.env.NODE_ENV === 'production') {
      const parsed = new URL(url);

      if (parsed.protocol !== 'rediss:') {
        throw new Error('REDIS_URL must use TLS (rediss://) in production.');
      }

      if (!parsed.password) {
        throw new Error('REDIS_URL must include a password in production.');
      }
    }

    return url;
  }

  constructor(private readonly logger: LoggerService) {
    super(RedisService.requireRedisUrl(), {
      maxRetriesPerRequest: null,
    });
  }

  public onModuleInit(): void {
    this.on('error', (err) => this.logger.error(`[Redis] ${String(err)}`));
  }

  public async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
