import { Injectable } from '@/decorators/Injectable';
import Redis from 'ioredis';
import { LoggerService } from './LoggerService';
import { OnModuleDestroy, OnModuleInit } from '@/app/container';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: LoggerService) {
    super(process.env.REDIS_URL);
  }

  public onModuleInit(): void {
    this.on('error', (err) => this.logger.error(`[Redis] ${String(err)}`));
  }

  public async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
