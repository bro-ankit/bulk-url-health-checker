import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'node:crypto';

import { UrlCheckStatus, UrlEntity } from '@bulk-url-health-checker/shared-contracts';

type UrlCheckOutcome = {
  httpStatusCode: number;
  responseTimeMs: number;
  pageTitle: string | null;
};

@Injectable()
export class UrlRepository extends EntityRepository<UrlEntity> {
  constructor(em: EntityManager) {
    super(em, UrlEntity);
  }

  findById(id: UUID): Promise<UrlEntity | null> {
    // markSucceeded/markFailed go through nativeUpdate, which bypasses the unit of work, so the
    // identity map is never updated by them. Without refresh, publishBatchUrlUpdate's findById
    // (called right after mark*() in the same job's request context) would publish a stale
    // pre-update url over SSE instead of the just-written one.
    return this.findOne({ id }, { refresh: true });
  }

  async markSucceeded(id: UUID, attempts: number, outcome: UrlCheckOutcome): Promise<void> {
    await this.nativeUpdate(
      { id },
      {
        status: UrlCheckStatus.SUCCEEDED,
        attempts,
        httpStatusCode: outcome.httpStatusCode,
        responseTimeMs: outcome.responseTimeMs,
        pageTitle: outcome.pageTitle,
        errorMessage: null,
        updatedAt: new Date(),
      },
    );
  }

  async markFailed(id: UUID, attempts: number, errorMessage: string): Promise<void> {
    await this.nativeUpdate(
      { id },
      {
        status: UrlCheckStatus.FAILED,
        attempts,
        errorMessage,
        updatedAt: new Date(),
      },
    );
  }
}
