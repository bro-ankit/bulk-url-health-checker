import type { UUID } from 'node:crypto';

export class GetBatchUrlsQuery {
  constructor(
    public readonly batchId: UUID,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}
