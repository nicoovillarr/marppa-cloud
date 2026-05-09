import { Module } from '@/decorators/Module';
import { PrismaEventRepository } from './infrastructure/PrismaEventRepository';
import { BullMQEventQueue } from './infrastructure/BullMQEventQueue';
import { EventWorker } from './application/EventWorker';
import { IEventRepository } from './domain/IEventRepository';
import { IQueue } from './domain/IQueue';

@Module({
  providers: [
    { provide: IEventRepository, useClass: PrismaEventRepository },
    { provide: IQueue, useClass: BullMQEventQueue },
    { provide: EventWorker },
  ],
})
export class EventModule {
  constructor(
    private readonly worker: EventWorker,
    private readonly queue: IQueue,
  ) {}

  async stop(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
