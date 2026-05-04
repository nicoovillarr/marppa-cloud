import type { IEventProcessor } from '../modules/event/domain/IEventProcessor';

type ProcessorConstructor = new (...args: any[]) => IEventProcessor;

export function EventProcessor<T extends ProcessorConstructor>(
  target: T,
  _context: ClassDecoratorContext<T>,
): T {
  return target;
}
