export const CACHE_STORAGE_SYMBOL = 'CACHE_STORAGE_SYMBOL';

export interface CacheStorage {
  /**
   * Guarda un valor serializable en cache.
   * - Si value === undefined => borra la clave.
   * - Si value === null => guarda explícitamente `null`.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void;

  /**
   * Retorna el valor <T> guardado o `undefined` si no existe o expiró.
   * Nota: si guardaste `null`, el método devolverá `null` (que es compatible con T).
   */
  get<T>(key: string): T | undefined;

  delete(key: string): void;
}
