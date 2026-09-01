import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

const ACQUIRE_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current < tonumber(ARGV[1]) then
  redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0
`;

const RELEASE_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current > 0 then
  redis.call('DECR', KEYS[1])
end
return 1
`;

const SEMAPHORE_TTL_SECONDS = 60;
const ACQUIRE_POLL_INTERVAL_MS = 50;

@Injectable()
export class RedisSemaphoreService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquire(key: string, limit: number): Promise<void> {
    for (;;) {
      const acquired = (await this.redis.eval(ACQUIRE_SCRIPT, 1, key, limit, SEMAPHORE_TTL_SECONDS)) as number;

      if (acquired === 1) return;

      await new Promise((resolve) => setTimeout(resolve, ACQUIRE_POLL_INTERVAL_MS));
    }
  }

  async release(key: string): Promise<void> {
    await this.redis.eval(RELEASE_SCRIPT, 1, key);
  }
}
