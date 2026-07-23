import { IEventProcessor } from './EventWorker';

export class ProcessorRegistry {
  private readonly processors = new Map<string, IEventProcessor>();

  public register(eventType: string, processor: IEventProcessor): void {
    if (this.processors.has(eventType)) {
      throw new Error(
        `ProcessorRegistry: duplicate registration for event type "${eventType}"`,
      );
    }
    this.processors.set(eventType, processor);
  }

  public resolve(eventType: string): IEventProcessor | null {
    return this.processors.get(eventType) ?? null;
  }

  public registeredTypes(): string[] {
    return [...this.processors.keys()];
  }
}
