import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'node:crypto';

import type { BatchEntity } from '@bulk-url-health-checker/shared-contracts';
import { UrlCheckStatus, UrlEntity } from '@bulk-url-health-checker/shared-contracts';

@Injectable()
export class UrlRepository extends EntityRepository<UrlEntity> {
  constructor(em: EntityManager) {
    super(em, UrlEntity);
  }

  saveMany(batch: BatchEntity, urlEntries: { id: UUID; url: string }[]): UrlEntity[] {
    const entities = urlEntries.map(({ id, url }) => this.create({ id, batch, url }));
    this.getEntityManager().persist(entities);
    return entities;
  }

  findById(id: UUID): Promise<UrlEntity | null> {
    // See BatchRepository.findById: nativeUpdate calls in this repository bypass the unit of
    // work, so a findById later in the same request must refresh or it returns stale data.
    return this.findOne({ id }, { refresh: true });
  }

  findByBatchId(batchId: UUID): Promise<UrlEntity[]> {
    return this.find({ batch: batchId }, { orderBy: { createdAt: 'ASC' } });
  }

  findByBatchIdPaginated(batchId: UUID, page: number, pageSize: number): Promise<[UrlEntity[], number]> {
    return this.findAndCount(
      { batch: batchId },
      {
        orderBy: { createdAt: 'ASC' },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    );
  }

  findUpdatedSince(batchId: UUID, sinceIso: string): Promise<UrlEntity[]> {
    return this.find({ batch: batchId, updatedAt: { $gt: new Date(sinceIso) } }, { orderBy: { updatedAt: 'ASC' } });
  }

  findFailedByBatchId(batchId: UUID): Promise<UrlEntity[]> {
    return this.find({ batch: batchId, status: UrlCheckStatus.FAILED });
  }

  async markQueuedAsCancelledForBatch(batchId: UUID): Promise<void> {
    // nativeUpdate bypasses the unit of work, so the entity's onUpdate hook for updatedAt never
    // fires here, it must be set explicitly or the column stays frozen at createdAt forever.
    await this.nativeUpdate(
      { batch: batchId, status: UrlCheckStatus.QUEUED },
      { status: UrlCheckStatus.CANCELLED, updatedAt: new Date() },
    );
  }

  async resetToQueued(ids: UUID[]): Promise<void> {
    if (ids.length === 0) return;

    await this.nativeUpdate(
      { id: { $in: ids } },
      {
        status: UrlCheckStatus.QUEUED,
        httpStatusCode: null,
        responseTimeMs: null,
        pageTitle: null,
        errorMessage: null,
        attempts: 0,
        updatedAt: new Date(),
      },
    );
  }
}
