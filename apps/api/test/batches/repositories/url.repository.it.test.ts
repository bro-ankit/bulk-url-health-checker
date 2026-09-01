import { randomUUID } from 'node:crypto';

import { UrlCheckStatus, UrlEntity } from '@bulk-url-health-checker/shared-contracts';
import { BatchRepository } from '../../../src/batches/repositories/batch.repository';
import { UrlRepository } from '../../../src/batches/repositories/url.repository';
import { DatabaseTestEnvironment } from '../../helpers/database-test-environment';

describe('Given UrlRepository', () => {
  const env = new DatabaseTestEnvironment();
  let sut: UrlRepository;
  let batchRepository: BatchRepository;

  beforeAll(async () => {
    await env.start();
  }, 60_000);

  afterAll(async () => {
    await env.stop();
  });

  beforeEach(async () => {
    await env.clear();
    const em = env.orm.em.fork();
    sut = new UrlRepository(em);
    batchRepository = new BatchRepository(em);
  });

  const seedBatch = async (totalCount = 10) => {
    const batch = batchRepository.save(randomUUID(), `batch-${randomUUID()}`, totalCount);
    await sut.getEntityManager().flush();
    return batch;
  };

  const seedUrls = async (batch: Awaited<ReturnType<typeof seedBatch>>, urls: string[]) => {
    const entities = sut.saveMany(
      batch,
      urls.map((url) => ({ id: randomUUID(), url })),
    );
    await sut.getEntityManager().flush();
    return entities;
  };

  describe('When saveMany is called', () => {
    test('Then it persists one url row per entry, each queued and linked to the given batch', async () => {
      const batch = await seedBatch();

      const [created] = await seedUrls(batch, ['https://example.com']);
      const found = await sut.findById(created.id);

      expect(found).toStrictEqual(
        Object.assign(new UrlEntity(), {
          id: created.id,
          batch: expect.objectContaining({ id: batch.id }),
          url: 'https://example.com',
          status: UrlCheckStatus.QUEUED,
          httpStatusCode: null,
          responseTimeMs: null,
          pageTitle: null,
          errorMessage: null,
          attempts: 0,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('When findById is called', () => {
    describe('And no url exists with that id', () => {
      test('Then it returns null', async () => {
        const result = await sut.findById(randomUUID());

        expect(result).toBeNull();
      });
    });

    describe('And a prior nativeUpdate already ran against that id in the same EntityManager', () => {
      test('Then it returns the freshly written row, not the stale identity-map copy', async () => {
        const batch = await seedBatch(1);
        const [url] = await seedUrls(batch, ['https://example.com']);

        await sut.resetToQueued([url.id]);
        await sut.nativeUpdate({ id: url.id }, { status: UrlCheckStatus.FAILED, errorMessage: 'timed out' });

        const found = await sut.findById(url.id);

        expect(found?.status).toBe(UrlCheckStatus.FAILED);
        expect(found?.errorMessage).toBe('timed out');
      });
    });
  });

  describe('When findByBatchIdPaginated is called', () => {
    test('Then it returns the page of urls for that batch, ordered by createdAt, plus the total count', async () => {
      const batch = await seedBatch(3);
      await seedUrls(batch, ['https://a.com', 'https://b.com', 'https://c.com']);

      const [urls, total] = await sut.findByBatchIdPaginated(batch.id, 1, 2);

      expect(urls.map((u) => u.url)).toStrictEqual(['https://a.com', 'https://b.com']);
      expect(total).toBe(3);
    });
  });

  describe('When findFailedByBatchId is called', () => {
    test('Then it returns only the urls in that batch with status failed', async () => {
      const batch = await seedBatch(2);
      const [succeeded, failed] = await seedUrls(batch, ['https://ok.com', 'https://broken.com']);
      await sut.nativeUpdate({ id: succeeded.id }, { status: UrlCheckStatus.SUCCEEDED });
      await sut.nativeUpdate({ id: failed.id }, { status: UrlCheckStatus.FAILED });

      const result = await sut.findFailedByBatchId(batch.id);

      expect(result.map((u) => u.id)).toStrictEqual([failed.id]);
    });
  });

  describe('When markQueuedAsCancelledForBatch is called', () => {
    test('Then it cancels only the still-queued urls in that batch, leaving others untouched', async () => {
      const batch = await seedBatch(2);
      const [queued, succeeded] = await seedUrls(batch, ['https://queued.com', 'https://done.com']);
      await sut.nativeUpdate({ id: succeeded.id }, { status: UrlCheckStatus.SUCCEEDED });

      await sut.markQueuedAsCancelledForBatch(batch.id);

      const foundQueued = await sut.findById(queued.id);
      const foundSucceeded = await sut.findById(succeeded.id);
      expect(foundQueued?.status).toBe(UrlCheckStatus.CANCELLED);
      expect(foundSucceeded?.status).toBe(UrlCheckStatus.SUCCEEDED);
    });
  });

  describe('When resetToQueued is called', () => {
    describe('And given a non-empty list of ids', () => {
      test('Then it resets those urls to queued and clears their prior result fields', async () => {
        const batch = await seedBatch(1);
        const [url] = await seedUrls(batch, ['https://example.com']);
        await sut.nativeUpdate({ id: url.id }, { status: UrlCheckStatus.FAILED, errorMessage: 'boom', attempts: 3 });

        await sut.resetToQueued([url.id]);

        const found = await sut.findById(url.id);
        expect(found?.status).toBe(UrlCheckStatus.QUEUED);
        expect(found?.errorMessage).toBeNull();
        expect(found?.attempts).toBe(0);
      });
    });

    describe('And given an empty list of ids', () => {
      test('Then it does not touch any row', async () => {
        const batch = await seedBatch(1);
        const [url] = await seedUrls(batch, ['https://example.com']);
        await sut.nativeUpdate({ id: url.id }, { status: UrlCheckStatus.FAILED });

        await sut.resetToQueued([]);

        const found = await sut.findById(url.id);
        expect(found?.status).toBe(UrlCheckStatus.FAILED);
      });
    });
  });
});
