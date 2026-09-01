import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '../../redis/redis.constants';
import { CacheProviderService } from '../../cache/cache-provider.service';
import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';

@Injectable()
export class CacheInvalidationListener implements OnModuleInit {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cacheProvider: CacheProviderService,
  ) {}

  async onModuleInit(): Promise<void> {
    const subscriberClient = this.redis.duplicate();

    await subscriberClient.subscribe(BATCH_CONSTANTS.BATCHES_LIST_INVALIDATION_CHANNEL);
    subscriberClient.on('message', (channel: string, key: string) => {
      if (channel === BATCH_CONSTANTS.BATCHES_LIST_INVALIDATION_CHANNEL) {
        this.cacheProvider.delKey(key).catch(() => undefined);
      }
    });
  }
}
