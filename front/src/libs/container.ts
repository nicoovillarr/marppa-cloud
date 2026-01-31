type Factory<T> = () => T;

class Container {
  private factories = new Map<string, Factory<any>>();

  register<T>(key: string, factory: Factory<T>) {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Service ${key} not registered`);
    return factory();
  }
}

export const container = new Container();
