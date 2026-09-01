import { BATCH_CONSTANTS } from '../entities/batch.constants';

export class BatchListCacheKeyUtil {
  static build(cursor: string | undefined, limit: number = BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE): string {
    return `${BATCH_CONSTANTS.BATCH_LIST_CACHE_KEY}:${cursor ?? 'first'}:${limit}`;
  }
}
