import { randomUUID } from 'node:crypto';

import { BatchEntity, BatchStatus } from '@bulk-url-health-checker/shared-contracts';

export const mockBatchEntity = (args: Partial<BatchEntity> = {}): BatchEntity =>
  Object.assign(new BatchEntity(), {
    id: randomUUID(),
    name: 'brave-tiger-a1b2c3',
    status: BatchStatus.RUNNING,
    totalCount: 10,
    succeededCount: 6,
    failedCount: 4,
    createdAt: new Date('2026-08-31T00:00:00.000Z'),
    updatedAt: new Date('2026-08-31T00:00:00.000Z'),
    ...args,
  });
