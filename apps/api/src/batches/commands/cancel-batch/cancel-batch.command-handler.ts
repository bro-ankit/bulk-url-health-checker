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
  UrlCheckStatus,
} from '@bulk-url-health-checker/shared-contracts';
import { CacheProviderService } from '../../../cache/cache-provider.service';
import { BatchEventsPublisher } from '../../../redis/batch-events.publisher';
import { SseCursorUtil } from '../../../sse/sse-cursor.util';
import { BatchRepository } from '../../repositories/batch.repository';
import { UrlRepository } from '../../repositories/url.repository';
import { CancelBatchCommand } from './cancel-batch.command';

@CommandHandler(CancelBatchCommand)
export class CancelBatchCommandHandler implements ICommandHandler<CancelBatchCommand, void> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly urlRepository: UrlRepository,
    @InjectQueue(BATCH_CONSTANTS.CHECK_QUEUE_NAME)
    private readonly checkQueue: Queue<CheckUrlJobDto>,
    private readonly cacheProvider: CacheProviderService,
    private readonly batchEventsPublisher: BatchEventsPublisher,
  ) {}

  async execute(command: CancelBatchCommand): Promise<void> {
    this.logger.info({ batchId: command.batchId }, 'Executing CancelBatchCommand');

    await this.findBatchByIdOrThrow(command.batchId);

    const queuedUrls = await this.urlRepository.find({
      batch: command.batchId,
      status: UrlCheckStatus.QUEUED,
    });

    await Promise.all([
      this.cancelBatchAndQueuedUrls(command.batchId, queuedUrls),
      this.removeQueuedJobs(queuedUrls),
      this.invalidateBatchListCache(),
    ]);

    await this.publishCancelledEvent(command.batchId);
  }

  private async findBatchByIdOrThrow(id: UUID) {
    const batch = await this.batchRepository.findById(id);

    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    return batch;
  }

  @Transactional()
  private async cancelBatchAndQueuedUrls(batchId: UUID, queuedUrls: UrlEntity[]): Promise<void> {
    this.logger.info({ batchId, queuedUrlCount: queuedUrls.length }, 'Marking batch and queued urls as cancelled');
    await this.urlRepository.markQueuedAsCancelledForBatch(batchId);
    await this.batchRepository.setStatus(batchId, BatchStatus.CANCELLED);
  }

  private async removeQueuedJobs(queuedUrls: UrlEntity[]): Promise<void> {
    this.logger.info({ urlCount: queuedUrls.length }, 'Removing queued BullMQ jobs for cancelled batch');

    const results = await Promise.allSettled(
      queuedUrls.map(async (url) => {
        const job = await this.checkQueue.getJob(url.id);
        await job?.remove();
      }),
    );

    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn({ failureCount: failures.length }, 'Some queued BullMQ jobs failed to remove');
    }
  }

  private async invalidateBatchListCache(): Promise<void> {
    const cacheKey = BatchListCacheKeyUtil.build(undefined, BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE);
    this.logger.debug({ cacheKey }, 'Invalidating batch list cache');
    await this.cacheProvider.delKey(cacheKey);
  }

  private async publishCancelledEvent(batchId: UUID): Promise<void> {
    const cancelledBatch = await this.batchRepository.findById(batchId);
    if (!cancelledBatch) {
      this.logger.warn({ batchId }, 'Batch not found after cancel, skipping SSE publish');
      return;
    }

    this.logger.debug({ batchId, status: cancelledBatch.status }, 'Publishing cancelled batch event');
    await this.batchEventsPublisher.publish(batchId, {
      id: SseCursorUtil.encode(cancelledBatch.id, cancelledBatch.updatedAt),
      data: { batch: this.toBatchSummary(cancelledBatch) },
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
