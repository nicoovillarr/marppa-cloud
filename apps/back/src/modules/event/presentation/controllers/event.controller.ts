import { EventApiService } from '@/event/application/services/event-api.service';
import { EventModel } from '@/event/application/models/event.model';
import { EventWithRelationsModel } from '@/event/application/models/event-with-relations.model';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';

@Controller('events')
@UseGuards(LoggedInGuard)
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
