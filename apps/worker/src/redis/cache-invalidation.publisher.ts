import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { BATCH_LIST_CACHE_KEY } from './cache-invalidation.constants';
import { REDIS_CLIENT } from './redis.constants';
import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';

@Injectable()
export class CacheInvalidationPublisher {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async invalidateBatchesList(): Promise<void> {
    await this.redis.publish(BATCH_CONSTANTS.BATCHES_LIST_INVALIDATION_CHANNEL, BATCH_LIST_CACHE_KEY);
  }
}
