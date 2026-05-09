import { Module } from '@/decorators/Module';
import { PrismaEventRepository } from './infrastructure/repositories/PrismaEventRepository';
import { BullMQEventQueueRepository } from './infrastructure/repositories/BullMQEventQueueRepository';
import { EventWorker } from './application/EventWorker';
import { EVENT_REPOSITORY_TOKEN } from './domain/repositories/EventRepository';
import { EVENT_QUEUE_REPOSITORY_TOKEN } from './domain/repositories/EventQueueRepository';

@Module({
  providers: [
    EventWorker,

    {
      provide: EVENT_REPOSITORY_TOKEN,
      useClass: PrismaEventRepository,
    },

    {
      provide: EVENT_QUEUE_REPOSITORY_TOKEN,
      useClass: BullMQEventQueueRepository,
    },
  ],
})
export class EventModule {}
