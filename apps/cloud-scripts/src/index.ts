import 'dotenv/config';
import { Redis } from 'ioredis';

import { ConsoleLogger } from './modules/shared/infrastructure/logger/ConsoleLogger';
import { getPrismaClient } from './modules/shared/infrastructure/prisma/prismaClient';

import { PrismaEventRepository } from './modules/event/infrastructure/PrismaEventRepository';
import { BullMQEventQueue } from './modules/event/infrastructure/BullMQEventQueue';
import { EventWorker } from './modules/event/application/EventWorker';
import { ProcessorRegistry } from './modules/event/application/ProcessorRegistry';
import { SystemResetProcessor } from './modules/system/application/SystemResetProcessor';
import { WorkerCreateProcessor } from './modules/worker/application/WorkerCreateProcessor';
import { WorkerUpdateProcessor } from './modules/worker/application/WorkerUpdateProcessor';
import { WorkerStartProcessor } from './modules/worker/application/WorkerStartProcessor';
import { WorkerTerminateProcessor } from './modules/worker/application/WorkerTerminateProcessor';
import { WorkerDeleteProcessor } from './modules/worker/application/WorkerDeleteProcessor';
import { WorkerImageCreateProcessor } from './modules/worker/application/WorkerImageCreateProcessor';
import { ZoneCreateProcessor } from './modules/mesh/application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from './modules/mesh/application/ZoneDeleteProcessor';
import { NodeAssignWorkerProcessor } from './modules/mesh/application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from './modules/mesh/application/NodeUnassignWorkerProcessor';
import { NodeCreateFiberProcessor } from './modules/mesh/application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from './modules/mesh/application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from './modules/mesh/application/NodeDeleteFiberProcessor';
import { PortalCreateProcessor } from './modules/orbit/application/PortalCreateProcessor';
import { PortalUpdateProcessor } from './modules/orbit/application/PortalUpdateProcessor';
import { PortalDeleteProcessor } from './modules/orbit/application/PortalDeleteProcessor';
import { TransponderCreateProcessor } from './modules/orbit/application/TransponderCreateProcessor';
import { TransponderUpdateProcessor } from './modules/orbit/application/TransponderUpdateProcessor';
import { TransponderDeleteProcessor } from './modules/orbit/application/TransponderDeleteProcessor';
import { DeleteProcessor } from './modules/shared/infrastructure/background/DeleteProcessor';
import { IPChecker } from './modules/shared/infrastructure/background/IPChecker';
import { LeaseReader } from './modules/shared/infrastructure/background/LeaseReader';
import { WebSocketServer } from './modules/shared/infrastructure/websocket/WebSocketServer';
import { startHttpServer } from './modules/shared/infrastructure/http/httpServer';

async function main(): Promise<void> {
  const {
    PORT = 3000,
    WS_PORT = 8080,
    REDIS_URL = 'redis://127.0.0.1:6379',
    JWT_SECRET = '',
    AUTH_TOKEN = '',
  } = process.env;

  const logger = new ConsoleLogger();
  const prisma = getPrismaClient();
  const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

  redis.on('error', (err) => logger.error(`[Redis] ${String(err)}`));

  const repository = new PrismaEventRepository(prisma, logger);
  const queue = new BullMQEventQueue(redis, logger);

  const wsServer = new WebSocketServer(logger, Number(WS_PORT), JWT_SECRET);
  wsServer.init();

  const registry = new ProcessorRegistry();

  registry.register(new SystemResetProcessor(repository, logger));

  registry.register(new WorkerCreateProcessor(prisma, repository, wsServer, logger));
  registry.register(new WorkerUpdateProcessor(prisma, repository, wsServer, logger));
  registry.register(new WorkerStartProcessor(prisma, repository, wsServer, logger));
  registry.register(new WorkerTerminateProcessor(prisma, repository, wsServer, logger));
  registry.register(new WorkerDeleteProcessor(prisma, repository, wsServer, logger));
  registry.register(new WorkerImageCreateProcessor(prisma, repository, logger));

  registry.register(new ZoneCreateProcessor(prisma, repository, logger));
  registry.register(new ZoneDeleteProcessor(prisma, repository, logger));

  registry.register(new NodeAssignWorkerProcessor(prisma, repository, wsServer, logger));
  registry.register(new NodeUnassignWorkerProcessor(prisma, repository, wsServer, logger));
  registry.register(new NodeCreateFiberProcessor(prisma, repository, logger));
  registry.register(new NodeUpdateFiberProcessor(prisma, repository, logger));
  registry.register(new NodeDeleteFiberProcessor(prisma, repository, logger));

  registry.register(new PortalCreateProcessor(prisma, repository, logger));
  registry.register(new PortalUpdateProcessor(prisma, repository, logger));
  registry.register(new PortalDeleteProcessor(prisma, repository, logger));

  registry.register(new TransponderCreateProcessor(prisma, repository, logger));
  registry.register(new TransponderUpdateProcessor(prisma, repository, logger));
  registry.register(new TransponderDeleteProcessor(prisma, repository, logger));

  logger.info(`[Main] Registered processors: ${registry.registeredTypes().join(', ')}`);

  const worker = new EventWorker(redis, registry, repository, logger);

  new DeleteProcessor(prisma, logger).start();
  new IPChecker(prisma, logger).start();
  new LeaseReader(logger).start();

  await startHttpServer(logger, queue, Number(PORT), AUTH_TOKEN);

  const shutdown = async (signal: string) => {
    logger.info(`[Main] Received ${signal}. Shutting down...`);

    await worker.close();
    await queue.close();
    await redis.quit();
    await prisma.$disconnect();

    logger.info('[Main] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('[Main] Infrastructure event worker is running.');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
