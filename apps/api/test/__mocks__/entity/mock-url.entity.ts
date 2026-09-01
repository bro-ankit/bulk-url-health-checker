import { randomUUID } from 'node:crypto';

import { UrlCheckStatus, UrlEntity } from '@bulk-url-health-checker/shared-contracts';

import { mockBatchEntity } from './mock-batch.entity';

export const mockUrlEntity = (args: Partial<UrlEntity> = {}): UrlEntity =>
  Object.assign(new UrlEntity(), {
    id: randomUUID(),
    batch: mockBatchEntity(),
    url: 'https://example.com',
    status: UrlCheckStatus.FAILED,
    httpStatusCode: null,
    responseTimeMs: null,
    pageTitle: null,
    errorMessage: 'timed out',
    attempts: 3,
    createdAt: new Date('2026-08-31T00:00:00.000Z'),
    updatedAt: new Date('2026-08-31T00:00:00.000Z'),
    ...args,
  });
