import type Redis from 'ioredis';
import type { PrismaClient } from '@marppa-cloud/db';
import type { BullMQEventQueue } from '../modules/event/infrastructure/BullMQEventQueue';
import type { EventWorker } from '../modules/event/application/EventWorker';
import type { HttpServer } from '../modules/shared/infrastructure/http/HttpServer';
import type { DeleteProcessor } from '../modules/shared/infrastructure/background/DeleteProcessor';
import type { IPChecker } from '../modules/shared/infrastructure/background/IPChecker';
import type { LeaseReader } from '../modules/shared/infrastructure/background/LeaseReader';
import type { ILogger } from '../modules/shared/infrastructure/logger/ILogger';
import type { WebSocketServer } from '../modules/shared/infrastructure/websocket/WebSocketServer';

export class Application {
  constructor(
    private readonly logger: ILogger,
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly queue: BullMQEventQueue,
    private readonly worker: EventWorker,
    private readonly wsServer: WebSocketServer,
    private readonly httpServer: HttpServer,
    private readonly deleteProcessor: DeleteProcessor,
    private readonly ipChecker: IPChecker,
    private readonly leaseReader: LeaseReader,
  ) {}

  async start(): Promise<void> {
    this.redis.on('error', (err) => this.logger.error(`[Redis] ${String(err)}`));

    this.wsServer.init();
    this.deleteProcessor.start();
    this.ipChecker.start();
    this.leaseReader.start();

    await this.httpServer.start();
    this.registerShutdownHooks();

    this.logger.info('[Main] Infrastructure event worker is running.');
  }

  private registerShutdownHooks(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`[Main] Received ${signal}. Shutting down...`);

      this.leaseReader.stop();
      this.ipChecker.stop();
      this.deleteProcessor.stop();

      await this.httpServer.close();
      await this.wsServer.close();
      await this.worker.close();
      await this.queue.close();
      await this.redis.quit();
      await this.prisma.$disconnect();

      this.logger.info('[Main] Shutdown complete.');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  }
}
