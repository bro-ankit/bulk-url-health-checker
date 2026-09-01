import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import type { BatchEntity, UrlEntity } from '@bulk-url-health-checker/shared-contracts';

import { BatchRepository } from '../../repositories/batch.repository';
import { UrlRepository } from '../../repositories/url.repository';
import { GetBatchUpdatesSinceQuery } from './get-batch-updates-since.query';

export type GetBatchUpdatesSinceQueryResult = {
  batch: BatchEntity;
  changedUrls: UrlEntity[];
} | null;

@QueryHandler(GetBatchUpdatesSinceQuery)
export class GetBatchUpdatesSinceQueryHandler implements IQueryHandler<
  GetBatchUpdatesSinceQuery,
  GetBatchUpdatesSinceQueryResult
> {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly urlRepository: UrlRepository,
  ) {}

  async execute(query: GetBatchUpdatesSinceQuery): Promise<GetBatchUpdatesSinceQueryResult> {
    const changedUrls = await this.urlRepository.findUpdatedSince(query.batchId, query.sinceIso);
    if (changedUrls.length === 0) return null;

    const batch = await this.batchRepository.findById(query.batchId);
    if (!batch) return null;

    return { batch, changedUrls };
  }
}
