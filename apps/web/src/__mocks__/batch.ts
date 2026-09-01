import type { BatchDto } from '@/lib/__generated__/api';

export const mockBatchDto = (args: Partial<BatchDto> = {}): BatchDto => ({
  id: 'batch-1',
  name: 'brave-tiger-a1b2c3',
  status: 'running',
  totalCount: 10,
  succeededCount: 6,
  failedCount: 1,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
  ...args,
});
