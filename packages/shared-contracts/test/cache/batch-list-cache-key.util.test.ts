import { BATCH_CONSTANTS } from '../../src/entities/batch.constants';
import { BatchListCacheKeyUtil } from '../../src/cache/batch-list-cache-key.util';

describe('Given BatchListCacheKeyUtil', () => {
  describe('When build is called without a cursor', () => {
    describe('And no limit is provided', () => {
      test('Then it returns a key using "first" and the default page size', () => {
        const result = BatchListCacheKeyUtil.build(undefined);

        expect(result).toBe(`batches:list:first:20`);
      });
    });

    describe('And an explicit limit is provided', () => {
      test('Then it returns a key using "first" and that limit', () => {
        const result = BatchListCacheKeyUtil.build(undefined, 50);

        expect(result).toBe(`batches:list:first:50`);
      });
    });
  });

  describe('When build is called with a cursor', () => {
    test('Then it returns a key embedding that cursor and the default page size', () => {
      const result = BatchListCacheKeyUtil.build('2026-08-31T00:00:00.000Z|some-id');

      expect(result).toBe(`batches:list:2026-08-31T00:00:00.000Z|some-id:20`);
    });
  });
});
