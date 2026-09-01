import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module';
import { CheckUrlProcessor } from './processors/check-url.processor';
import { BatchRepository } from './repositories/batch.repository';
import { UrlRepository } from './repositories/url.repository';

@Module({
  imports: [QueueModule],
  providers: [BatchRepository, UrlRepository, CheckUrlProcessor],
})
export class BatchesModule {}
