import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { UUID } from 'node:crypto';

import {
  BATCH_CONSTANTS,
  BatchEventEnvelopeDto,
  validateAndTransformInstance,
} from '@bulk-url-health-checker/shared-contracts';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class BatchEventsPublisher {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(batchId: UUID, envelope: BatchEventEnvelopeDto): Promise<void> {
    const validated = await validateAndTransformInstance(BatchEventEnvelopeDto, envelope);

    await this.redis.publish(`${BATCH_CONSTANTS.BATCH_EVENTS_CHANNEL_PREFIX}${batchId}`, JSON.stringify(validated));
  }
}
