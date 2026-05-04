import { EventType } from '@marppa-cloud/db';
import type { Event, EventResource, EventProperty } from '@marppa-cloud/db';

export type EventPayload = Event & {
  resources: EventResource[];
  properties: EventProperty[];
};

export class AbortError extends Error {
  constructor(
    public readonly message: string,
    public readonly failureEventType?: EventType,
  ) {
    super(message);
    this.name = 'AbortError';
  }
}
