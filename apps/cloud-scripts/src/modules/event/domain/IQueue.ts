export interface IQueue {
  enqueue(eventId: number): Promise<void>;
  close(): Promise<void>;
}
