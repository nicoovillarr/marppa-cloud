import { EventResource } from '@prisma/client';
import { EventResourceEntity } from '../../domain/entities/event-resource.entity';

export class EventResourcePrismaMapper {
  static toEntity(raw: EventResource): EventResourceEntity {
    return new EventResourceEntity(
      raw.eventId,
      raw.resourceType,
      raw.resourceId,
      {
        id: raw.id ?? undefined,
      },
    );
  }
}
