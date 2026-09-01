import { UrlCheckStatus } from '@bulk-url-health-checker/shared-contracts';
import { UrlRepository } from '../../../src/batches/repositories/url.repository';
import { mockUrlEntity } from '../../__mocks__';
import { DatabaseTestEnvironment } from '../../helpers/database-test-environment';

describe('Given UrlRepository', () => {
  const env = new DatabaseTestEnvironment();
  let sut: UrlRepository;

  beforeAll(async () => {
    await env.start();
  }, 60_000);

  afterAll(async () => {
    await env.stop();
  });

  beforeEach(async () => {
    await env.clear();
    sut = new UrlRepository(env.orm.em.fork());
  });

  const seed = async (overrides: Parameters<typeof mockUrlEntity>[0] = {}) => {
    const url = mockUrlEntity(overrides);
    sut.getEntityManager().persist(url.batch);
    sut.getEntityManager().persist(url);
    await sut.getEntityManager().flush();
    return url;
  };

  describe('When findById is called', () => {
    describe('And no url exists with that id', () => {
      test('Then it returns null', async () => {
        const url = mockUrlEntity();

        const result = await sut.findById(url.id);

        expect(result).toBeNull();
      });
    });
  });

  describe('When markSucceeded is called', () => {
    test('Then it records the check outcome and clears any prior error, and a findById in the same EntityManager sees it, not a stale identity-map copy', async () => {
      const url = await seed({ status: UrlCheckStatus.QUEUED, errorMessage: null });

      await sut.markSucceeded(url.id, 1, { httpStatusCode: 200, responseTimeMs: 120, pageTitle: 'Example' });

      const found = await sut.findById(url.id);
      expect(found?.status).toBe(UrlCheckStatus.SUCCEEDED);
      expect(found?.attempts).toBe(1);
      expect(found?.httpStatusCode).toBe(200);
      expect(found?.responseTimeMs).toBe(120);
      expect(found?.pageTitle).toBe('Example');
      expect(found?.errorMessage).toBeNull();
    });
  });

  describe('When markFailed is called', () => {
    test('Then it records the failure and attempt count, and a findById in the same EntityManager sees it, not a stale identity-map copy', async () => {
      const url = await seed({ status: UrlCheckStatus.QUEUED });

      await sut.markFailed(url.id, 3, 'connection timed out');

      const found = await sut.findById(url.id);
      expect(found?.status).toBe(UrlCheckStatus.FAILED);
      expect(found?.attempts).toBe(3);
      expect(found?.errorMessage).toBe('connection timed out');
    });
  });
});
