import type { Event, EventResource, EventProperty } from '@marppa-cloud/db';

export type EventPayload = Event & {
  resources: EventResource[];
  properties: EventProperty[];
};