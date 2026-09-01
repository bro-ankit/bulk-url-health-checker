import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';

import { Cache } from '../../../cache/cache.decorator';
import type { BatchEntity } from '@bulk-url-health-checker/shared-contracts';
import { BATCH_CONSTANTS, BatchListCacheKeyUtil } from '@bulk-url-health-checker/shared-contracts';
import { BatchListCursorUtil } from '../../utils/batch-list-cursor/batch-list-cursor.util';
import { BatchRepository } from '../../repositories/batch.repository';
import { ListBatchesQuery } from './list-batches.query';

export type PaginatedBatchesResult = {
  batches: BatchEntity[];
  nextCursor: string | null;
};

@QueryHandler(ListBatchesQuery)
export class ListBatchesQueryHandler implements IQueryHandler<ListBatchesQuery, PaginatedBatchesResult> {
  constructor(private readonly batchRepository: BatchRepository) {}

  @Cache({
    key: (query: ListBatchesQuery) => BatchListCacheKeyUtil.build(query.cursor, query.limit),
    ttl: BATCH_CONSTANTS.BATCH_LIST_CACHE_TTL_SECONDS * 1000,
  })
  async execute(query: ListBatchesQuery): Promise<PaginatedBatchesResult> {
    const cursor = query.cursor ? BatchListCursorUtil.decode(query.cursor) : null;
    const [batches, hasMore] = await this.batchRepository.listPage(cursor, query.limit);

    const last = batches.at(-1);
    const nextCursor =
      hasMore && last
        ? BatchListCursorUtil.encode({
            createdAt: last.createdAt,
            name: last.name,
          })
        : null;

    return { batches, nextCursor };
  }
}
