import type { IEventProcessor } from '@/event/domain/IEventProcessor';

export type ProcessorConstructor = new (...args: any[]) => IEventProcessor;

interface ModuleMetadata {
  imports?: ModuleConstructor[];
  processors?: ProcessorConstructor[];
}

type ModuleConstructor = new () => object;

const registry = new WeakMap<ModuleConstructor, ModuleMetadata>();

export function Module(metadata: ModuleMetadata) {
  return function <T extends ModuleConstructor>(target: T, _ctx: ClassDecoratorContext<T>): T {
    registry.set(target, metadata);
    return target;
  };
}

export function getModuleProcessors(root: ModuleConstructor): ProcessorConstructor[] {
  const meta = registry.get(root) ?? {};
  const own = meta.processors ?? [];
  const imported = (meta.imports ?? []).flatMap(getModuleProcessors);
  return [...own, ...imported];
}
