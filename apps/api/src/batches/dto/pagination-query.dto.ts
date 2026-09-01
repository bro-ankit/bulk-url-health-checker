import { ApiPropertyOptional } from '@nestjs/swagger';
import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: BATCH_CONSTANTS.DEFAULT_URL_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BATCH_CONSTANTS.MAX_URL_PAGE_SIZE)
  pageSize: number = BATCH_CONSTANTS.DEFAULT_URL_PAGE_SIZE;
}
