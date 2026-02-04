import { EventProperty } from "@prisma/client";
import { EventPropertyEntity } from "../../domain/entities/event-property.entity";

export class EventPropertyPrismaMapper {
  static toEntity(raw: EventProperty): EventPropertyEntity {
    return new EventPropertyEntity(
      raw.eventId,
      raw.key ?? undefined,
      raw.value ?? undefined,
      {
        id: raw.id ?? undefined,
      }
    );
  }
}