import type { EventPayload } from './EventPayload';

export interface IEventRepository {
  findById(id: number): Promise<EventPayload | null>;
  markProcessed(id: number): Promise<void>;
  markFailed(id: number): Promise<void>;
  incrementRetry(id: number): Promise<void>;
  createEvent(
    type: string,
    createdBy: string,
    companyId: string,
    data?: unknown,
    notes?: string | null,
  ): Promise<{ id: number }>;
  addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string,
  ): Promise<void>;
}
