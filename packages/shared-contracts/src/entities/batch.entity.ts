import type { Opt } from '@mikro-orm/core';
import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import type { UUID } from 'node:crypto';

import { BatchStatus } from './batch.constants';

@Entity({ tableName: 'batches' })
export class BatchEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: UUID;

  @Property({ type: 'text', unique: true })
  name!: string;

  @Enum({ items: () => BatchStatus, type: 'string' })
  status: Opt<BatchStatus> = BatchStatus.PENDING;

  @Property({ type: 'integer' })
  totalCount!: number;

  @Property({ type: 'integer', default: 0 })
  succeededCount: Opt<number> = 0;

  @Property({ type: 'integer', default: 0 })
  failedCount: Opt<number> = 0;

  @Property({ type: 'datetime' })
  createdAt: Opt<Date> = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Opt<Date> = new Date();
}
