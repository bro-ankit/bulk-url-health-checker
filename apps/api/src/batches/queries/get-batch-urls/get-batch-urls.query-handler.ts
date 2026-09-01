import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import type { UrlEntity } from '@bulk-url-health-checker/shared-contracts';

import { BatchRepository } from '../../repositories/batch.repository';
import { UrlRepository } from '../../repositories/url.repository';
import { GetBatchUrlsQuery } from './get-batch-urls.query';

export type GetBatchUrlsQueryResult = {
  urls: UrlEntity[];
  total: number;
  page: number;
  pageSize: number;
};

@QueryHandler(GetBatchUrlsQuery)
export class GetBatchUrlsQueryHandler implements IQueryHandler<GetBatchUrlsQuery, GetBatchUrlsQueryResult> {
  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly urlRepository: UrlRepository,
  ) {}

  async execute(query: GetBatchUrlsQuery): Promise<GetBatchUrlsQueryResult> {
    const batch = await this.batchRepository.findById(query.batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${query.batchId} not found`);
    }

    const [urls, total] = await this.urlRepository.findByBatchIdPaginated(query.batchId, query.page, query.pageSize);

    return { urls, total, page: query.page, pageSize: query.pageSize };
  }
}
