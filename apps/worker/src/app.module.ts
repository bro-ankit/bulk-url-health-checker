import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '@bulk-url-health-checker/shared-contracts';
import { BatchesModule } from './batches/batches.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), LoggerModule, DatabaseModule, RedisModule, BatchesModule],
})
export class AppModule {}
