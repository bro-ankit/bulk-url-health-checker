import type { Opt } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import type { UUID } from 'node:crypto';

import { BatchEntity } from './batch.entity';
import { UrlCheckStatus } from './batch.constants';

@Entity({ tableName: 'urls' })
export class UrlEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: UUID;

  @ManyToOne(() => BatchEntity, { deleteRule: 'cascade' })
  @Index()
  batch!: BatchEntity;

  @Property({ type: 'text' })
  url!: string;

  @Enum({ items: () => UrlCheckStatus, type: 'string' })
  @Index()
  status: Opt<UrlCheckStatus> = UrlCheckStatus.QUEUED;

  @Property({ type: 'integer', nullable: true })
  httpStatusCode: Opt<number> | null = null;

  @Property({ type: 'integer', nullable: true })
  responseTimeMs: Opt<number> | null = null;

  @Property({ type: 'text', nullable: true })
  pageTitle: Opt<string> | null = null;

  @Property({ type: 'text', nullable: true })
  errorMessage: Opt<string> | null = null;

  @Property({ type: 'integer', default: 0 })
  attempts: Opt<number> = 0;

  @Property({ type: 'datetime' })
  createdAt: Opt<Date> = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Opt<Date> = new Date();
}
