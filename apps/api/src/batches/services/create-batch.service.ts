import { Transactional } from '@mikro-orm/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { UUID } from 'node:crypto';
import { randomBytes, randomUUID } from 'node:crypto';

import type { AppLoggerService, CheckUrlJobDto } from '@bulk-url-health-checker/shared-contracts';
import {
  BATCH_CONSTANTS,
  BatchListCacheKeyUtil,
  BatchStatus,
  InjectLogger,
} from '@bulk-url-health-checker/shared-contracts';
import { CacheProviderService } from '../../cache/cache-provider.service';
import { BatchRepository } from '../repositories/batch.repository';
import { UrlRepository } from '../repositories/url.repository';
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';

type PersistedBatch = {
  batchId: UUID;
  urlEntries: { id: UUID; url: string }[];
};

@Injectable()
export class CreateBatchService {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(
    private readonly batchRepository: BatchRepository,
    private readonly urlRepository: UrlRepository,
    @InjectQueue(BATCH_CONSTANTS.CHECK_QUEUE_NAME)
    private readonly checkQueue: Queue<CheckUrlJobDto>,
    private readonly cacheProvider: CacheProviderService,
  ) {}

  async createFromUrls(urls: string[]) {
    this.logger.info({ urlCount: urls.length }, 'Creating batch from urls');

    const { batchId, urlEntries } = await this.persistBatch(urls);

    await this.checkQueue.addBulk(
      urlEntries.map((entry) => ({
        name: BATCH_CONSTANTS.CHECK_JOB_NAME,
        data: { urlId: entry.id, batchId, url: entry.url },
        opts: { jobId: entry.id },
      })),
    );

    await this.batchRepository.setStatus(batchId, BatchStatus.RUNNING);
    await this.cacheProvider.delKey(BatchListCacheKeyUtil.build(undefined, BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE));

    return batchId;
  }

  @Transactional()
  private async persistBatch(urls: string[]): Promise<PersistedBatch> {
    const name = this.generateName();
    const batch = this.batchRepository.save(randomUUID(), name, urls.length);
    const urlEntities = this.urlRepository.saveMany(
      batch,
      urls.map((url) => ({ id: randomUUID(), url })),
    );

    return {
      batchId: batch.id,
      urlEntries: urlEntities.map((url) => ({ id: url.id, url: url.url })),
    };
  }

  private generateName(): string {
    const name = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: '-',
      length: 2,
    });
    const suffix = randomBytes(3).toString('hex');

    return `${name}-${suffix}`;
  }
}
