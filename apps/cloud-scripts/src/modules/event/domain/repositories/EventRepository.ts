import { EventPayload } from "../models/EventPayload";

export const EVENT_REPOSITORY_TOKEN = Symbol('EVENT_REPOSITORY');

export abstract class EventRepository {
  abstract findById(id: number): Promise<EventPayload | null>;

  abstract markProcessed(id: number): Promise<void>;
  
  abstract markFailed(id: number): Promise<void>;
  
  abstract incrementRetry(id: number): Promise<void>;
  
  abstract createEvent(
    type: string,
    createdBy: string,
    companyId: string,
    data?: Record<string, any>,
    notes?: string | null,
  ): Promise<number>;
  
  abstract addEventResource(
    eventId: number,
    resourceType: string,
    resourceId: string,
  ): Promise<void>;
}