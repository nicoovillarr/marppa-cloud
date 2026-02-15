import { Expose, Type } from 'class-transformer';
import { EventModel } from './event.model';
import { EventPropertyModel } from './event-property.model';
import { EventResourceModel } from './event-resource.model';

export class EventWithRelationsModel extends EventModel {
  @Expose()
  @Type(() => EventResourceModel)
  resources: EventResourceModel[];

  @Expose()
  @Type(() => EventPropertyModel)
  properties: EventPropertyModel[];
}
