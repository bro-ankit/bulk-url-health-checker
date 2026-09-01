import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { BatchDto } from './batch.dto';

export class ListBatchesResponseDto {
  @ApiProperty({ type: [BatchDto] })
  @Expose()
  @Type(() => BatchDto)
  batches!: BatchDto[];

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  nextCursor!: string | null;
}
