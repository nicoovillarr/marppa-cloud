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
import { AppModule } from '../AppModule';
import { ProcessorRegistry } from '@/event/application/ProcessorRegistry';
import {
  getModuleMeta,
  isForwardRef,
  type Lifecycle,
  type ModuleConstructor,
  type ProviderDefinition,
  type ProviderToken,
} from '@/decorators/Module';
import { getEventType } from '@/decorators/EventProcessor';
import { getInjectMetadata } from '@/decorators/Inject';
import { IEventProcessor } from '@/event/application/EventWorker';

type Constructor = abstract new (...args: any[]) => any;
type NormalizedProvider = Exclude<ProviderDefinition, Constructor>;

export interface AppBootstrap {
  container: AwilixContainer;
  modules: object[];
  lifecycleProviders: object[];
}

interface ModuleScope {
  visible: Set<string>;
  exports: Set<string>;
}

interface CollectedGraph {
  providers: NormalizedProvider[];
  processors: Constructor[];
  processorKeys: Map<Constructor, string>;
  modules: ModuleConstructor[];
  moduleKeys: Map<ModuleConstructor, string>;
  scopes: Map<ModuleConstructor, ModuleScope>;
  processorOwner: Map<Constructor, ModuleConstructor>;
  providerOwner: Map<string, ModuleConstructor>;
}

export interface OnModuleInit {
  onModuleInit(): Promise<void> | void;
}

export interface OnModuleDestroy {
  onModuleDestroy(): Promise<void> | void;
}

export function isOnModuleInit(obj: unknown): obj is OnModuleInit {
  return typeof (obj as any)?.onModuleInit === 'function';
}

export function isOnModuleDestroy(obj: unknown): obj is OnModuleDestroy {
  return typeof (obj as any)?.onModuleDestroy === 'function';
}

export class AppContainer {
  private static _keyCount = 0;
  private static readonly _symKeys = new Map<symbol, string>();
  private static readonly _clsKeys = new Map<Function, string>();
  private static readonly REGISTRY_KEY =
    AppContainer._classKey(ProcessorRegistry);

  private static readonly _PRIMITIVES = new Set<Function>([
    Number, String, Boolean, BigInt, Symbol,
  ]);

  private static _isPrimitive(token: ProviderToken): boolean {
    return typeof token === 'function' && AppContainer._PRIMITIVES.has(token as Function);
  }

  private static _symbolKey(sym: symbol): string {
    let k = AppContainer._symKeys.get(sym);
    if (!k) {
      k = `__sym_${AppContainer._keyCount++}`;
      AppContainer._symKeys.set(sym, k);
    }
    return k;
  }

  private static _classKey(cls: Function): string {
    let k = AppContainer._clsKeys.get(cls);
    if (!k) {
      k = `__cls_${AppContainer._keyCount++}`;
      AppContainer._clsKeys.set(cls, k);
    }
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

  private static _awilixLifetime(
    lifecycle?: Lifecycle,
  ): (typeof Lifetime)[keyof typeof Lifetime] {
    switch (lifecycle) {
      case 'transient':
        return Lifetime.TRANSIENT;
      case 'scoped':
        return Lifetime.SCOPED;
      default:
        return Lifetime.SINGLETON;
    }
  }

  private static _resolveParamTokens(cls: Constructor): ProviderToken[] {
    const meta = getInjectMetadata(cls);
    const paramTypes: (Function | undefined)[] =
      Reflect.getMetadata('design:paramtypes', cls) ?? [];
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
      return asFunction(() => new Cls()).setLifetime(
        AppContainer._awilixLifetime(lifecycle),
      );
    }

    return asFunction((cradle: Record<string, unknown>) => {
      const args = tokens.map((t) =>
        AppContainer._isPrimitive(t) ? undefined : cradle[AppContainer.tokenKey(t)],
      );
      return new Cls(...args);
    }).setLifetime(AppContainer._awilixLifetime(lifecycle));
  }

  private static _makeRegistration(def: NormalizedProvider) {
    if ('useValue' in def) return asValue(def.useValue);
    if ('useFactory' in def)
      return asFunction(def.useFactory).setLifetime(
        AppContainer._awilixLifetime(def.lifecycle),
      );
    if ('useClass' in def)
      return AppContainer._makeClassResolver(def.useClass, def.lifecycle);
    return AppContainer._makeClassResolver(
      def.provide as Constructor,
      (def as any).lifecycle,
    );
  }

  private static _buildGraph(root: ModuleConstructor): CollectedGraph {
    const graph: CollectedGraph = {
      providers: [],
      processors: [],
      processorKeys: new Map(),
      modules: [],
      moduleKeys: new Map(),
      scopes: new Map(),
      processorOwner: new Map(),
      providerOwner: new Map(),
    };
    const visited = new Set<ModuleConstructor>();
    const deferredScopes: Array<{ mod: ModuleConstructor; forwardImports: ModuleConstructor[] }> = [];

    const visit = (
      mod: ModuleConstructor,
      stack: ModuleConstructor[],
    ): void => {
      if (stack.includes(mod)) {
        throw new Error(
          `Circular module dependency: ${[...stack, mod].map((m) => m.name).join(' → ')}`,
        );
      }
      if (visited.has(mod)) return;
      visited.add(mod);

      const { imports: rawImports, providers, processors, exports: exportTokens } = getModuleMeta(mod);

      const deferred: ModuleConstructor[] = [];
      for (const rawImp of rawImports) {
        const imp: ModuleConstructor = isForwardRef(rawImp) ? rawImp.forwardRef() : rawImp as ModuleConstructor;
        if (isForwardRef(rawImp) && stack.includes(imp)) {
          deferred.push(imp);
          continue;
        }
        visit(imp, [...stack, mod]);
      }

      const normalizedProviders = providers.map(
        (def): NormalizedProvider =>
          typeof def === 'function' ? { provide: def } : def,
      );

      const visible = new Set<string>();
      for (const def of normalizedProviders) {
        visible.add(AppContainer.tokenKey(def.provide));
      }
      for (const rawImp of rawImports) {
        const imp: ModuleConstructor = isForwardRef(rawImp) ? rawImp.forwardRef() : rawImp as ModuleConstructor;
        const impScope = graph.scopes.get(imp);
        if (impScope) {
          for (const key of impScope.exports) visible.add(key);
        }
      }

      const exportSet = new Set<string>(
        exportTokens.map((t) => AppContainer.tokenKey(t)),
      );

      graph.scopes.set(mod, { visible, exports: exportSet });

      graph.providers.push(...normalizedProviders);
      for (const def of normalizedProviders) {
        graph.providerOwner.set(AppContainer.tokenKey(def.provide), mod);
      }

      for (const cls of processors) {
        graph.processors.push(cls);
        graph.processorKeys.set(cls, AppContainer._freshKey());
        graph.processorOwner.set(cls, mod);
      }

      if (mod !== root) {
        graph.modules.push(mod);
        graph.moduleKeys.set(mod, AppContainer._freshKey());
      }

      if (deferred.length > 0) {
        deferredScopes.push({ mod, forwardImports: deferred });
      }
    };

    visit(root, []);

    for (const { mod, forwardImports } of deferredScopes) {
      const scope = graph.scopes.get(mod)!;
      for (const imp of forwardImports) {
        const impScope = graph.scopes.get(imp);
        if (impScope) {
          for (const key of impScope.exports) scope.visible.add(key);
        }
      }
    }

    return graph;
  }

  private static _validateGraph(graph: CollectedGraph): void {
    const seenTokens = new Set<string>();
    for (const def of graph.providers) {
      const key = AppContainer.tokenKey(def.provide);
      if (seenTokens.has(key))
        throw new Error(`Duplicate provider token: "${key}"`);
      seenTokens.add(key);
    }

    const seenEvents = new Set<string>();
    for (const cls of graph.processors) {
      const type = getEventType(cls);
      if (seenEvents.has(type))
        throw new Error(`Duplicate processor for event type: "${type}"`);
      seenEvents.add(type);
    }

    const globalKnown = new Set<string>([AppContainer.REGISTRY_KEY]);
    for (const def of graph.providers)
      globalKnown.add(AppContainer.tokenKey(def.provide));

    const getVisible = (mod: ModuleConstructor | undefined): Set<string> => {
      if (!mod) return globalKnown;
      const scope = graph.scopes.get(mod);
      if (!scope) return globalKnown;
      return new Set([...scope.visible, AppContainer.REGISTRY_KEY]);
    };

    const checkClass = (cls: Constructor, label: string, visible: Set<string>): void => {
      let tokens: ProviderToken[];
      try {
        tokens = AppContainer._resolveParamTokens(cls);
      } catch (e: any) {
        throw new Error(`${label}: ${e.message}`);
      }
      for (let i = 0; i < tokens.length; i++) {
        if (AppContainer._isPrimitive(tokens[i])) continue;
        const key = AppContainer.tokenKey(tokens[i]);
        if (!visible.has(key))
          throw new Error(
            `${label}: param ${i} refers to token "${key}" not visible in module scope — add it to the module's imports/exports`,
          );
      }
    };

    for (const def of graph.providers) {
      const ownerMod = graph.providerOwner.get(AppContainer.tokenKey(def.provide));
      const visible = getVisible(ownerMod);
      if ('useClass' in def) {
        checkClass(
          def.useClass,
          `Provider "${AppContainer.tokenKey(def.provide)}" (${def.useClass.name})`,
          visible,
        );
      } else if (!('useFactory' in def) && !('useValue' in def)) {
        checkClass(
          def.provide as Constructor,
          `Provider (${(def.provide as Constructor).name})`,
          visible,
        );
      }
    }

    for (const cls of graph.processors) {
      const ownerMod = graph.processorOwner.get(cls);
      const visible = getVisible(ownerMod);
      checkClass(cls, `Processor ${cls.name}`, visible);
    }

    for (const mod of graph.modules) {
      const visible = getVisible(mod);
      checkClass(mod, `Module ${mod.name}`, visible);
    }

    const edges = new Map<string, string[]>();
    for (const def of graph.providers) {
      const from = AppContainer.tokenKey(def.provide);
      if ('useClass' in def) {
        try {
          edges.set(
            from,
            AppContainer._resolveParamTokens(def.useClass)
              .filter((t) => !AppContainer._isPrimitive(t))
              .map((t) => AppContainer.tokenKey(t)),
          );
        } catch {
          edges.set(from, []);
        }
      } else {
        edges.set(from, []);
      }
    }

    const done = new Set<string>(),
      active = new Set<string>();
    const detectCycle = (node: string): void => {
      if (done.has(node)) return;
      if (active.has(node))
        throw new Error(
          `Circular provider dependency: ${[...active, node].join(' → ')}`,
        );
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
      root.register({
        [AppContainer.tokenKey(def.provide)]:
          AppContainer._makeRegistration(def),
      });
    }

    const registry = new ProcessorRegistry();
    for (const cls of graph.processors) {
      const key = graph.processorKeys.get(cls)!;
      root.register({ [key]: AppContainer._makeClassResolver(cls) });
      registry.register(getEventType(cls), root.resolve<IEventProcessor>(key));
    }
    root.register({ [AppContainer.REGISTRY_KEY]: asValue(registry) });

    for (const mod of graph.modules) {
      root.register({
        [graph.moduleKeys.get(mod)!]: AppContainer._makeClassResolver(mod),
      });
    }
    const modules = graph.modules.map((mod) =>
      root.resolve<object>(graph.moduleKeys.get(mod)!),
    );

    const lifecycleProviders: object[] = [];
    for (const def of graph.providers) {
      const lc = (def as any).lifecycle as string | undefined;
      if (lc === 'transient' || lc === 'scoped') continue;
      const instance = root.resolve<object>(AppContainer.tokenKey(def.provide));
      if (isOnModuleInit(instance) || isOnModuleDestroy(instance)) {
        lifecycleProviders.push(instance);
      }
    }

    return { container: root, modules, lifecycleProviders };
  }
}
