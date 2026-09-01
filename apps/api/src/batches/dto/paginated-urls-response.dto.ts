import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { UrlCheckResultDto } from './url-check-result.dto';

export class PaginatedUrlsResponseDto {
  @ApiProperty({ type: [UrlCheckResultDto] })
  @Expose()
  @Type(() => UrlCheckResultDto)
  urls!: UrlCheckResultDto[];

  @ApiProperty()
  @Expose()
  total!: number;

  @ApiProperty()
  @Expose()
  page!: number;

  @ApiProperty()
  @Expose()
  pageSize!: number;
}
