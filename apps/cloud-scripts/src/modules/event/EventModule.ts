import { Module } from '@/decorators/Module';
import { SharedModule } from '@/shared/SharedModule';
import { PrismaEventRepository } from './infrastructure/repositories/PrismaEventRepository';
import { BullMQEventQueueRepository } from './infrastructure/repositories/BullMQEventQueueRepository';
import { EventWorker } from './application/EventWorker';
import { EVENT_REPOSITORY_TOKEN } from './domain/repositories/EventRepository';
import { EVENT_QUEUE_REPOSITORY_TOKEN } from './domain/repositories/EventQueueRepository';

@Module({
  imports: [SharedModule],
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
  exports: [
    EVENT_REPOSITORY_TOKEN,
    EVENT_QUEUE_REPOSITORY_TOKEN,
  ],
})
export class EventModule {}
