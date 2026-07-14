import { Module } from '@/decorators/Module';
import { PrismaService } from './infrastructure/services/PrismaService';
import { LoggerService } from './infrastructure/services/LoggerService';
import { RedisService } from './infrastructure/services/RedisService';
import { WebSocketServer } from './infrastructure/http/WebSocketServer';
import { ResourceQueueService } from './infrastructure/services/ResourceQueueService';
import { ParentStateService } from './infrastructure/services/ParentStateService';

@Module({
  providers: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
  ],
  exports: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
    ResourceQueueService,
    ParentStateService,
  ],
})
export class SharedModule {}
