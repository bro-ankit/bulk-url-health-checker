import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

/**
 * `RedisSemaphoreService` is two raw Lua scripts run via `EVAL`. Mocking `.eval()` would only
 * prove the service called it with some script string, never that the script's own atomicity and
 * counting logic is actually correct, so this needs a real Redis to mean anything.
 */
export class RedisTestEnvironment {
  private container!: StartedRedisContainer;
  client!: Redis;

  async start(): Promise<void> {
    this.container = await new RedisContainer('redis:7-alpine').start();
    this.client = new Redis(this.container.getConnectionUrl());
  }

  async stop(): Promise<void> {
    this.client.disconnect();
    await this.container.stop();
  }

  async clear(): Promise<void> {
    await this.client.flushall();
  }
}
