import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';
import { ENV_VARIABLES } from '../constants/env.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>(ENV_VARIABLES.REDIS.HOST),
          port: Number(config.getOrThrow<string>(ENV_VARIABLES.REDIS.PORT)),
        },
      }),
    }),
    BullModule.registerQueue({ name: BATCH_CONSTANTS.CHECK_QUEUE_NAME }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
