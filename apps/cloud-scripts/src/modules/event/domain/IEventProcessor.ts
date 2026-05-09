import type { EventPayload } from './EventPayload';

export interface IEventProcessor {
  handle(event: EventPayload): Promise<void>;
}
