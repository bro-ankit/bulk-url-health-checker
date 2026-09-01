import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import type { CacheOptions } from './cache.decorator';
import { CACHE_DECORATOR_KEY } from './cache.decorator';
import { CacheProviderService } from './cache-provider.service';

@Injectable()
export class CacheExecutor implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly cacheProvider: CacheProviderService,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discovery.getProviders().filter((p) => p.instance);

    for (const wrapper of providers) {
      const instance = wrapper.instance as Record<string, unknown>;
      const prototype = Object.getPrototypeOf(instance) as object | null;
      if (!prototype) continue;

      const methodNames = this.scanner.scanFromPrototype(prototype, prototype, (name) => name);

      for (const methodName of methodNames) {
        const originalMethod = instance[methodName];
        if (typeof originalMethod !== 'function') continue;

        const metadata = this.reflector.get<CacheOptions>(CACHE_DECORATOR_KEY, originalMethod);
        if (!metadata) continue;

        instance[methodName] = async (...args: unknown[]) => {
          const cacheKey = typeof metadata.key === 'function' ? metadata.key(...args) : metadata.key;

          return this.cacheProvider.getOrSetCache(
            cacheKey,
            () => Promise.resolve((originalMethod as (...a: unknown[]) => unknown).apply(instance, args)),
            metadata.ttl,
          );
        };
      }
    }
  }
}
