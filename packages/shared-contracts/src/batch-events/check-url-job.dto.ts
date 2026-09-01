import type { UUID } from 'node:crypto';

export class CheckUrlJobDto {
  urlId!: UUID;
  batchId!: UUID;
  url!: string;
}
