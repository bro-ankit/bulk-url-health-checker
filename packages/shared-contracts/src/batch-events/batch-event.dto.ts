import { Expose, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import type { UUID } from 'node:crypto';

import { BatchStatus, UrlCheckStatus } from '../entities/batch.constants';

export class BatchEventSummaryDto {
  @Expose()
  @IsUUID()
  id!: UUID;

  @Expose()
  @IsEnum(BatchStatus)
  status!: BatchStatus;

  @Expose()
  @IsInt()
  totalCount!: number;

  @Expose()
  @IsInt()
  succeededCount!: number;

  @Expose()
  @IsInt()
  failedCount!: number;
}

export class UrlEventSummaryDto {
  @Expose()
  @IsUUID()
  id!: UUID;

  @Expose()
  @IsString()
  url!: string;

  @Expose()
  @IsEnum(UrlCheckStatus)
  status!: UrlCheckStatus;

  @Expose()
  @IsOptional()
  @IsNumber()
  httpStatusCode!: number | null;

  @Expose()
  @IsOptional()
  @IsNumber()
  responseTimeMs!: number | null;

  @Expose()
  @IsOptional()
  @IsString()
  pageTitle!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  errorMessage!: string | null;
}

export class BatchEventDataDto {
  @Expose()
  @ValidateNested()
  @Type(() => BatchEventSummaryDto)
  batch!: BatchEventSummaryDto;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => UrlEventSummaryDto)
  url?: UrlEventSummaryDto;
}

export class BatchEventEnvelopeDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @ValidateNested()
  @Type(() => BatchEventDataDto)
  data!: BatchEventDataDto;
}
