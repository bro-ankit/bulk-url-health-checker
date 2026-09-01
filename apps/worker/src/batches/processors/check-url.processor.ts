import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { UUID } from 'node:crypto';

import type { AppLoggerService, CheckUrlJobDto } from '@bulk-url-health-checker/shared-contracts';
import { BATCH_CONSTANTS, BatchStatus, InjectLogger, UrlCheckStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchEventsPublisher } from '../../redis/batch-events.publisher';
import { CacheInvalidationPublisher } from '../../redis/cache-invalidation.publisher';
import { RedisSemaphoreService } from '../../redis/redis-semaphore.service';
import { BatchRepository } from '../repositories/batch.repository';
import { UrlRepository } from '../repositories/url.repository';
import { UrlCheckerUtil } from './url-checker.util';

@Processor(BATCH_CONSTANTS.CHECK_QUEUE_NAME, {
  concurrency: BATCH_CONSTANTS.MAX_CONCURRENT_CHECKS,
  limiter: { max: BATCH_CONSTANTS.RATE_LIMIT_MAX, duration: BATCH_CONSTANTS.RATE_LIMIT_DURATION_MS },
})
export class CheckUrlProcessor extends WorkerHost {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(
    private readonly orm: MikroORM,
    private readonly urlRepository: UrlRepository,
    private readonly batchRepository: BatchRepository,
    private readonly semaphore: RedisSemaphoreService,
    private readonly batchEventsPublisher: BatchEventsPublisher,
    private readonly cacheInvalidationPublisher: CacheInvalidationPublisher,
  ) {
    super();
  }

  @CreateRequestContext()
  async process(job: Job<CheckUrlJobDto>): Promise<void> {
    const { urlId, batchId, url } = job.data;

    const urlRow = await this.urlRepository.findById(urlId);
    if (!urlRow || urlRow.status === UrlCheckStatus.CANCELLED) return;

    const batch = await this.batchRepository.findById(batchId);
    if (!batch || batch.status === BatchStatus.CANCELLED) return;

    await this.semaphore.acquire(BATCH_CONSTANTS.URL_CHECK_SEMAPHORE_KEY, BATCH_CONSTANTS.MAX_CONCURRENT_CHECKS);

    try {
      const result = await UrlCheckerUtil.check(url);
      await this.markSucceeded(urlId, batchId, job.attemptsMade + 1, result);
    } finally {
      await this.semaphore.release(BATCH_CONSTANTS.URL_CHECK_SEMAPHORE_KEY);
    }
  }

  @OnWorkerEvent('failed')
  @CreateRequestContext()
  async onFailed(job: Job<CheckUrlJobDto> | undefined, error: Error): Promise<void> {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn({ jobId: job.id, attempt: job.attemptsMade }, 'URL check attempt failed, will retry');
      return;
    }

    await this.markFailed(job.data.urlId, job.data.batchId, job.attemptsMade, error.message);
  }

  private async markSucceeded(
    urlId: UUID,
    batchId: UUID,
    attempts: number,
    result: { httpStatusCode: number; responseTimeMs: number; pageTitle: string | null },
  ): Promise<void> {
    await this.urlRepository.markSucceeded(urlId, attempts, result);
    await this.batchRepository.incrementSucceeded(batchId);
    await this.publishBatchUrlUpdate(batchId, urlId);
  }

  private async markFailed(urlId: UUID, batchId: UUID, attempts: number, errorMessage: string): Promise<void> {
    await this.urlRepository.markFailed(urlId, attempts, errorMessage);
    await this.batchRepository.incrementFailed(batchId);
    await this.publishBatchUrlUpdate(batchId, urlId);
  }

  private async publishBatchUrlUpdate(batchId: UUID, urlId: UUID): Promise<void> {
    const [batch, url] = await Promise.all([
      this.batchRepository.findById(batchId),
      this.urlRepository.findById(urlId),
    ]);
    if (!batch || !url) return;

    await this.batchEventsPublisher.publish(batchId, {
      id: `${url.updatedAt.toISOString()}|${url.id}`,
      data: {
        batch: {
          id: batch.id,
          status: batch.status,
          totalCount: batch.totalCount,
          succeededCount: batch.succeededCount,
          failedCount: batch.failedCount,
        },
        url: {
          id: url.id,
          url: url.url,
          status: url.status,
          httpStatusCode: url.httpStatusCode,
          responseTimeMs: url.responseTimeMs,
          pageTitle: url.pageTitle,
          errorMessage: url.errorMessage,
        },
      },
    });

    await this.cacheInvalidationPublisher.invalidateBatchesList();
  }
}
