import { Injectable } from '@nestjs/common';

const DEFAULT_TTL_MS = 25_000; // 25 seconds - balance freshness vs DB load

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-memory cache for display API responses.
 * Reduces DB load when many TVs request the same screen (e.g. 1000 TVs, 100 screens).
 * TTL ensures data stays reasonably fresh; use Supabase Realtime later to invalidate on change.
 */
@Injectable()
export class DisplayCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs = DEFAULT_TTL_MS;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  static cacheKey(token: string, rotationIndex: number | undefined): string {
    const r = rotationIndex === undefined ? '' : `:r${rotationIndex}`;
    return `display:${token}${r}`;
  }
}
