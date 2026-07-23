export type InjectionToken = string | symbol | (abstract new (...args: any[]) => any);

const injectMeta = new WeakMap<Function, Map<number, InjectionToken>>();

export function Inject(token: InjectionToken): ParameterDecorator {
  return (target: Object, _key: string | symbol | undefined, index: number): void => {
    const ctor = target as Function;
    if (!injectMeta.has(ctor)) injectMeta.set(ctor, new Map());
    injectMeta.get(ctor)!.set(index, token);
  };
}

export function getInjectMetadata(target: Function): Map<number, InjectionToken> {
  return injectMeta.get(target) ?? new Map();
}
