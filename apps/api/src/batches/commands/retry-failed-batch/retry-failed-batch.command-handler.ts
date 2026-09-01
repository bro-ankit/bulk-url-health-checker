import { Transactional } from '@mikro-orm/core';
import { InjectQueue } from '@nestjs/bullmq';
import type { ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { UUID } from 'node:crypto';

import type {
  AppLoggerService,
  BatchEntity,
  CheckUrlJobDto,
  UrlEntity,
} from '@bulk-url-health-checker/shared-contracts';
import {
  BATCH_CONSTANTS,
  BatchListCacheKeyUtil,
  BatchStatus,
  InjectLogger,
} from '@bulk-url-health-checker/shared-contracts';
import { CacheProviderService } from '../../../cache/cache-provider.service';
import { BatchEventsPublisher } from '../../../redis/batch-events.publisher';
import { SseCursorUtil } from '../../../sse/sse-cursor.util';
import { BatchRepository } from '../../repositories/batch.repository';
import { UrlRepository } from '../../repositories/url.repository';
import { RetryFailedBatchCommand } from './retry-failed-batch.command';

@CommandHandler(RetryFailedBatchCommand)
export class RetryFailedBatchCommandHandler implements ICommandHandler<RetryFailedBatchCommand, void> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly urlRepository: UrlRepository,
    @InjectQueue(BATCH_CONSTANTS.CHECK_QUEUE_NAME)
    private readonly checkQueue: Queue<CheckUrlJobDto>,
    private readonly cacheProvider: CacheProviderService,
    private readonly batchEventsPublisher: BatchEventsPublisher,
  ) {}

  async execute(command: RetryFailedBatchCommand): Promise<void> {
    this.logger.info({ batchId: command.batchId }, 'Executing RetryFailedBatchCommand');

    const [batch, failedUrls] = await Promise.all([
      this.batchRepository.findById(command.batchId),
      this.urlRepository.findFailedByBatchId(command.batchId),
    ]);
    if (!batch) {
      throw new NotFoundException(`Batch ${command.batchId} not found`);
    }
    if (failedUrls.length === 0) {
      this.logger.info({ batchId: command.batchId }, 'No failed urls to retry, skipping');
      return;
    }

    await Promise.all([
      this.resetUrlsToQueued(command.batchId, failedUrls),
      this.retryBullMqJobs(command.batchId, failedUrls),
      this.invalidateBatchListCache(),
    ]);

    await this.publishRetriedEvent(command.batchId);
  }

  @Transactional()
  private async resetUrlsToQueued(batchId: UUID, failedUrls: UrlEntity[]): Promise<void> {
    this.logger.info({ batchId, urlCount: failedUrls.length }, 'Resetting failed urls to queued');
    await this.urlRepository.resetToQueued(failedUrls.map((url) => url.id));
    await this.batchRepository.decrementFailed(batchId, failedUrls.length);
    await this.batchRepository.setStatus(batchId, BatchStatus.RUNNING);
  }

  private async retryBullMqJobs(batchId: UUID, failedUrls: UrlEntity[]): Promise<void> {
    await this.removeStaleJobs(failedUrls);
    await this.enqueueRetryJobs(batchId, failedUrls);
  }

  private async removeStaleJobs(failedUrls: UrlEntity[]): Promise<void> {
    this.logger.info({ urlCount: failedUrls.length }, 'Removing stale BullMQ jobs before retry');

    const results = await Promise.allSettled(
      failedUrls.map(async (url) => {
        const job = await this.checkQueue.getJob(url.id);
        await job?.remove();
      }),
    );

    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn({ failureCount: failures.length }, 'Some stale BullMQ jobs failed to remove');
    }
  }

  private async enqueueRetryJobs(batchId: UUID, failedUrls: UrlEntity[]): Promise<void> {
    this.logger.info({ batchId, urlCount: failedUrls.length }, 'Enqueuing retry jobs');

    await this.checkQueue.addBulk(
      failedUrls.map((url) => ({
        name: BATCH_CONSTANTS.CHECK_JOB_NAME,
        data: { urlId: url.id, batchId, url: url.url },
        opts: { jobId: url.id },
      })),
    );
  }

  private async invalidateBatchListCache(): Promise<void> {
    const cacheKey = BatchListCacheKeyUtil.build(undefined, BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE);
    this.logger.debug({ cacheKey }, 'Invalidating batch list cache');
    await this.cacheProvider.delKey(cacheKey);
  }

  private async publishRetriedEvent(batchId: UUID): Promise<void> {
    const retriedBatch = await this.batchRepository.findById(batchId);
    if (!retriedBatch) {
      this.logger.warn({ batchId }, 'Batch not found after retry, skipping SSE publish');
      return;
    }

    this.logger.debug({ batchId, status: retriedBatch.status }, 'Publishing retried batch event');
    await this.batchEventsPublisher.publish(batchId, {
      id: SseCursorUtil.encode(retriedBatch.id, retriedBatch.updatedAt),
      data: { batch: this.toBatchSummary(retriedBatch) },
    });
  }

  private toBatchSummary(batch: BatchEntity) {
    return {
      id: batch.id,
      status: batch.status,
      totalCount: batch.totalCount,
      succeededCount: batch.succeededCount,
      failedCount: batch.failedCount,
    };
  }
}
