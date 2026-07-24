/**
 * Lightweight, robust in-memory cache layer matching the requested TTL specs.
 * High-performance, fail-safe, and self-contained replacement for Redis.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class MiniRedis {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Set key with TTL in seconds
   */
  public set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  /**
   * Get value if present and not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if key exists and is valid
   */
  public exists(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete key from store
   */
  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.store.clear();
  }
}

// Global cache instance exports
export const globalCache = new MiniRedis();

// Convenience constants in seconds
export const TTL_SENTIMENT = 24 * 60 * 60; // 24 hours
export const TTL_TRENDS = 30 * 60;       // 30 minutes
export const TTL_NEWS = 15 * 60;         // 15 minutes
