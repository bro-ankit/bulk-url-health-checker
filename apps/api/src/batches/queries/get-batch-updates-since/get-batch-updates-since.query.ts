import type { UUID } from 'node:crypto';

export class GetBatchUpdatesSinceQuery {
  constructor(
    public readonly batchId: UUID,
    public readonly sinceIso: string,
  ) {}
}
