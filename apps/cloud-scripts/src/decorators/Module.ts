import { IEventProcessor } from '@/event/application/EventWorker';

export type ProcessorConstructor = new (...args: any[]) => IEventProcessor;

export type AnyConstructor = abstract new (...args: any[]) => any;

export type Lifecycle = 'singleton' | 'transient' | 'scoped';

export type ProviderToken = string | symbol | AnyConstructor;

export type ProviderDefinition =
  | AnyConstructor
  | { provide: ProviderToken; useClass: AnyConstructor; lifecycle?: Lifecycle }
  | { provide: ProviderToken; useFactory: (...args: any[]) => unknown; lifecycle?: Lifecycle }
  | { provide: ProviderToken; useValue: unknown }
  | { provide: AnyConstructor; lifecycle?: Lifecycle };

export interface ForwardRef {
  forwardRef: () => ModuleConstructor;
}

export function forwardRef(fn: () => ModuleConstructor): ForwardRef {
  return { forwardRef: fn };
}

export function isForwardRef(val: unknown): val is ForwardRef {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as any).forwardRef === 'function'
  );
}

interface ModuleMetadata {
  imports?:    (ModuleConstructor | ForwardRef)[];
  processors?: ProcessorConstructor[];
  providers?:  ProviderDefinition[];
  exports?:    ProviderToken[];
}

export type ModuleConstructor = new (...args: any[]) => object;

const registry = new WeakMap<ModuleConstructor, ModuleMetadata>();

export interface ModuleData {
  imports:    (ModuleConstructor | ForwardRef)[];
  processors: ProcessorConstructor[];
  providers:  ProviderDefinition[];
  exports:    ProviderToken[];
}

export function getModuleMeta(mod: ModuleConstructor): ModuleData {
  const meta = registry.get(mod) ?? {};
  return {
    imports:    meta.imports    ?? [],
    processors: meta.processors ?? [],
    providers:  meta.providers  ?? [],
    exports:    meta.exports    ?? [],
  };
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function): void => {
    registry.set(target as ModuleConstructor, metadata);
  };
}
