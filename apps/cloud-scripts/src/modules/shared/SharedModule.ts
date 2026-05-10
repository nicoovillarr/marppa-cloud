import { Module } from '@/decorators/Module';
import { PrismaService } from './infrastructure/services/PrismaService';
import { LoggerService } from './infrastructure/services/LoggerService';
import { RedisService } from './infrastructure/services/RedisService';
import { WebSocketServer } from './infrastructure/http/WebSocketServer';

@Module({
  providers: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
  ],
  exports: [
    PrismaService,
    LoggerService,
    RedisService,
    WebSocketServer,
  ],
})
export class SharedModule {}
