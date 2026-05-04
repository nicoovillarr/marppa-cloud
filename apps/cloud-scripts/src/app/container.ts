import 'dotenv/config';
import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { Redis } from 'ioredis';
import { Application } from './Application';
import { EventWorker } from '../modules/event/application/EventWorker';
import { ProcessorRegistry } from '../modules/event/application/ProcessorRegistry';
import type { IEventProcessor } from '../modules/event/domain/IEventProcessor';
import { BullMQEventQueue } from '../modules/event/infrastructure/BullMQEventQueue';
import { PrismaEventRepository } from '../modules/event/infrastructure/PrismaEventRepository';
import { SystemResetProcessor } from '../modules/system/application/SystemResetProcessor';
import { WorkerCreateProcessor } from '../modules/worker/application/WorkerCreateProcessor';
import { WorkerUpdateProcessor } from '../modules/worker/application/WorkerUpdateProcessor';
import { WorkerStartProcessor } from '../modules/worker/application/WorkerStartProcessor';
import { WorkerTerminateProcessor } from '../modules/worker/application/WorkerTerminateProcessor';
import { WorkerDeleteProcessor } from '../modules/worker/application/WorkerDeleteProcessor';
import { WorkerImageCreateProcessor } from '../modules/worker/application/WorkerImageCreateProcessor';
import { ZoneCreateProcessor } from '../modules/mesh/application/ZoneCreateProcessor';
import { ZoneDeleteProcessor } from '../modules/mesh/application/ZoneDeleteProcessor';
import { NodeAssignWorkerProcessor } from '../modules/mesh/application/NodeAssignWorkerProcessor';
import { NodeUnassignWorkerProcessor } from '../modules/mesh/application/NodeUnassignWorkerProcessor';
import { NodeCreateFiberProcessor } from '../modules/mesh/application/NodeCreateFiberProcessor';
import { NodeUpdateFiberProcessor } from '../modules/mesh/application/NodeUpdateFiberProcessor';
import { NodeDeleteFiberProcessor } from '../modules/mesh/application/NodeDeleteFiberProcessor';
import { PortalCreateProcessor } from '../modules/orbit/application/PortalCreateProcessor';
import { PortalUpdateProcessor } from '../modules/orbit/application/PortalUpdateProcessor';
import { PortalDeleteProcessor } from '../modules/orbit/application/PortalDeleteProcessor';
import { TransponderCreateProcessor } from '../modules/orbit/application/TransponderCreateProcessor';
import { TransponderUpdateProcessor } from '../modules/orbit/application/TransponderUpdateProcessor';
import { TransponderDeleteProcessor } from '../modules/orbit/application/TransponderDeleteProcessor';
import { DeleteProcessor } from '../modules/shared/infrastructure/background/DeleteProcessor';
import { IPChecker } from '../modules/shared/infrastructure/background/IPChecker';
import { LeaseReader } from '../modules/shared/infrastructure/background/LeaseReader';
import { HttpServer } from '../modules/shared/infrastructure/http/HttpServer';
import { ConsoleLogger } from '../modules/shared/infrastructure/logger/ConsoleLogger';
import { getPrismaClient } from '../modules/shared/infrastructure/prisma/prismaClient';
import { WebSocketServer } from '../modules/shared/infrastructure/websocket/WebSocketServer';
import { HiveService } from '../modules/worker/infrastructure/HiveService';
import { MeshService } from '../modules/mesh/infrastructure/MeshService';
import { OrbitService } from '../modules/orbit/infrastructure/OrbitService';

const processorClasses: Array<new (...args: any[]) => IEventProcessor> = [
  SystemResetProcessor,
  WorkerCreateProcessor,
  WorkerUpdateProcessor,
  WorkerStartProcessor,
  WorkerTerminateProcessor,
  WorkerDeleteProcessor,
  WorkerImageCreateProcessor,
  ZoneCreateProcessor,
  ZoneDeleteProcessor,
  NodeAssignWorkerProcessor,
  NodeUnassignWorkerProcessor,
  NodeCreateFiberProcessor,
  NodeUpdateFiberProcessor,
  NodeDeleteFiberProcessor,
  PortalCreateProcessor,
  PortalUpdateProcessor,
  PortalDeleteProcessor,
  TransponderCreateProcessor,
  TransponderUpdateProcessor,
  TransponderDeleteProcessor,
] as const;

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
  } = process.env;

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
    hiveService: asClass(HiveService).singleton(),
    meshService: asClass(MeshService).singleton(),
    orbitService: asClass(OrbitService).singleton(),
    httpPort: asValue(Number(PORT)),
    wsPort: asValue(Number(WS_PORT)),
    jwtSecret: asValue(JWT_SECRET),
    authToken: asValue(AUTH_TOKEN),
  });

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
