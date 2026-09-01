import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { BatchEventEnvelopeDto, BatchStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchEventsController } from '../../../src/batches/controllers/batch-events.controller';
import { REDIS_CLIENT } from '../../../src/redis/redis.constants';
import { SseCursorUtil } from '../../../src/sse/sse-cursor.util';
import { FakeRedisPubSubClient } from '../../__mocks__/fake-redis-pubsub.client';
import { mockBatchEntity } from '../../__mocks__';
import { SseTestClient } from '../../helpers/sse-test-client';

describe('Given BatchEventsController', () => {
  const BATCH_ID = randomUUID();

  let app: NestFastifyApplication;
  let baseUrl: string;
  let queryBus: { execute: ReturnType<typeof vi.fn> };
  let redis: FakeRedisPubSubClient;
  let client: SseTestClient;

  beforeAll(async () => {
    queryBus = { execute: vi.fn() };
    redis = new FakeRedisPubSubClient();

    const moduleRef = await Test.createTestingModule({
      controllers: [BatchEventsController],
      providers: [
        { provide: QueryBus, useValue: queryBus },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    client?.close();
    vi.clearAllMocks();
  });

  describe('When a client connects with no last-event-id (a cold open)', () => {
    test('Then it streams the current full batch snapshot as the first event', async () => {
      const batch = mockBatchEntity({ id: BATCH_ID, status: BatchStatus.RUNNING });
      queryBus.execute.mockResolvedValue(batch);

      client = new SseTestClient();
      await client.connect(`${baseUrl}/batches/${BATCH_ID}/events`);
      const [event] = await client.waitForEvents(1);

      expect(redis.subscribedChannels).toStrictEqual([`batch:${BATCH_ID}`]);
      expect(event.id).toBe(SseCursorUtil.encode(batch.id, batch.updatedAt));
      expect(event.data).toStrictEqual(expect.objectContaining({ id: batch.id, status: batch.status }));
    });
  });

  describe('When a client reconnects with a last-event-id', () => {
    test('Then it fetches only what changed since that cursor instead of the full snapshot', async () => {
      const batch = mockBatchEntity({ id: BATCH_ID, status: BatchStatus.RUNNING });
      const lastEventId = SseCursorUtil.encode(randomUUID(), new Date('2026-08-31T00:00:00.000Z'));
      queryBus.execute.mockResolvedValue({ batch, changedUrls: [] });

      client = new SseTestClient();
      await client.connect(`${baseUrl}/batches/${BATCH_ID}/events`, { 'last-event-id': lastEventId });
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: BATCH_ID, sinceIso: SseCursorUtil.extractTimestamp(lastEventId) }),
      );
    });
  });

  describe('When a live update is published on the batch channel', () => {
    test('Then it is streamed to the connected client', async () => {
      const batch = mockBatchEntity({ id: BATCH_ID, status: BatchStatus.RUNNING });
      const lastEventId = SseCursorUtil.encode(randomUUID(), new Date('2026-08-31T00:00:00.000Z'));
      queryBus.execute.mockResolvedValue(null);

      client = new SseTestClient();
      await client.connect(`${baseUrl}/batches/${BATCH_ID}/events`, { 'last-event-id': lastEventId });

      const envelope: BatchEventEnvelopeDto = {
        id: SseCursorUtil.encode(batch.id, batch.updatedAt),
        data: {
          batch: {
            id: batch.id,
            status: batch.status,
            totalCount: batch.totalCount,
            succeededCount: batch.succeededCount,
            failedCount: batch.failedCount,
          },
        },
      };
      redis.publish(`batch:${BATCH_ID}`, JSON.stringify(envelope));

      const [event] = await client.waitForEvents(1);
      expect(event.id).toBe(envelope.id);
      expect(event.data).toStrictEqual(envelope.data);
    });
  });

  describe('When the streamed batch reports a terminal status', () => {
    test('Then the server closes the connection after that event', async () => {
      const batch = mockBatchEntity({ id: BATCH_ID, status: BatchStatus.COMPLETED });
      queryBus.execute.mockResolvedValue(batch);

      client = new SseTestClient();
      await client.connect(`${baseUrl}/batches/${BATCH_ID}/events`);
      await client.waitForEvents(1);

      await client.waitForClose(2000);
    });
  });
});
