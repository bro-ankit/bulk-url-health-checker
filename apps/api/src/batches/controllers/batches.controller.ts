import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { BatchEntity } from '@bulk-url-health-checker/shared-contracts';
import { plainToInstance } from 'class-transformer';
import type { UUID } from 'node:crypto';

import { CancelBatchCommand } from '../commands/cancel-batch/cancel-batch.command';
import { CompleteUrlUploadCommand } from '../commands/complete-url-upload/complete-url-upload.command';
import { CreateBatchCommand } from '../commands/create-batch/create-batch.command';
import { RequestUrlUploadCommand } from '../commands/request-url-upload/request-url-upload.command';
import { RetryFailedBatchCommand } from '../commands/retry-failed-batch/retry-failed-batch.command';
import { BatchDto } from '../dto/batch.dto';
import { CompleteUrlUploadRequestDto } from '../dto/complete-url-upload-request.dto';
import { CreateBatchFromUrlsRequestDto } from '../dto/create-batch-from-urls-request.dto';
import { CreateBatchResponseDto } from '../dto/create-batch-response.dto';
import { CursorPaginationQueryDto } from '../dto/cursor-pagination-query.dto';
import { ListBatchesResponseDto } from '../dto/list-batches-response.dto';
import { PaginatedUrlsResponseDto } from '../dto/paginated-urls-response.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { RequestUrlUploadRequestDto } from '../dto/request-url-upload.dto';
import { RequestUrlUploadResponseDto } from '../dto/request-url-upload.dto';
import { GetBatchUrlsQuery } from '../queries/get-batch-urls/get-batch-urls.query';
import type { GetBatchUrlsQueryResult } from '../queries/get-batch-urls/get-batch-urls.query-handler';
import { ListBatchesQuery } from '../queries/list-batches/list-batches.query';
import type { PaginatedBatchesResult } from '../queries/list-batches/list-batches.query-handler';
import { GetBatchQuery } from '../queries/get-batch/get-batch.query';

@ApiTags('batches')
@Controller('batches')
export class BatchesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: CreateBatchResponseDto })
  createFromUrls(@Body() dto: CreateBatchFromUrlsRequestDto): Promise<CreateBatchResponseDto> {
    return this.commandBus.execute(new CreateBatchCommand(dto.urls));
  }

  @Post('urls/upload-request')
  @ApiCreatedResponse({ type: RequestUrlUploadResponseDto })
  requestUrlUpload(@Body() dto: RequestUrlUploadRequestDto): Promise<RequestUrlUploadResponseDto> {
    return this.commandBus.execute(new RequestUrlUploadCommand(dto.filename));
  }

  @Post('urls/complete')
  @ApiCreatedResponse({ type: CreateBatchResponseDto })
  completeUrlUpload(@Body() dto: CompleteUrlUploadRequestDto): Promise<CreateBatchResponseDto> {
    return this.commandBus.execute(new CompleteUrlUploadCommand(dto.objectKey));
  }

  @Get()
  @ApiOkResponse({ type: ListBatchesResponseDto })
  async list(@Query() pagination: CursorPaginationQueryDto): Promise<ListBatchesResponseDto> {
    const result = await this.queryBus.execute<ListBatchesQuery, PaginatedBatchesResult>(
      new ListBatchesQuery(pagination.cursor, pagination.limit),
    );
    return plainToInstance(ListBatchesResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':batchId')
  @ApiOkResponse({ type: BatchDto })
  async getOne(@Param('batchId') batchId: UUID): Promise<BatchDto> {
    const batch = await this.queryBus.execute<GetBatchQuery, BatchEntity>(new GetBatchQuery(batchId));
    return plainToInstance(BatchDto, batch, { excludeExtraneousValues: true });
  }

  @Get(':batchId/urls')
  @ApiOkResponse({ type: PaginatedUrlsResponseDto })
  async getUrls(
    @Param('batchId') batchId: UUID,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedUrlsResponseDto> {
    const result = await this.queryBus.execute<GetBatchUrlsQuery, GetBatchUrlsQueryResult>(
      new GetBatchUrlsQuery(batchId, pagination.page, pagination.pageSize),
    );
    return plainToInstance(PaginatedUrlsResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':batchId/cancel')
  async cancel(@Param('batchId') batchId: UUID): Promise<void> {
    await this.commandBus.execute(new CancelBatchCommand(batchId));
  }

  @Post(':batchId/retry-failed')
  async retryFailed(@Param('batchId') batchId: UUID): Promise<void> {
    await this.commandBus.execute(new RetryFailedBatchCommand(batchId));
  }
}
