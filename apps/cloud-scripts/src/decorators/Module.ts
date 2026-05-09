import type { IEventProcessor } from '@/event/domain/IEventProcessor';

export type ProcessorConstructor = new (...args: any[]) => IEventProcessor;

export type AnyConstructor = abstract new (...args: any[]) => any;

export type Lifecycle = 'singleton' | 'transient' | 'scoped';

export type ProviderToken = string | symbol | AnyConstructor;

export type ProviderDefinition =
  | { provide: ProviderToken; useClass: AnyConstructor; lifecycle?: Lifecycle }
  | { provide: ProviderToken; useFactory: (...args: any[]) => unknown; lifecycle?: Lifecycle }
  | { provide: ProviderToken; useValue: unknown }
  | { provide: AnyConstructor; lifecycle?: Lifecycle };

interface ModuleMetadata {
  imports?:    ModuleConstructor[];
  processors?: ProcessorConstructor[];
  providers?:  ProviderDefinition[];
}

export type ModuleConstructor = new (...args: any[]) => object;

const registry = new WeakMap<ModuleConstructor, ModuleMetadata>();

export interface ModuleData {
  imports:    ModuleConstructor[];
  processors: ProcessorConstructor[];
  providers:  ProviderDefinition[];
}

export function getModuleMeta(mod: ModuleConstructor): ModuleData {
  const meta = registry.get(mod) ?? {};
  return {
    imports:    meta.imports    ?? [],
    processors: meta.processors ?? [],
    providers:  meta.providers  ?? [],
  };
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function): void => {
    registry.set(target as ModuleConstructor, metadata);
  };
}
