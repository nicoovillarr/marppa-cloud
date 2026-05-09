import Redis from 'ioredis';
import { PrismaClient } from '@marppa-cloud/db';
import { Module } from '@/decorators/Module';
import { ConsoleLogger } from './infrastructure/logger/ConsoleLogger';
import { getPrismaClient } from './infrastructure/prisma/prismaClient';
import { ILogger, ILOGGER_TOKEN } from './infrastructure/logger/ILogger';

@Module({
  providers: [
    { provide: ILOGGER_TOKEN, useClass: ConsoleLogger },
    { provide: PrismaClient, useFactory: () => getPrismaClient() },
    { provide: Redis, useFactory: () => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379') },
  ],
})
export class SharedModule {
  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
  ) {}

  start(): void {
    this.redis.on('error', (err) => this.logger.error(`[Redis] ${String(err)}`));
  }

  async stop(): Promise<void> {
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}
