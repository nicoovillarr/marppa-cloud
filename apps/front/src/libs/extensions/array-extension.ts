export {};

declare global {
  interface Array<T> {
    distinct(): T[];
    distinctBy<K extends keyof T>(key: K): T[];
  }
}

Array.prototype.distinct = function <T>(this: T[]): T[] {
  const seen = new Set<T>();
  return this.filter((item) => {
    if (seen.has(item)) {
      return false;
    }
    seen.add(item);
    return true;
  });
};

Array.prototype.distinctBy = function <T, K extends keyof T>(
  this: T[],
  key: K
): T[] {
  const seen = new Set<T[K]>();
  return this.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};
