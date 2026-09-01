import type { BatchListCursor } from './batch-list-cursor.types';

export class BatchListCursorUtil {
  static encode(cursor: BatchListCursor): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: cursor.createdAt.toISOString(),
        name: cursor.name,
      }),
    ).toString('base64url');
  }

  static decode(encoded: string): BatchListCursor {
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
        createdAt: string;
        name: string;
      };
      return { createdAt: new Date(parsed.createdAt), name: parsed.name };
    } catch {
      throw new Error('Invalid pagination cursor');
    }
  }
}
