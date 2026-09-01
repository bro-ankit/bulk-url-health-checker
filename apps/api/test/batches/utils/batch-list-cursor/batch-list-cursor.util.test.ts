import { BatchListCursorUtil } from '../../../../src/batches/utils/batch-list-cursor/batch-list-cursor.util';

describe('Given BatchListCursorUtil', () => {
  describe('When encode is called with a cursor', () => {
    test('Then it returns a base64url string decoding back to the same createdAt and name', () => {
      const cursor = { createdAt: new Date('2026-08-31T12:00:00.000Z'), name: 'brave-tiger-a1b2c3' };

      const result = BatchListCursorUtil.encode(cursor);

      expect(result).toBe(
        Buffer.from(JSON.stringify({ createdAt: '2026-08-31T12:00:00.000Z', name: 'brave-tiger-a1b2c3' })).toString(
          'base64url',
        ),
      );
    });
  });

  describe('When decode is called with a value produced by encode', () => {
    test('Then it returns the original createdAt and name', () => {
      const cursor = { createdAt: new Date('2026-08-31T12:00:00.000Z'), name: 'brave-tiger-a1b2c3' };
      const encoded = BatchListCursorUtil.encode(cursor);

      const result = BatchListCursorUtil.decode(encoded);

      expect(result).toStrictEqual(cursor);
    });
  });

  describe('When decode is called with a value that is not valid base64url JSON', () => {
    test('Then it throws "Invalid pagination cursor"', () => {
      expect(() => BatchListCursorUtil.decode('not-a-valid-cursor')).toThrow('Invalid pagination cursor');
    });
  });

  describe('When decode is called with valid base64url that is not JSON', () => {
    test('Then it throws "Invalid pagination cursor"', () => {
      const encoded = Buffer.from('plain text, not json').toString('base64url');

      expect(() => BatchListCursorUtil.decode(encoded)).toThrow('Invalid pagination cursor');
    });
  });
});
