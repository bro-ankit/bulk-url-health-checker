import { ApiPropertyOptional } from '@nestjs/swagger';
import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description: "Opaque cursor from a previous page's nextCursor",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BATCH_CONSTANTS.MAX_BATCH_PAGE_SIZE)
  limit: number = BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE;
}
