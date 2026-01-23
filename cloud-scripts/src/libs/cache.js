class Cache {
  static cache = new Map();
  static defaultTTL = 1000 * 60 * 5;

  constructor() {
    throw new Error('Cache is a static singleton class. Use static methods.');
  }

  /**
   * Set a value in the cache
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] Time-to-live in milliseconds
   */
  static set(key, value, ttl = Cache.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    Cache.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache
   * @param {string} key
   * @returns {*} Value or null if expired/not found
   */
  static get(key) {
    const entry = Cache.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      Cache.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key
   */
  static delete(key) {
    Cache.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  static clear() {
    Cache.cache.clear();
  }
}

module.exports = Cache;
