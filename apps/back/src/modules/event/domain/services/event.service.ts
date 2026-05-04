import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_REPOSITORY_SYMBOL,
  EventRepository,
} from '../repositories/event.repository';
import { EventPropertyEntity } from '../entities/event-property.entity';
import { EventResourceEntity } from '../entities/event-resource.entity';
import { EventEntity } from '../entities/event.entity';
import { EventWithRelationsModel } from '../models/event-with-relations.model';
import { CreateEventDto } from '@/event/presentation/dtos/create-event.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

@Injectable()
export class EventService {
  constructor(
    @Inject(EVENT_REPOSITORY_SYMBOL)
    private readonly eventRepository: EventRepository,
  ) {}

  async create(data: CreateEventDto): Promise<EventEntity> {
    let { createdBy, companyId } = data;

    if (createdBy == null || companyId == null) {
      const user = getCurrentUser();
      if (user == null) {
        throw new UnauthorizedError();
      }

      createdBy ??= user.userId;
      companyId ??= user.companyId;
    }

    const event = new EventEntity(data.type, createdBy, companyId, {
      notes: data.notes,
      data: data.data,
    });

    return this.eventRepository.create(event);
  }

  async addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string,
  ): Promise<EventResourceEntity> {
    const eventResource = new EventResourceEntity(
      eventId,
      resourceType,
      resourceId,
    );
    return this.eventRepository.addEventResource(eventId, eventResource);
  }

  async addEventProperty(
    eventId: number,
    key: string,
    value: string,
  ): Promise<EventPropertyEntity> {
    const eventProperty = new EventPropertyEntity(eventId, key, value);
    return this.eventRepository.addEventProperty(eventId, eventProperty);
  }

  async findById(id: number): Promise<EventWithRelationsModel | null> {
    return this.eventRepository.findById(id);
  }

  async findMany(): Promise<EventEntity[]> {
    return this.eventRepository.findMany();
  }
}
