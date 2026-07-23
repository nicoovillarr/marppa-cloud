const processorMeta = new WeakMap<Function, string>();

export function EventProcessor(eventType: string): ClassDecorator {
  return (target: Function): void => {
    processorMeta.set(target, eventType);
  };
}

export function getEventType(target: Function): string {
  const type = processorMeta.get(target);
  if (!type) throw new Error(`${(target as any).name} is missing @EventProcessor decorator`);
  return type;
}
