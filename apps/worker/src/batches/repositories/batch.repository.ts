import { raw } from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'node:crypto';

import { BatchEntity, BatchStatus } from '@bulk-url-health-checker/shared-contracts';

type OutcomeProperty = 'succeededCount' | 'failedCount';

@Injectable()
export class BatchRepository extends EntityRepository<BatchEntity> {
  constructor(em: EntityManager) {
    super(em, BatchEntity);
  }

  findById(id: UUID): Promise<BatchEntity | null> {
    // incrementSucceeded/incrementFailed go through a raw query builder update, which bypasses
    // the unit of work, so the identity map is never updated by them. Without refresh,
    // publishBatchUrlUpdate's findById (called right after increment*() in the same job's request
    // context) would publish a stale pre-update batch summary over SSE instead of the just-written
    // counts/status.
    return this.findOne({ id }, { refresh: true });
  }

  incrementSucceeded(id: UUID): Promise<number> {
    return this.incrementOutcome(id, 'succeededCount');
  }

  incrementFailed(id: UUID): Promise<number> {
    return this.incrementOutcome(id, 'failedCount');
  }

  private columnName(property: keyof BatchEntity): string {
    return this.getEntityManager().getMetadata().get(BatchEntity).properties[property].fieldNames[0];
  }

  private async incrementOutcome(id: UUID, property: OutcomeProperty): Promise<number> {
    const outcomeColumn = this.columnName(property);
    const succeededColumn = this.columnName('succeededCount');
    const failedColumn = this.columnName('failedCount');
    const totalColumn = this.columnName('totalCount');
    const statusColumn = this.columnName('status');

    return this.getEntityManager()
      .createQueryBuilder(BatchEntity)
      .update({
        [property]: raw(`${outcomeColumn} + 1`),
        status: raw(
          `CASE WHEN ${succeededColumn} + ${failedColumn} + 1 >= ${totalColumn} THEN ? ELSE ${statusColumn} END`,
          [BatchStatus.COMPLETED],
        ),
        updatedAt: new Date(),
      })
      .where({ id })
      .execute();
  }
}
