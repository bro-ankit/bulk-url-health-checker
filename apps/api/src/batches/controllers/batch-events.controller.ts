import type { MessageEvent } from '@nestjs/common';
import { Controller, Headers, Inject, Param, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { plainToInstance } from 'class-transformer';
import type Redis from 'ioredis';
import type { UUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { takeWhile } from 'rxjs';

import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { SseEnvelope } from '../../sse/redis-channel-sse-stream.util';
import { RedisChannelSseStreamUtil } from '../../sse/redis-channel-sse-stream.util';
import { SseCursorUtil } from '../../sse/sse-cursor.util';
import type { BatchEntity } from '@bulk-url-health-checker/shared-contracts';
import {
  BatchEventEnvelopeDto,
  BatchStatus,
  BATCH_CONSTANTS,
  validateAndTransformInstance,
} from '@bulk-url-health-checker/shared-contracts';
import { BatchDto } from '../dto/batch.dto';
import { UrlCheckResultDto } from '../dto/url-check-result.dto';
import { GetBatchUpdatesSinceQuery } from '../queries/get-batch-updates-since/get-batch-updates-since.query';
import type { GetBatchUpdatesSinceQueryResult } from '../queries/get-batch-updates-since/get-batch-updates-since.query-handler';
import { GetBatchQuery } from '../queries/get-batch/get-batch.query';

@ApiTags('batches')
@Controller('batches')
export class BatchEventsController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Sse(':batchId/events')
  events(@Param('batchId') batchId: UUID, @Headers('last-event-id') lastEventId?: string): Observable<MessageEvent> {
    return RedisChannelSseStreamUtil.build({
      redis: this.redis,
      channel: `${BATCH_CONSTANTS.BATCH_EVENTS_CHANNEL_PREFIX}${batchId}`,
      lastEventId,
      getFullSnapshot: () => this.buildFullSnapshot(batchId),
      getUpdatesSince: (cursor) => this.buildUpdatesSince(batchId, cursor),
      // Must stay `async`: a malformed message makes JSON.parse throw synchronously, and the
      // util's caller only wraps this call in `.then().catch()`, which never sees a throw that
      // happens before a promise is even returned. Declaring this async turns that synchronous
      // throw into a rejection so the intended "drop malformed messages" behavior actually holds.
      parseMessage: async (raw) => validateAndTransformInstance(BatchEventEnvelopeDto, JSON.parse(raw)),
    }).pipe(takeWhile((event) => !this.isTerminalEvent(event), true));
  }

  private isTerminalEvent(event: MessageEvent): boolean {
    const data = event.data as {
      status?: BatchStatus;
      batch?: { status?: BatchStatus };
    };
    const status = data.status ?? data.batch?.status;

    return status === BatchStatus.COMPLETED || status === BatchStatus.CANCELLED;
  }

  private async buildFullSnapshot(batchId: UUID): Promise<SseEnvelope<object>> {
    const batch = await this.queryBus.execute<GetBatchQuery, BatchEntity>(new GetBatchQuery(batchId));
    const data = plainToInstance(BatchDto, batch, {
      excludeExtraneousValues: true,
    });

    return { id: SseCursorUtil.encode(batch.id, batch.updatedAt), data };
  }

  private async buildUpdatesSince(batchId: UUID, cursor: string): Promise<SseEnvelope<object>[]> {
    const sinceIso = SseCursorUtil.extractTimestamp(cursor);
    const result = await this.queryBus.execute<GetBatchUpdatesSinceQuery, GetBatchUpdatesSinceQueryResult>(
      new GetBatchUpdatesSinceQuery(batchId, sinceIso),
    );
    if (!result) return [];

    const batchSummary = plainToInstance(BatchDto, result.batch, {
      excludeExtraneousValues: true,
    });

    return result.changedUrls.map((url) => ({
      id: SseCursorUtil.encode(url.id, url.updatedAt),
      data: {
        batch: batchSummary,
        url: plainToInstance(UrlCheckResultDto, url, {
          excludeExtraneousValues: true,
        }),
      },
    }));
  }
}
