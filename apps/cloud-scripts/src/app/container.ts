import 'reflect-metadata';
import 'dotenv/config';
import {
  type AwilixContainer,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime,
} from 'awilix';
import { AppModule } from './AppModule';
import { ProcessorRegistry } from '@/event/application/ProcessorRegistry';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import {
  getModuleMeta,
  type Lifecycle,
  type ModuleConstructor,
  type ProviderDefinition,
  type ProviderToken,
} from '@/decorators/Module';
import { getEventType } from '@/decorators/EventProcessor';
import { getInjectMetadata } from '@/decorators/Inject';

type Constructor = abstract new (...args: any[]) => any;
type NormalizedProvider = Exclude<ProviderDefinition, Constructor>;

export interface AppBootstrap {
  container: AwilixContainer;
  modules: object[];
}

interface CollectedGraph {
  providers:     NormalizedProvider[];
  processors:    Constructor[];
  processorKeys: Map<Constructor, string>;
  modules:       ModuleConstructor[];
  moduleKeys:    Map<ModuleConstructor, string>;
}

export class AppContainer {
  private static _keyCount = 0;
  private static readonly _symKeys = new Map<symbol, string>();
  private static readonly _clsKeys = new Map<Function, string>();
  private static readonly REGISTRY_KEY = AppContainer._classKey(ProcessorRegistry);

  private static _symbolKey(sym: symbol): string {
    let k = AppContainer._symKeys.get(sym);
    if (!k) { k = `__sym_${AppContainer._keyCount++}`; AppContainer._symKeys.set(sym, k); }
    return k;
  }

  private static _classKey(cls: Function): string {
    let k = AppContainer._clsKeys.get(cls);
    if (!k) { k = `__cls_${AppContainer._keyCount++}`; AppContainer._clsKeys.set(cls, k); }
    return k;
  }

  static tokenKey(token: ProviderToken): string {
    if (typeof token === 'string') return token;
    if (typeof token === 'symbol') return AppContainer._symbolKey(token);
    return AppContainer._classKey(token as Function);
  }

  private static _freshKey(): string {
    return `__internal_${AppContainer._keyCount++}`;
  }

  private static _awilixLifetime(lifecycle?: Lifecycle): typeof Lifetime[keyof typeof Lifetime] {
    switch (lifecycle) {
      case 'transient': return Lifetime.TRANSIENT;
      case 'scoped':    return Lifetime.SCOPED;
      default:          return Lifetime.SINGLETON;
    }
  }

  private static _resolveParamTokens(cls: Constructor): ProviderToken[] {
    const meta = getInjectMetadata(cls);
    const paramTypes: (Function | undefined)[] = Reflect.getMetadata('design:paramtypes', cls) ?? [];
    const count = Math.max(
      paramTypes.length,
      meta.size ? Math.max(...meta.keys()) + 1 : 0,
    );

    if (count === 0) return [];

    return Array.from({ length: count }, (_, i) => {
      if (meta.has(i)) return meta.get(i)!;
      const type = paramTypes[i];
      if (!type || type === Object) {
        throw new Error(
          `${cls.name}: param ${i} type erased at runtime (interface or missing emitDecoratorMetadata) — add @Inject(token)`,
        );
      }
      return type as ProviderToken;
    });
  }

  private static _makeClassResolver(cls: Constructor, lifecycle?: Lifecycle) {
    const tokens = AppContainer._resolveParamTokens(cls);
    const Cls = cls as new (...args: any[]) => any;

    if (tokens.length === 0) {
      return asFunction(() => new Cls()).setLifetime(AppContainer._awilixLifetime(lifecycle));
    }

    return asFunction((cradle: Record<string, unknown>) => {
      const args = tokens.map((t) => cradle[AppContainer.tokenKey(t)]);
      return new Cls(...args);
    }).setLifetime(AppContainer._awilixLifetime(lifecycle));
  }

  private static _makeRegistration(def: NormalizedProvider) {
    if ('useValue'   in def) return asValue(def.useValue);
    if ('useFactory' in def) return asFunction(def.useFactory).setLifetime(AppContainer._awilixLifetime(def.lifecycle));
    if ('useClass'   in def) return AppContainer._makeClassResolver(def.useClass, def.lifecycle);
    return AppContainer._makeClassResolver(def.provide as Constructor, (def as any).lifecycle);
  }

  private static _buildGraph(root: ModuleConstructor): CollectedGraph {
    const graph: CollectedGraph = {
      providers:     [],
      processors:    [],
      processorKeys: new Map(),
      modules:       [],
      moduleKeys:    new Map(),
    };
    const visited = new Set<ModuleConstructor>();

    const visit = (mod: ModuleConstructor, stack: ModuleConstructor[]): void => {
      if (stack.includes(mod)) {
        throw new Error(`Circular module dependency: ${[...stack, mod].map((m) => m.name).join(' → ')}`);
      }
      if (visited.has(mod)) return;
      visited.add(mod);

      const { imports, providers, processors } = getModuleMeta(mod);
      for (const imp of imports) visit(imp, [...stack, mod]);

      graph.providers.push(...providers.map((def): NormalizedProvider =>
        typeof def === 'function' ? { provide: def } : def,
      ));
      for (const cls of processors) {
        graph.processors.push(cls);
        graph.processorKeys.set(cls, AppContainer._freshKey());
      }
      if (mod !== root) {
        graph.modules.push(mod);
        graph.moduleKeys.set(mod, AppContainer._freshKey());
      }
    };

    visit(root, []);
    return graph;
  }

  private static _validateGraph(graph: CollectedGraph): void {
    const seenTokens = new Set<string>();
    for (const def of graph.providers) {
      const key = AppContainer.tokenKey(def.provide);
      if (seenTokens.has(key)) throw new Error(`Duplicate provider token: "${key}"`);
      seenTokens.add(key);
    }

    const seenEvents = new Set<string>();
    for (const cls of graph.processors) {
      const type = getEventType(cls);
      if (seenEvents.has(type)) throw new Error(`Duplicate processor for event type: "${type}"`);
      seenEvents.add(type);
    }

    const known = new Set<string>([AppContainer.REGISTRY_KEY]);
    for (const def of graph.providers) known.add(AppContainer.tokenKey(def.provide));

    const checkClass = (cls: Constructor, label: string): void => {
      let tokens: ProviderToken[];
      try { tokens = AppContainer._resolveParamTokens(cls); } catch (e: any) {
        throw new Error(`${label}: ${e.message}`);
      }
      for (let i = 0; i < tokens.length; i++) {
        const key = AppContainer.tokenKey(tokens[i]);
        if (!known.has(key)) throw new Error(`${label}: param ${i} refers to unknown token "${key}"`);
      }
    };

    for (const def of graph.providers) {
      if ('useClass' in def) {
        checkClass(def.useClass, `Provider "${AppContainer.tokenKey(def.provide)}" (${def.useClass.name})`);
      } else if (!('useFactory' in def) && !('useValue' in def)) {
        checkClass(def.provide as Constructor, `Provider (${(def.provide as Constructor).name})`);
      }
    }
    for (const cls of graph.processors) checkClass(cls, `Processor ${cls.name}`);
    for (const mod of graph.modules)    checkClass(mod, `Module ${mod.name}`);

    const edges = new Map<string, string[]>();
    for (const def of graph.providers) {
      const from = AppContainer.tokenKey(def.provide);
      if ('useClass' in def) {
        try { edges.set(from, AppContainer._resolveParamTokens(def.useClass).map((t) => AppContainer.tokenKey(t))); } catch { edges.set(from, []); }
      } else {
        edges.set(from, []);
      }
    }

    const done = new Set<string>(), active = new Set<string>();
    const detectCycle = (node: string): void => {
      if (done.has(node)) return;
      if (active.has(node)) throw new Error(`Circular provider dependency: ${[...active, node].join(' → ')}`);
      active.add(node);
      for (const dep of edges.get(node) ?? []) detectCycle(dep);
      active.delete(node);
      done.add(node);
    };
    for (const key of edges.keys()) detectCycle(key);
  }

  static build(): AppBootstrap {
    const root = createContainer({ injectionMode: InjectionMode.PROXY });

    const graph = AppContainer._buildGraph(AppModule);
    AppContainer._validateGraph(graph);

    for (const def of graph.providers) {
      root.register({ [AppContainer.tokenKey(def.provide)]: AppContainer._makeRegistration(def) });
    }

    const registry = new ProcessorRegistry();
    for (const cls of graph.processors) {
      const key = graph.processorKeys.get(cls)!;
      root.register({ [key]: AppContainer._makeClassResolver(cls) });
      registry.register(getEventType(cls), root.resolve<IEventProcessor>(key));
    }
    root.register({ [AppContainer.REGISTRY_KEY]: asValue(registry) });

    for (const mod of graph.modules) {
      root.register({ [graph.moduleKeys.get(mod)!]: AppContainer._makeClassResolver(mod) });
    }
    const modules = graph.modules.map((mod) => root.resolve<object>(graph.moduleKeys.get(mod)!));

    return { container: root, modules };
  }
}
