import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';
import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import type { Milliseconds } from './cache.constants';

@Injectable()
export class CacheProviderService {
  @InjectLogger() private readonly logger!: AppLoggerService;

  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getOrSetCache<T>(cacheKey: string, fetchMethod: () => Promise<T>, ttl?: Milliseconds): Promise<T> {
    const cached = await this.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    const existing = this.inFlight.get(cacheKey);
    if (existing) return existing as Promise<T>;

    const fetchPromise = this.fetchAndCache(cacheKey, fetchMethod, ttl);
    this.inFlight.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return (await this.cacheManager.get(key)) as T | undefined;
  }

  async set<T>(key: string, value: T, ttl?: Milliseconds): Promise<void> {
    this.logger.debug({ key }, 'Saving value into cache');
    await this.cacheManager.set(key, value, ttl);
  }

  async delKey(key: string): Promise<void> {
    this.logger.debug({ key }, 'Deleting key from cache');
    await this.cacheManager.del(key);
  }

  private async fetchAndCache<T>(cacheKey: string, fetchMethod: () => Promise<T>, ttl?: Milliseconds): Promise<T> {
    try {
      const result = await fetchMethod();
      await this.set(cacheKey, result, ttl);
      return result;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }
}
