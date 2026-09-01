import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { TestBed } from '@suites/unit';
import type { Mocked } from '@suites/unit';
import type { Job, Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

import {
  BATCH_CONSTANTS,
  BatchListCacheKeyUtil,
  BatchStatus,
  CheckUrlJobDto,
} from '@bulk-url-health-checker/shared-contracts';
import { CacheProviderService } from '../../../../src/cache/cache-provider.service';
import { BatchEventsPublisher } from '../../../../src/redis/batch-events.publisher';
import { BatchRepository } from '../../../../src/batches/repositories/batch.repository';
import { UrlRepository } from '../../../../src/batches/repositories/url.repository';
import { RetryFailedBatchCommand } from '../../../../src/batches/commands/retry-failed-batch/retry-failed-batch.command';
import { RetryFailedBatchCommandHandler } from '../../../../src/batches/commands/retry-failed-batch/retry-failed-batch.command-handler';
import { mockBatchEntity, mockUrlEntity } from '../../../__mocks__';

vi.mock('@mikro-orm/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mikro-orm/core')>();

  return {
    ...actual,
    Transactional:
      () =>
      (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor =>
        descriptor,
  };
});

type CheckUrlQueue = Pick<Queue<CheckUrlJobDto>, 'getJob' | 'addBulk'>;

describe('Given RetryFailedBatchCommandHandler', () => {
  let sut: RetryFailedBatchCommandHandler;
  let batchRepository: Mocked<BatchRepository>;
  let urlRepository: Mocked<UrlRepository>;
  let checkQueue: Mocked<CheckUrlQueue>;
  let cacheProvider: Mocked<CacheProviderService>;
  let batchEventsPublisher: Mocked<BatchEventsPublisher>;

  const BATCH = mockBatchEntity({ status: BatchStatus.RUNNING, failedCount: 2 });
  const FAILED_URLS = [
    mockUrlEntity({ id: randomUUID(), batch: BATCH }),
    mockUrlEntity({ id: randomUUID(), batch: BATCH }),
  ];
  const COMMAND = new RetryFailedBatchCommand(BATCH.id);

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(RetryFailedBatchCommandHandler).compile();

    sut = unit;
    batchRepository = unitRef.get(BatchRepository);
    urlRepository = unitRef.get(UrlRepository);
    checkQueue = unitRef.get<CheckUrlQueue>(getQueueToken(BATCH_CONSTANTS.CHECK_QUEUE_NAME));
    cacheProvider = unitRef.get(CacheProviderService);
    batchEventsPublisher = unitRef.get(BatchEventsPublisher);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    batchRepository.findById.mockResolvedValue(BATCH);
    urlRepository.findFailedByBatchId.mockResolvedValue(FAILED_URLS);
    checkQueue.getJob.mockResolvedValue(undefined);
  });

  describe('When the batch does not exist', () => {
    test('Then it throws NotFoundException and performs no other work', async () => {
      batchRepository.findById.mockResolvedValue(null);

      await expect(sut.execute(COMMAND)).rejects.toThrow(new NotFoundException(`Batch ${COMMAND.batchId} not found`));

      expect(urlRepository.resetToQueued).not.toHaveBeenCalled();
      expect(checkQueue.addBulk).not.toHaveBeenCalled();
      expect(cacheProvider.delKey).not.toHaveBeenCalled();
      expect(batchEventsPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('When the batch has no failed urls', () => {
    test('Then it returns without resetting, re-enqueueing, invalidating cache, or publishing', async () => {
      urlRepository.findFailedByBatchId.mockResolvedValue([]);

      await sut.execute(COMMAND);

      expect(urlRepository.resetToQueued).not.toHaveBeenCalled();
      expect(batchRepository.decrementFailed).not.toHaveBeenCalled();
      expect(checkQueue.addBulk).not.toHaveBeenCalled();
      expect(cacheProvider.delKey).not.toHaveBeenCalled();
      expect(batchEventsPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('When the batch has failed urls', () => {
    test('Then it resets them to queued, decrements failedCount, flips the batch to running, removes any stale BullMQ job before re-adding, invalidates the batch list cache, and publishes the updated batch', async () => {
      const retriedBatch = mockBatchEntity({ id: BATCH.id, status: BatchStatus.RUNNING, failedCount: 0 });
      batchRepository.findById.mockResolvedValueOnce(BATCH).mockResolvedValueOnce(retriedBatch);
      const staleJob: Pick<Job<CheckUrlJobDto>, 'remove'> = { remove: vi.fn().mockResolvedValue(undefined) };
      checkQueue.getJob
        .mockResolvedValueOnce(staleJob as unknown as Job<CheckUrlJobDto>)
        .mockResolvedValueOnce(undefined);

      await sut.execute(COMMAND);

      expect(urlRepository.resetToQueued).toHaveBeenCalledWith(FAILED_URLS.map((url) => url.id));
      expect(batchRepository.decrementFailed).toHaveBeenCalledWith(BATCH.id, FAILED_URLS.length);
      expect(batchRepository.setStatus).toHaveBeenCalledWith(BATCH.id, BatchStatus.RUNNING);

      expect(checkQueue.getJob.mock.calls).toStrictEqual([[FAILED_URLS[0].id], [FAILED_URLS[1].id]]);
      expect(staleJob.remove).toHaveBeenCalledWith();

      expect(checkQueue.addBulk).toHaveBeenCalledWith(
        FAILED_URLS.map((url) => ({
          name: BATCH_CONSTANTS.CHECK_JOB_NAME,
          data: { urlId: url.id, batchId: BATCH.id, url: url.url },
          opts: { jobId: url.id },
        })),
      );

      expect(cacheProvider.delKey).toHaveBeenCalledWith(
        BatchListCacheKeyUtil.build(undefined, BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE),
      );

      expect(batchEventsPublisher.publish).toHaveBeenCalledWith(BATCH.id, {
        id: `${retriedBatch.updatedAt.toISOString()}|${retriedBatch.id}`,
        data: {
          batch: {
            id: retriedBatch.id,
            status: retriedBatch.status,
            totalCount: retriedBatch.totalCount,
            succeededCount: retriedBatch.succeededCount,
            failedCount: retriedBatch.failedCount,
          },
        },
      });
    });
  });

  describe('When removing a stale BullMQ job fails', () => {
    test('Then it still enqueues the retry jobs rather than aborting', async () => {
      checkQueue.getJob.mockRejectedValueOnce(new Error('redis unavailable')).mockResolvedValueOnce(undefined);

      await sut.execute(COMMAND);

      expect(checkQueue.addBulk).toHaveBeenCalledWith(
        FAILED_URLS.map((url) => ({
          name: BATCH_CONSTANTS.CHECK_JOB_NAME,
          data: { urlId: url.id, batchId: BATCH.id, url: url.url },
          opts: { jobId: url.id },
        })),
      );
    });
  });

  describe('When the batch is gone by the time the retried event is about to publish', () => {
    test('Then it skips publishing instead of throwing', async () => {
      batchRepository.findById.mockResolvedValueOnce(BATCH).mockResolvedValueOnce(null);

      await sut.execute(COMMAND);

      expect(batchEventsPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
