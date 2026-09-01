import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { UUID } from 'node:crypto';

export class CreateBatchResponseDto {
  @ApiProperty()
  @Expose()
  batchId!: UUID;

  @ApiPropertyOptional({
    description: 'Rows that failed URL validation and were skipped (CSV path only)',
  })
  @Expose()
  malformedRowCount?: number;
}
