import { EventApiService } from '@/event/application/services/event-api.service';
import { EventModel } from '@/event/application/models/event.model';
import { EventWithRelationsModel } from '@/event/application/models/event-with-relations.model';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('events')
export class EventController {
  constructor(private readonly eventApiService: EventApiService) {}

  @Get()
  async findMany(): Promise<EventModel[]> {
    return this.eventApiService.findMany();
  }

  @Get(':id')
  async findEventById(
    @Param('id') id: string,
  ): Promise<EventWithRelationsModel> {
    return this.eventApiService.findEventById(Number(id));
  }
}
