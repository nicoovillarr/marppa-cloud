import { EventType } from "@marppa-cloud/db";

export class AbortError extends Error {
  constructor(
    public readonly message: string,
    public readonly failureEventType?: EventType,
  ) {
    super(message);
    this.name = 'AbortError';
  }
}
