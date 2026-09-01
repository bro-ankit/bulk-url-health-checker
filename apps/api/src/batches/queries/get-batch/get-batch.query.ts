import type { UUID } from 'node:crypto';

export class GetBatchQuery {
  constructor(public readonly batchId: UUID) {}
}
