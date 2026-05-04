import type { EventPayload } from './EventPayload';

export interface IEventProcessor {
  readonly eventType: string;
  handle(event: EventPayload): Promise<void>;
}
