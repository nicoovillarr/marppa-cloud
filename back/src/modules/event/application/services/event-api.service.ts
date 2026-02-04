import { EventModel } from "../models/event.model";
import { EventWithRelationsModel } from "../models/event-with-relations.model";
import { EventService } from "@/event/domain/services/event.service";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

@Injectable()
export class EventApiService {
  constructor(
    private readonly eventService: EventService,
  ) { }

  public async findMany(): Promise<EventModel[]> {
    const events = await this.eventService.findMany();
    return plainToInstance(EventModel, events, { excludeExtraneousValues: true });
  }

  public async findEventById(id: number): Promise<EventWithRelationsModel> {
    const eventAggregation = await this.eventService.findById(id);

    if (!eventAggregation) {
      throw new NotFoundError();
    }

    return plainToInstance(EventWithRelationsModel, eventAggregation, { excludeExtraneousValues: true });
  }
}