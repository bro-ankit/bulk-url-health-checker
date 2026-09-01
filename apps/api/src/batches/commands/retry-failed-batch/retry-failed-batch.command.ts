import type { UUID } from 'node:crypto';

export class RetryFailedBatchCommand {
  constructor(public readonly batchId: UUID) {}
}
