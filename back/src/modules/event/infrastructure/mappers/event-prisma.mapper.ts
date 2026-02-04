import { Event } from "@prisma/client";
import { EventEntity } from "../../domain/entities/event.entity";

export class EventPrismaMapper {
  static toEntity(raw: Event): EventEntity {
    return new EventEntity(raw.type, raw.createdBy, raw.companyId, {
      id: raw.id,
      notes: raw.notes ?? undefined,
      data: raw.data as Record<string, unknown> | unknown[] | null ?? undefined,
      retries: raw.retries ?? undefined,
      processedAt: raw.processedAt ?? undefined,
      failedAt: raw.failedAt ?? undefined,
    });
  }
}