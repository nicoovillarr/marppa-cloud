import { Module } from '@/decorators/Module';
import { PrismaService } from './infrastructure/services/PrismaService';
import { LoggerService } from './infrastructure/services/LoggerService';
import { RedisService } from './infrastructure/services/RedisService';
import { WebSocketServer } from './infrastructure/http/WebSocketServer';
import { ResourceQueueService } from './infrastructure/services/ResourceQueueService';
import { ParentStateService } from './infrastructure/services/ParentStateService';
import { DockerExecService } from './infrastructure/services/DockerExecService';

@Module({
  providers: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
    DockerExecService,
  ],
  exports: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
    DockerExecService,
  ],
})
export class SharedModule {}
