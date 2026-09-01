import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { UUID } from 'node:crypto';

import { UrlCheckStatus } from '@bulk-url-health-checker/shared-contracts';

export class UrlCheckResultDto {
  @ApiProperty()
  @Expose()
  id!: UUID;

  @ApiProperty()
  @Expose()
  url!: string;

  @ApiProperty({ enum: UrlCheckStatus })
  @Expose()
  status!: UrlCheckStatus;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  httpStatusCode!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  responseTimeMs!: number | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  pageTitle!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  errorMessage!: string | null;
}
