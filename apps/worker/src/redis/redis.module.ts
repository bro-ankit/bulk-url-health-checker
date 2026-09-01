import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { ENV_VARIABLES } from '../constants/env.constants';
import { BatchEventsPublisher } from './batch-events.publisher';
import { CacheInvalidationPublisher } from './cache-invalidation.publisher';
import { REDIS_CLIENT } from './redis.constants';
import { RedisSemaphoreService } from './redis-semaphore.service';

const REDIS_CLIENT_PROVIDER = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis =>
    new Redis({
      host: config.getOrThrow<string>(ENV_VARIABLES.REDIS.HOST),
      port: Number(config.getOrThrow<string>(ENV_VARIABLES.REDIS.PORT)),
      maxRetriesPerRequest: null,
    }),
};

@Global()
@Module({
  providers: [REDIS_CLIENT_PROVIDER, RedisSemaphoreService, BatchEventsPublisher, CacheInvalidationPublisher],
  exports: [REDIS_CLIENT_PROVIDER, RedisSemaphoreService, BatchEventsPublisher, CacheInvalidationPublisher],
})
export class RedisModule {}
