import { TestBed } from '@suites/unit';
import type { Mocked } from '@suites/unit';
import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';

import { BatchStatus, UrlCheckStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchEventsPublisher } from '../../../src/redis/batch-events.publisher';
import { CacheInvalidationPublisher } from '../../../src/redis/cache-invalidation.publisher';
import { RedisSemaphoreService } from '../../../src/redis/redis-semaphore.service';
import { BatchRepository } from '../../../src/batches/repositories/batch.repository';
import { UrlRepository } from '../../../src/batches/repositories/url.repository';
import { CheckUrlProcessor } from '../../../src/batches/processors/check-url.processor';
import { UrlCheckerUtil } from '../../../src/batches/processors/url-checker.util';
import { mockBatchEntity, mockUrlEntity } from '../../__mocks__';

// `process`/`onFailed` are `@CreateRequestContext()`-decorated, which does a strict
// `instanceof MikroORM` check on the constructor-injected `orm` to resolve an EntityManager. An
// auto-mocked `orm` is a plain object, never a real MikroORM instance, so that check fails and
// the real decorator throws before the method body ever runs. This is a unit test against mocked
// repositories, not a real database, so the context-forking itself is not what's under test.
vi.mock('@mikro-orm/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mikro-orm/core')>();

  return {
    ...actual,
    CreateRequestContext:
      () =>
      (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor =>
        descriptor,
  };
});

const buildJob = (overrides: Partial<Job> = {}): Job =>
  ({
    data: { urlId: randomUUID(), batchId: randomUUID(), url: 'https://example.com' },
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  }) as Job;

describe('Given CheckUrlProcessor', () => {
  let sut: CheckUrlProcessor;
  let urlRepository: Mocked<UrlRepository>;
  let batchRepository: Mocked<BatchRepository>;
  let semaphore: Mocked<RedisSemaphoreService>;
  let batchEventsPublisher: Mocked<BatchEventsPublisher>;
  let cacheInvalidationPublisher: Mocked<CacheInvalidationPublisher>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(CheckUrlProcessor).compile();

    sut = unit;
    urlRepository = unitRef.get(UrlRepository);
    batchRepository = unitRef.get(BatchRepository);
    semaphore = unitRef.get(RedisSemaphoreService);
    batchEventsPublisher = unitRef.get(BatchEventsPublisher);
    cacheInvalidationPublisher = unitRef.get(CacheInvalidationPublisher);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given process', () => {
    describe('When the url row no longer exists', () => {
      test('Then it returns without checking the url or touching the semaphore', async () => {
        urlRepository.findById.mockResolvedValue(null);

        await sut.process(buildJob());

        expect(semaphore.acquire).not.toHaveBeenCalled();
      });
    });

    describe('When the url row is already cancelled', () => {
      test('Then it returns without checking the url', async () => {
        urlRepository.findById.mockResolvedValue(mockUrlEntity({ status: UrlCheckStatus.CANCELLED }));

        await sut.process(buildJob());

        expect(semaphore.acquire).not.toHaveBeenCalled();
      });
    });

    describe('When the batch no longer exists', () => {
      test('Then it returns without checking the url', async () => {
        urlRepository.findById.mockResolvedValue(mockUrlEntity({ status: UrlCheckStatus.QUEUED }));
        batchRepository.findById.mockResolvedValue(null);

        await sut.process(buildJob());

        expect(semaphore.acquire).not.toHaveBeenCalled();
      });
    });

    describe('When the batch is already cancelled', () => {
      test('Then it returns without checking the url', async () => {
        urlRepository.findById.mockResolvedValue(mockUrlEntity({ status: UrlCheckStatus.QUEUED }));
        batchRepository.findById.mockResolvedValue(mockBatchEntity({ status: BatchStatus.CANCELLED }));

        await sut.process(buildJob());

        expect(semaphore.acquire).not.toHaveBeenCalled();
      });
    });

    describe('When the url and batch are both still active', () => {
      test('Then it acquires the semaphore, checks the url, marks it succeeded, publishes the update, and releases the semaphore', async () => {
        const job = buildJob({ attemptsMade: 0 });
        const urlRow = mockUrlEntity({ id: job.data.urlId, status: UrlCheckStatus.QUEUED });
        const batchRow = mockBatchEntity({ id: job.data.batchId, status: BatchStatus.RUNNING });
        urlRepository.findById.mockResolvedValue(urlRow);
        batchRepository.findById.mockResolvedValue(batchRow);
        vi.spyOn(UrlCheckerUtil, 'check').mockResolvedValue({
          httpStatusCode: 200,
          responseTimeMs: 150,
          pageTitle: 'Example',
        });

        await sut.process(job);

        expect(semaphore.acquire).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
        expect(urlRepository.markSucceeded).toHaveBeenCalledWith(job.data.urlId, 1, {
          httpStatusCode: 200,
          responseTimeMs: 150,
          pageTitle: 'Example',
        });
        expect(batchRepository.incrementSucceeded).toHaveBeenCalledWith(job.data.batchId);
        expect(batchEventsPublisher.publish).toHaveBeenCalled();
        expect(cacheInvalidationPublisher.invalidateBatchesList).toHaveBeenCalled();
        expect(semaphore.release).toHaveBeenCalledWith(expect.any(String));
      });
    });

    describe('When the url check itself throws', () => {
      test('Then it still releases the semaphore before the error propagates', async () => {
        const job = buildJob();
        urlRepository.findById.mockResolvedValue(mockUrlEntity({ id: job.data.urlId, status: UrlCheckStatus.QUEUED }));
        batchRepository.findById.mockResolvedValue(
          mockBatchEntity({ id: job.data.batchId, status: BatchStatus.RUNNING }),
        );
        vi.spyOn(UrlCheckerUtil, 'check').mockRejectedValue(new Error('network unreachable'));

        await expect(sut.process(job)).rejects.toThrow('network unreachable');

        expect(semaphore.release).toHaveBeenCalledWith(expect.any(String));
        expect(urlRepository.markSucceeded).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given onFailed', () => {
    describe('When there is no job', () => {
      test('Then it does nothing', async () => {
        await sut.onFailed(undefined, new Error('boom'));

        expect(urlRepository.markFailed).not.toHaveBeenCalled();
      });
    });

    describe('When the job still has retries left', () => {
      test('Then it does not mark the url failed yet', async () => {
        const job = buildJob({ attemptsMade: 1, opts: { attempts: 3 } });

        await sut.onFailed(job, new Error('timed out'));

        expect(urlRepository.markFailed).not.toHaveBeenCalled();
      });
    });

    describe('When the job has exhausted its retries', () => {
      test('Then it marks the url failed, increments the batch failed count, and publishes the update', async () => {
        const job = buildJob({ attemptsMade: 3, opts: { attempts: 3 } });
        batchRepository.findById.mockResolvedValue(mockBatchEntity({ id: job.data.batchId }));
        urlRepository.findById.mockResolvedValue(mockUrlEntity({ id: job.data.urlId }));

        await sut.onFailed(job, new Error('timed out'));

        expect(urlRepository.markFailed).toHaveBeenCalledWith(job.data.urlId, 3, 'timed out');
        expect(batchRepository.incrementFailed).toHaveBeenCalledWith(job.data.batchId);
        expect(batchEventsPublisher.publish).toHaveBeenCalled();
      });
    });
  });
});
