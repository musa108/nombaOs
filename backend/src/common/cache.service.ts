import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { getRedisClient } from './cache.module';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /**
   * Get-or-compute helper: returns the cached value if present, otherwise
   * runs `compute`, caches the result, and returns it. This is the pattern
   * used for business context (hit on every AI chat turn) and revenue
   * analytics (hit on every dashboard load).
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) return cached;
    const fresh = await compute();
    await this.cache.set(key, fresh, ttlMs);
    return fresh;
  }

  /** Invalidates everything cached for a business — call after any write
   * that would change revenue/customer/product/invoice aggregates. */
  async invalidateBusiness(businessId: string): Promise<void> {
    await Promise.all([
      this.del(`business-context:${businessId}`),
      this.del(`revenue-analytics:${businessId}`),
      this.del(`dashboard-summary:${businessId}`),
    ]);
  }

  /** Return basic Redis client status for health checks. */
  getRedisStatus(): { available: boolean; status?: string } {
    const client = getRedisClient();
    if (!client) return { available: false };
    return { available: true, status: client.status };
  }
}
