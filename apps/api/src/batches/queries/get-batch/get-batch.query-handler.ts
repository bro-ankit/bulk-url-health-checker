import type { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import type { AppLoggerService, BatchEntity } from '@bulk-url-health-checker/shared-contracts';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';

import { GetBatchQuery } from './get-batch.query';
import { BatchRepository } from '../../repositories/batch.repository';

@QueryHandler(GetBatchQuery)
export class GetBatchQueryHandler implements IQueryHandler<GetBatchQuery, BatchEntity> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(private readonly batchRepository: BatchRepository) {}

  async execute(query: GetBatchQuery): Promise<BatchEntity> {
    this.logger.info({ batchId: query.batchId }, 'Executing GetBatchQuery');

    const batch = await this.batchRepository.findById(query.batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${query.batchId} not found`);
    }

    return batch;
  }
}
