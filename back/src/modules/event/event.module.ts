import { Module } from "@nestjs/common";
import { EventService } from "./domain/services/event.service";
import { EVENT_REPOSITORY_SYMBOL } from "./domain/repositories/event.repository";
import { EventPrismaRepository } from "./infrastructure/repositories/event-prisma.repository";
import { EventApiService } from "./application/services/event-api.service";
import { EventController } from "./presentation/controllers/event.controller";

@Module({
  controllers: [EventController],
  providers: [
    EventService,
    EventApiService,

    {
      provide: EVENT_REPOSITORY_SYMBOL,
      useClass: EventPrismaRepository
    },
  ],
  exports: [EventService]
})
export class EventModule { }