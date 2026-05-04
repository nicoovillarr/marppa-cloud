export const CACHE_STORAGE_SYMBOL = 'CACHE_STORAGE_SYMBOL';

export interface CacheStorage {
  /**
   * Save a serializable value in cache.
   * - If value === undefined => delete the key.
   * - If value === null => explicitly save `null`.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Return the saved value <T> or `undefined` if it does not exist or has expired.
   * Note: if you saved `null`, the method will return `null` (which is compatible with T).
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Delete a key from cache.
   */
  delete(key: string): Promise<void>;
}
