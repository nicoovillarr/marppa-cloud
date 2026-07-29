import { Module } from '@/decorators/Module';
import { PrismaService } from './infrastructure/services/PrismaService';
import { LoggerService } from './infrastructure/services/LoggerService';
import { RedisService } from './infrastructure/services/RedisService';
import { WebSocketServer } from './infrastructure/http/WebSocketServer';
import { ResourceQueueService } from './infrastructure/services/ResourceQueueService';
import { ParentStateService } from './infrastructure/services/ParentStateService';
import { DockerExecService } from './infrastructure/services/DockerExecService';
import { SecretCipher } from './infrastructure/services/SecretCipher';
import { WorkerConsoleService } from './infrastructure/services/WorkerConsoleService';

@Module({
  providers: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
    DockerExecService,
    SecretCipher,
    WorkerConsoleService,
  ],
  exports: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
    DockerExecService,
    SecretCipher,
    WorkerConsoleService,
  ],
})
export class SharedModule {}
