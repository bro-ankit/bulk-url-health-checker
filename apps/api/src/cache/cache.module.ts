import KeyvRedis from '@keyv/redis';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { Keyv } from 'keyv';

import { ENV_VARIABLES } from '../constants/env.constants';
import { CacheExecutor } from './cache-executor.service';
import { CacheProviderService } from './cache-provider.service';

@Global()
@Module({
  imports: [
    DiscoveryModule,
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>(ENV_VARIABLES.REDIS.HOST);
        const port = config.getOrThrow<string>(ENV_VARIABLES.REDIS.PORT);
        return {
          stores: [new Keyv({ store: new KeyvRedis(`redis://${host}:${port}`) })],
        };
      },
    }),
  ],
  providers: [CacheProviderService, CacheExecutor],
  exports: [CacheProviderService],
})
export class AppCacheModule {}
