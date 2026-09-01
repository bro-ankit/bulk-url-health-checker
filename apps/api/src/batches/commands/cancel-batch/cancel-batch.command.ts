import type { UUID } from 'node:crypto';

export class CancelBatchCommand {
  constructor(public readonly batchId: UUID) {}
}
