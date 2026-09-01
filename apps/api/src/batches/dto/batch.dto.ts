import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { UUID } from 'node:crypto';

import { BatchStatus } from '@bulk-url-health-checker/shared-contracts';

export class BatchDto {
  @ApiProperty()
  @Expose()
  id!: UUID;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ enum: BatchStatus })
  @Expose()
  status!: BatchStatus;

  @ApiProperty()
  @Expose()
  totalCount!: number;

  @ApiProperty()
  @Expose()
  succeededCount!: number;

  @ApiProperty()
  @Expose()
  failedCount!: number;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
