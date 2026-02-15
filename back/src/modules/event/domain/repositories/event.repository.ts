import { EventWithRelationsModel } from '../models/event-with-relations.model';
import { EventPropertyEntity } from '../entities/event-property.entity';
import { EventResourceEntity } from '../entities/event-resource.entity';
import { EventEntity } from '../entities/event.entity';

export const EVENT_REPOSITORY_SYMBOL = Symbol('EVENT_REPOSITORY');

export abstract class EventRepository {
  abstract create(event: EventEntity): Promise<EventEntity>;
  abstract addEventResource(
    eventId: number,
    eventResource: EventResourceEntity,
  ): Promise<EventResourceEntity>;
  abstract addEventProperty(
    eventId: number,
    eventProperty: EventPropertyEntity,
  ): Promise<EventPropertyEntity>;
  abstract findById(id: number): Promise<EventWithRelationsModel | null>;
  abstract findMany(): Promise<EventEntity[]>;
}
