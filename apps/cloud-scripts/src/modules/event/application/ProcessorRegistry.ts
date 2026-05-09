import type { IEventProcessor } from '../domain/IEventProcessor';

export class ProcessorRegistry {
  private readonly processors = new Map<string, IEventProcessor>();

  register(eventType: string, processor: IEventProcessor): void {
    if (this.processors.has(eventType)) {
      throw new Error(`ProcessorRegistry: duplicate registration for event type "${eventType}"`);
    }
    this.processors.set(eventType, processor);
  }

  resolve(eventType: string): IEventProcessor | null {
    return this.processors.get(eventType) ?? null;
  }

  registeredTypes(): string[] {
    return [...this.processors.keys()];
  }
}
