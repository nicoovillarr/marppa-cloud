export abstract class IQueue {
  abstract enqueue(eventId: number): Promise<void>;
  abstract close(): Promise<void>;
}
