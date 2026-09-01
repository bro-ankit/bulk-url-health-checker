import type { UUID } from 'node:crypto';

export class SseCursorUtil {
  static encode(entityId: UUID, updatedAt: Date): string {
    return `${updatedAt.toISOString()}|${entityId}`;
  }

  static extractTimestamp(cursor: string): string {
    return cursor.split('|')[0] ?? cursor;
  }
}
