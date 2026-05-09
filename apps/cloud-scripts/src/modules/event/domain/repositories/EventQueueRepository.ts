export const EVENT_QUEUE_REPOSITORY_TOKEN = Symbol('EVENT_QUEUE_REPOSITORY');

export abstract class EventQueueRepository {
  abstract enqueue(eventId: number): Promise<void>;
}
