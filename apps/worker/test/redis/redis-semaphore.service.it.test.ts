import { randomUUID } from 'node:crypto';

import { RedisSemaphoreService } from '../../src/redis/redis-semaphore.service';
import { RedisTestEnvironment } from '../helpers/redis-test-environment';

describe('Given RedisSemaphoreService', () => {
  const env = new RedisTestEnvironment();
  let sut: RedisSemaphoreService;

  beforeAll(async () => {
    await env.start();
    sut = new RedisSemaphoreService(env.client);
  }, 60_000);

  afterAll(async () => {
    await env.stop();
  });

  beforeEach(async () => {
    await env.clear();
  });

  describe('When acquire is called while the count is under the limit', () => {
    test('Then it resolves immediately, increments the counter, and sets an expiry on it so a crashed worker cannot leak a permanently held slot', async () => {
      const key = randomUUID();

      await sut.acquire(key, 5);

      expect(await env.client.get(key)).toBe('1');
      expect(await env.client.ttl(key)).toBeGreaterThan(0);
    });
  });

  describe('When acquire is called repeatedly up to the limit', () => {
    test('Then every call resolves and the counter reflects the total number of holders', async () => {
      const key = randomUUID();

      await sut.acquire(key, 3);
      await sut.acquire(key, 3);
      await sut.acquire(key, 3);

      expect(await env.client.get(key)).toBe('3');
    });
  });

  describe('When acquire is called while already at the limit', () => {
    test('Then it blocks until a release frees a slot, instead of exceeding the limit', async () => {
      const key = randomUUID();
      await sut.acquire(key, 1);

      let acquired = false;
      const pending = sut.acquire(key, 1).then(() => {
        acquired = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 120));
      expect(acquired).toBe(false);
      expect(await env.client.get(key)).toBe('1');

      await sut.release(key);
      await pending;

      expect(acquired).toBe(true);
      expect(await env.client.get(key)).toBe('1');
    });
  });

  describe('When two separate service instances share the same key', () => {
    test('Then the limit holds across both, the same guarantee that must hold across worker processes', async () => {
      const key = randomUUID();
      const firstProcess = new RedisSemaphoreService(env.client);
      const secondProcess = new RedisSemaphoreService(env.client);

      await firstProcess.acquire(key, 2);
      await secondProcess.acquire(key, 2);

      let thirdAcquired = false;
      const pending = secondProcess.acquire(key, 2).then(() => {
        thirdAcquired = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 120));
      expect(thirdAcquired).toBe(false);
      expect(await env.client.get(key)).toBe('2');

      await firstProcess.release(key);
      await pending;

      expect(thirdAcquired).toBe(true);
    });
  });

  describe('When release is called on a counter that is already at zero', () => {
    test('Then it does not go negative or create a stray counter key', async () => {
      const key = randomUUID();

      await sut.release(key);

      expect(await env.client.get(key)).toBeNull();
    });
  });
});
