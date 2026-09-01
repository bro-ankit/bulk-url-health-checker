import { randomUUID, UUID } from 'node:crypto';

import { BatchEntity, BatchStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchRepository } from '../../../src/batches/repositories/batch.repository';
import { DatabaseTestEnvironment } from '../../helpers/database-test-environment';

describe('Given BatchRepository', () => {
  const env = new DatabaseTestEnvironment();
  let sut: BatchRepository;

  beforeAll(async () => {
    await env.start();
  }, 60_000);

  afterAll(async () => {
    await env.stop();
  });

  beforeEach(async () => {
    await env.clear();
    sut = new BatchRepository(env.orm.em.fork());
  });

  const seed = async (overrides: { id?: UUID; name?: string; totalCount?: number } = {}) => {
    const batch = sut.save(
      overrides.id ?? randomUUID(),
      overrides.name ?? `batch-${randomUUID()}`,
      overrides.totalCount ?? 10,
    );
    await sut.getEntityManager().flush();
    return batch;
  };

  describe('When save is called', () => {
    test('Then it persists a batch row using the given id, name, and totalCount, defaulting status and counts', async () => {
      const id = randomUUID();
      await seed({ id, name: 'brave-tiger-a1b2c3', totalCount: 5 });

      const found = await sut.findById(id);

      expect(found).toStrictEqual(
        Object.assign(new BatchEntity(), {
          id,
          name: 'brave-tiger-a1b2c3',
          totalCount: 5,
          status: BatchStatus.PENDING,
          succeededCount: 0,
          failedCount: 0,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('When findById is called', () => {
    describe('And no batch exists with that id', () => {
      test('Then it returns null', async () => {
        const result = await sut.findById(randomUUID());

        expect(result).toBeNull();
      });
    });
  });

  describe('When setStatus is called', () => {
    test('Then it updates the status and advances updatedAt past its prior value', async () => {
      const batch = await seed();
      const originalUpdatedAt = batch.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 5));
      await sut.setStatus(batch.id, BatchStatus.RUNNING);

      const found = await sut.findById(batch.id);
      expect(found?.status).toBe(BatchStatus.RUNNING);
      expect(found?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('When incrementSucceeded is called', () => {
    describe('And the batch is not yet fully accounted for', () => {
      test('Then it increments succeededCount and leaves status unchanged', async () => {
        const batch = await seed({ totalCount: 2 });

        await sut.incrementSucceeded(batch.id);

        const found = await sut.findById(batch.id);
        expect(found?.succeededCount).toBe(1);
        expect(found?.status).toBe(BatchStatus.PENDING);
      });
    });

    describe('And succeeded plus failed now reaches totalCount', () => {
      test('Then it flips status to completed', async () => {
        const batch = await seed({ totalCount: 1 });

        await sut.incrementSucceeded(batch.id);

        const found = await sut.findById(batch.id);
        expect(found?.succeededCount).toBe(1);
        expect(found?.status).toBe(BatchStatus.COMPLETED);
      });
    });
  });

  describe('When incrementFailed is called', () => {
    test('Then it increments failedCount', async () => {
      const batch = await seed({ totalCount: 3 });

      await sut.incrementFailed(batch.id);

      const found = await sut.findById(batch.id);
      expect(found?.failedCount).toBe(1);
    });
  });

  describe('When decrementFailed is called', () => {
    test('Then it subtracts the given count from failedCount', async () => {
      const batch = await seed({ totalCount: 5 });
      await sut.incrementFailed(batch.id);
      await sut.incrementFailed(batch.id);

      await sut.decrementFailed(batch.id, 2);

      const found = await sut.findById(batch.id);
      expect(found?.failedCount).toBe(0);
    });
  });

  describe('When listPage is called', () => {
    describe('And there are fewer batches than the page limit', () => {
      test('Then it returns all of them with hasMore false', async () => {
        await seed({ name: 'a-first' });
        await seed({ name: 'b-second' });

        const [batches, hasMore] = await sut.listPage(null, 10);

        expect(batches).toHaveLength(2);
        expect(hasMore).toBe(false);
      });
    });

    describe('And there are more batches than the page limit', () => {
      test('Then it returns only the limit and reports hasMore true', async () => {
        await seed({ name: 'a-first' });
        await seed({ name: 'b-second' });
        await seed({ name: 'c-third' });

        const [batches, hasMore] = await sut.listPage(null, 2);

        expect(batches).toHaveLength(2);
        expect(hasMore).toBe(true);
      });
    });
  });
});
