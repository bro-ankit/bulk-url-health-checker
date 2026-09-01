import { BatchStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchRepository } from '../../../src/batches/repositories/batch.repository';
import { mockBatchEntity } from '../../__mocks__';
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

  const seed = async (overrides: Parameters<typeof mockBatchEntity>[0] = {}) => {
    const batch = mockBatchEntity({ succeededCount: 0, failedCount: 0, ...overrides });
    sut.getEntityManager().persist(batch);
    await sut.getEntityManager().flush();
    return batch;
  };

  describe('When findById is called', () => {
    describe('And no batch exists with that id', () => {
      test('Then it returns null', async () => {
        const batch = mockBatchEntity();

        const result = await sut.findById(batch.id);

        expect(result).toBeNull();
      });
    });

    describe('And a prior raw update already ran against that id in the same EntityManager', () => {
      test('Then it returns the freshly written row, not the stale identity-map copy', async () => {
        const batch = await seed({ totalCount: 5 });

        await sut.incrementSucceeded(batch.id);
        const found = await sut.findById(batch.id);

        expect(found?.succeededCount).toBe(1);
      });
    });
  });

  describe('When incrementSucceeded is called', () => {
    describe('And the batch is not yet fully accounted for', () => {
      test('Then it increments succeededCount and leaves status unchanged', async () => {
        const batch = await seed({ status: BatchStatus.RUNNING, totalCount: 2 });

        await sut.incrementSucceeded(batch.id);

        const found = await sut.findById(batch.id);
        expect(found?.succeededCount).toBe(1);
        expect(found?.status).toBe(BatchStatus.RUNNING);
      });
    });

    describe('And succeeded plus failed now reaches totalCount', () => {
      test('Then it flips status to completed', async () => {
        const batch = await seed({ status: BatchStatus.RUNNING, totalCount: 1 });

        await sut.incrementSucceeded(batch.id);

        const found = await sut.findById(batch.id);
        expect(found?.succeededCount).toBe(1);
        expect(found?.status).toBe(BatchStatus.COMPLETED);
      });
    });
  });

  describe('When incrementFailed is called', () => {
    test('Then it increments failedCount', async () => {
      const batch = await seed({ status: BatchStatus.RUNNING, totalCount: 3 });

      await sut.incrementFailed(batch.id);

      const found = await sut.findById(batch.id);
      expect(found?.failedCount).toBe(1);
    });

    describe('And succeeded plus failed now reaches totalCount', () => {
      test('Then it flips status to completed too, since completion does not require success', async () => {
        const batch = await seed({ status: BatchStatus.RUNNING, totalCount: 1 });

        await sut.incrementFailed(batch.id);

        const found = await sut.findById(batch.id);
        expect(found?.failedCount).toBe(1);
        expect(found?.status).toBe(BatchStatus.COMPLETED);
      });
    });
  });
});
