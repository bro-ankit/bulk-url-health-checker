import { raw } from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'node:crypto';

import { BatchEntity, BatchStatus } from '@bulk-url-health-checker/shared-contracts';

import type { BatchListCursor } from '../utils/batch-list-cursor/batch-list-cursor.types';

type OutcomeProperty = 'succeededCount' | 'failedCount';

@Injectable()
export class BatchRepository extends EntityRepository<BatchEntity> {
  constructor(em: EntityManager) {
    super(em, BatchEntity);
  }

  save(id: UUID, name: string, totalCount: number): BatchEntity {
    const batch = this.create({ id, totalCount, name });
    this.getEntityManager().persist(batch);
    return batch;
  }

  findById(id: UUID): Promise<BatchEntity | null> {
    // `refresh: true` is required, not defensive: setStatus/incrementOutcome/decrementFailed all
    // go through nativeUpdate/createQueryBuilder, which bypass the unit of work entirely, so the
    // identity map's cached entity is never updated by them. Without refresh, a findById called
    // later in the same request (e.g. to build an SSE payload right after a status change) would
    // silently return the pre-update entity instead of hitting the database.
    return this.findOne({ id }, { refresh: true });
  }

  async listPage(cursor: BatchListCursor | null, limit: number): Promise<[BatchEntity[], boolean]> {
    const where = cursor
      ? {
          $or: [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, name: { $lt: cursor.name } }],
        }
      : {};

    const rows = await this.find(where, {
      orderBy: [{ createdAt: 'DESC' }, { name: 'DESC' }],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    return [hasMore ? rows.slice(0, limit) : rows, hasMore];
  }

  async setStatus(id: UUID, status: BatchStatus): Promise<void> {
    // nativeUpdate bypasses the unit of work, so the entity's onUpdate hook for updatedAt never
    // fires here, it must be set explicitly or the column stays frozen at createdAt forever.
    await this.nativeUpdate({ id }, { status, updatedAt: new Date() });
  }

  incrementSucceeded(id: UUID): Promise<number> {
    return this.incrementOutcome(id, 'succeededCount');
  }

  incrementFailed(id: UUID): Promise<number> {
    return this.incrementOutcome(id, 'failedCount');
  }

  async decrementFailed(id: UUID, count: number): Promise<void> {
    const failedColumn = this.columnName('failedCount');

    await this.createQueryBuilder()
      .update({
        failedCount: raw(`${failedColumn} - ${count}`),
        updatedAt: new Date(),
      })
      .where({ id })
      .execute();
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

    return this.createQueryBuilder()
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
