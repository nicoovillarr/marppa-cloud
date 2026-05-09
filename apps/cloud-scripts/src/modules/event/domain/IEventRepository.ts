import type { EventPayload } from './EventPayload';

export abstract class IEventRepository {
  abstract findById(id: number): Promise<EventPayload | null>;
  abstract markProcessed(id: number): Promise<void>;
  abstract markFailed(id: number): Promise<void>;
  abstract incrementRetry(id: number): Promise<void>;
  abstract createEvent(
    type: string,
    createdBy: string,
    companyId: string,
    data?: unknown,
    notes?: string | null,
  ): Promise<{ id: number }>;
  abstract addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string,
  ): Promise<void>;
}
