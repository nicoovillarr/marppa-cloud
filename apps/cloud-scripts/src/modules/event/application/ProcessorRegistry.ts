import type { IEventProcessor } from '../domain/IEventProcessor';

export class ProcessorRegistry {
  private readonly processors = new Map<string, IEventProcessor>();

  register(processor: IEventProcessor): void {
    if (this.processors.has(processor.eventType)) {
      throw new Error(
        `ProcessorRegistry: duplicate registration for event type "${processor.eventType}"`,
      );
    }
    this.processors.set(processor.eventType, processor);
  }

  resolve(eventType: string): IEventProcessor | null {
    return this.processors.get(eventType) ?? null;
  }

  registeredTypes(): string[] {
    return [...this.processors.keys()];
  }
}
