import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BatchesModule } from './batches/batches.module';
import { AppCacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LoggerModule } from '@bulk-url-health-checker/shared-contracts';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    AppCacheModule,
    BatchesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
