import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { BatchEventsController } from './controllers/batch-events.controller';
import { BatchesController } from './controllers/batches.controller';
import { CancelBatchCommandHandler } from './commands/cancel-batch/cancel-batch.command-handler';
import { CompleteUrlUploadCommandHandler } from './commands/complete-url-upload/complete-url-upload.command-handler';
import { CreateBatchCommandHandler } from './commands/create-batch/create-batch.command-handler';
import { RequestUrlUploadCommandHandler } from './commands/request-url-upload/request-url-upload.command-handler';
import { RetryFailedBatchCommandHandler } from './commands/retry-failed-batch/retry-failed-batch.command-handler';
import { CreateBatchService } from './services/create-batch.service';
import { GetBatchUpdatesSinceQueryHandler } from './queries/get-batch-updates-since/get-batch-updates-since.query-handler';
import { GetBatchUrlsQueryHandler } from './queries/get-batch-urls/get-batch-urls.query-handler';
import { ListBatchesQueryHandler } from './queries/list-batches/list-batches.query-handler';
import { BatchRepository } from './repositories/batch.repository';
import { UrlRepository } from './repositories/url.repository';
import { GetBatchQueryHandler } from './queries/get-batch/get-batch.query-handler';
import { CacheInvalidationListener } from './redis/cache-invalidation.listener';

const COMMAND_HANDLERS = [
  CreateBatchCommandHandler,
  CancelBatchCommandHandler,
  RetryFailedBatchCommandHandler,
  RequestUrlUploadCommandHandler,
  CompleteUrlUploadCommandHandler,
];

const QUERY_HANDLERS = [
  GetBatchQueryHandler,
  GetBatchUrlsQueryHandler,
  GetBatchUpdatesSinceQueryHandler,
  ListBatchesQueryHandler,
];

@Module({
  imports: [CqrsModule, QueueModule, StorageModule],
  controllers: [BatchesController, BatchEventsController],
  providers: [
    BatchRepository,
    UrlRepository,
    CreateBatchService,
    CacheInvalidationListener,
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
  ],
})
export class BatchesModule {}
