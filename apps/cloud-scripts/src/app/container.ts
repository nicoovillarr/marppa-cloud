import 'dotenv/config';
import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { Redis } from 'ioredis';
import { Application } from './Application';
import { AppModule } from './AppModule';
import { EventWorker } from '@/event/application/EventWorker';
import { ProcessorRegistry } from '@/event/application/ProcessorRegistry';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { BullMQEventQueue } from '@/event/infrastructure/BullMQEventQueue';
import { PrismaEventRepository } from '@/event/infrastructure/PrismaEventRepository';
import { DeleteProcessor } from '@/shared/infrastructure/background/DeleteProcessor';
import { IPChecker } from '@/shared/infrastructure/background/IPChecker';
import { LeaseReader } from '@/shared/infrastructure/background/LeaseReader';
import { HttpServer } from '@/shared/infrastructure/http/HttpServer';
import { ConsoleLogger } from '@/shared/infrastructure/logger/ConsoleLogger';
import { getPrismaClient } from '@/shared/infrastructure/prisma/prismaClient';
import { WebSocketServer } from '@/shared/infrastructure/websocket/WebSocketServer';
import { HiveService } from '@/worker/infrastructure/HiveService';
import { StubHiveService } from '@/worker/infrastructure/StubHiveService';
import { MeshService } from '@/mesh/infrastructure/MeshService';
import { StubMeshService } from '@/mesh/infrastructure/StubMeshService';
import { OrbitService } from '@/orbit/infrastructure/OrbitService';
import { StubOrbitService } from '@/orbit/infrastructure/StubOrbitService';
import { getModuleProcessors } from '@/decorators/Module';

function toRegistrationName(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function createRedis(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export function buildContainer() {
  const {
    PORT = '3000',
    WS_PORT = '8080',
    REDIS_URL = 'redis://127.0.0.1:6379',
    JWT_SECRET = '',
    AUTH_TOKEN = '',
    USE_STUBS = 'false',
  } = process.env;

  const useStubs = USE_STUBS === 'true';

  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC,
  });

  container.register({
    application: asClass(Application).singleton(),
    logger: asClass(ConsoleLogger).singleton(),
    prisma: asFunction(getPrismaClient).singleton(),
    redis: asFunction(createRedis).singleton(),
    redisUrl: asValue(REDIS_URL),
    repository: asClass(PrismaEventRepository).singleton(),
    queue: asClass(BullMQEventQueue).singleton(),
    wsServer: asClass(WebSocketServer).singleton(),
    httpServer: asClass(HttpServer).singleton(),
    worker: asClass(EventWorker).singleton(),
    deleteProcessor: asClass(DeleteProcessor).singleton(),
    ipChecker: asClass(IPChecker).singleton(),
    leaseReader: asClass(LeaseReader).singleton(),
    hiveService: asClass(useStubs ? StubHiveService : HiveService).singleton(),
    meshService: asClass(useStubs ? StubMeshService : MeshService).singleton(),
    orbitService: asClass(useStubs ? StubOrbitService : OrbitService).singleton(),
    httpPort: asValue(Number(PORT)),
    wsPort: asValue(Number(WS_PORT)),
    jwtSecret: asValue(JWT_SECRET),
    authToken: asValue(AUTH_TOKEN),
  });

  const processorClasses = getModuleProcessors(AppModule);

  for (const ProcessorClass of processorClasses) {
    container.register({
      [toRegistrationName(ProcessorClass.name)]: asClass(ProcessorClass).singleton(),
    });
  }

  container.register({
    registry: asFunction(() => {
      const registry = new ProcessorRegistry();

      for (const ProcessorClass of processorClasses) {
        const processor = container.resolve<IEventProcessor>(toRegistrationName(ProcessorClass.name));
        registry.register(processor);
      }

      return registry;
    }).singleton(),
  });

  return container;
}
