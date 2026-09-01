import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

import { BATCH_CONSTANTS, BatchStatus, UrlCheckStatus } from '@bulk-url-health-checker/shared-contracts';
import { BatchesController } from '../../../src/batches/controllers/batches.controller';
import { CancelBatchCommand } from '../../../src/batches/commands/cancel-batch/cancel-batch.command';
import { CompleteUrlUploadCommand } from '../../../src/batches/commands/complete-url-upload/complete-url-upload.command';
import { CreateBatchCommand } from '../../../src/batches/commands/create-batch/create-batch.command';
import { RequestUrlUploadCommand } from '../../../src/batches/commands/request-url-upload/request-url-upload.command';
import { RetryFailedBatchCommand } from '../../../src/batches/commands/retry-failed-batch/retry-failed-batch.command';
import { GetBatchQuery } from '../../../src/batches/queries/get-batch/get-batch.query';
import { GetBatchUrlsQuery } from '../../../src/batches/queries/get-batch-urls/get-batch-urls.query';
import { ListBatchesQuery } from '../../../src/batches/queries/list-batches/list-batches.query';
import { mockBatchEntity, mockUrlEntity } from '../../__mocks__';

describe('Given BatchesController', () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication['getHttpServer']>;
  let commandBus: { execute: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    commandBus = { execute: vi.fn() };
    queryBus = { execute: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [BatchesController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given POST /batches', () => {
    describe('When called with a valid urls array', () => {
      test('Then it dispatches CreateBatchCommand with those urls and returns the created batch id', async () => {
        commandBus.execute.mockResolvedValue({ batchId: 'batch-1' });

        const response = await request(httpServer)
          .post('/batches')
          .send({ urls: ['https://example.com', 'https://example.org'] })
          .expect(201);

        expect(commandBus.execute).toHaveBeenCalledWith(
          new CreateBatchCommand(['https://example.com', 'https://example.org']),
        );
        expect(response.body).toStrictEqual({ batchId: 'batch-1' });
      });
    });

    describe('When called with an empty urls array', () => {
      test('Then it is rejected by validation before ever reaching CommandBus', async () => {
        await request(httpServer)
          .post('/batches')
          .send({ urls: [] })
          .expect((res) => expect(res.body.message).toStrictEqual(['urls must contain at least 1 elements']))
          .expect(400);

        expect(commandBus.execute).not.toHaveBeenCalled();
      });
    });

    describe('When called with an invalid url in the array', () => {
      test('Then it is rejected by validation before ever reaching CommandBus', async () => {
        await request(httpServer)
          .post('/batches')
          .send({ urls: ['https://example.com', 'not-a-url'] })
          .expect((res) => expect(res.body.message).toStrictEqual(['each value in urls must be a URL address']))
          .expect(400);

        expect(commandBus.execute).not.toHaveBeenCalled();
      });
    });

    describe('When called with a non-http(s) url in the array', () => {
      test('Then it is rejected by validation before ever reaching CommandBus', async () => {
        await request(httpServer)
          .post('/batches')
          .send({ urls: ['ftp://example.com/file'] })
          .expect((res) => expect(res.body.message).toStrictEqual(['each value in urls must be a URL address']))
          .expect(400);

        expect(commandBus.execute).not.toHaveBeenCalled();
      });
    });

    describe('When called with more urls than the batch limit allows', () => {
      test('Then it is rejected by validation before ever reaching CommandBus', async () => {
        const tooMany = Array.from({ length: BATCH_CONSTANTS.MAX_URLS_PER_BATCH + 1 }, () => 'https://example.com');

        await request(httpServer)
          .post('/batches')
          .send({ urls: tooMany })
          .expect((res) =>
            expect(res.body.message).toStrictEqual([
              `urls must contain no more than ${BATCH_CONSTANTS.MAX_URLS_PER_BATCH} elements`,
            ]),
          )
          .expect(400);

        expect(commandBus.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given POST /batches/urls/upload-request', () => {
    test('Then it dispatches RequestUrlUploadCommand with the given filename', async () => {
      commandBus.execute.mockResolvedValue({
        uploadUrl: 'https://s3.example.com',
        uploadFields: {},
        objectKey: 'key-1',
      });

      const response = await request(httpServer)
        .post('/batches/urls/upload-request')
        .send({ filename: 'urls.csv' })
        .expect(201);

      expect(commandBus.execute).toHaveBeenCalledWith(new RequestUrlUploadCommand('urls.csv'));
      expect(response.body).toStrictEqual({
        uploadUrl: 'https://s3.example.com',
        uploadFields: {},
        objectKey: 'key-1',
      });
    });
  });

  describe('Given POST /batches/urls/complete', () => {
    test('Then it dispatches CompleteUrlUploadCommand with the given object key', async () => {
      commandBus.execute.mockResolvedValue({ batchId: 'batch-2', malformedRowCount: 1 });

      const response = await request(httpServer)
        .post('/batches/urls/complete')
        .send({ objectKey: 'key-1' })
        .expect(201);

      expect(commandBus.execute).toHaveBeenCalledWith(new CompleteUrlUploadCommand('key-1'));
      expect(response.body).toStrictEqual({ batchId: 'batch-2', malformedRowCount: 1 });
    });
  });

  describe('Given GET /batches', () => {
    describe('When called with no query params', () => {
      test('Then it dispatches ListBatchesQuery with the default page size', async () => {
        queryBus.execute.mockResolvedValue({ batches: [], nextCursor: null });

        const response = await request(httpServer).get('/batches').expect(200);

        expect(queryBus.execute).toHaveBeenCalledWith(
          new ListBatchesQuery(undefined, BATCH_CONSTANTS.DEFAULT_BATCH_PAGE_SIZE),
        );
        expect(response.body).toStrictEqual({ batches: [], nextCursor: null });
      });
    });

    describe('When called with a cursor and limit', () => {
      test('Then it dispatches ListBatchesQuery with those values and serializes the resulting batches', async () => {
        const batch = mockBatchEntity({ status: BatchStatus.RUNNING });
        queryBus.execute.mockResolvedValue({ batches: [batch], nextCursor: 'next-cursor' });

        const response = await request(httpServer).get('/batches?cursor=abc&limit=5').expect(200);

        expect(queryBus.execute).toHaveBeenCalledWith(new ListBatchesQuery('abc', 5));
        expect(response.body).toStrictEqual({
          batches: [
            {
              id: batch.id,
              name: batch.name,
              status: batch.status,
              totalCount: batch.totalCount,
              succeededCount: batch.succeededCount,
              failedCount: batch.failedCount,
              createdAt: batch.createdAt.toISOString(),
              updatedAt: batch.updatedAt.toISOString(),
            },
          ],
          nextCursor: 'next-cursor',
        });
      });
    });
  });

  describe('Given GET /batches/:batchId', () => {
    test('Then it dispatches GetBatchQuery for that id and serializes the resulting batch', async () => {
      const batch = mockBatchEntity({ status: BatchStatus.COMPLETED });
      queryBus.execute.mockResolvedValue(batch);

      const response = await request(httpServer).get(`/batches/${batch.id}`).expect(200);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetBatchQuery(batch.id));
      expect(response.body).toStrictEqual({
        id: batch.id,
        name: batch.name,
        status: batch.status,
        totalCount: batch.totalCount,
        succeededCount: batch.succeededCount,
        failedCount: batch.failedCount,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
      });
    });
  });

  describe('Given GET /batches/:batchId/urls', () => {
    describe('When called with no query params', () => {
      test('Then it dispatches GetBatchUrlsQuery with the default page and page size', async () => {
        const batchId = randomUUID();
        queryBus.execute.mockResolvedValue({
          urls: [],
          total: 0,
          page: 1,
          pageSize: BATCH_CONSTANTS.DEFAULT_URL_PAGE_SIZE,
        });

        await request(httpServer).get(`/batches/${batchId}/urls`).expect(200);

        expect(queryBus.execute).toHaveBeenCalledWith(
          new GetBatchUrlsQuery(batchId, 1, BATCH_CONSTANTS.DEFAULT_URL_PAGE_SIZE),
        );
      });
    });

    describe('When called with page and pageSize', () => {
      test('Then it dispatches GetBatchUrlsQuery with those values and serializes the resulting urls', async () => {
        const batchId = randomUUID();
        const url = mockUrlEntity({ status: UrlCheckStatus.FAILED });
        queryBus.execute.mockResolvedValue({ urls: [url], total: 1, page: 2, pageSize: 10 });

        const response = await request(httpServer).get(`/batches/${batchId}/urls?page=2&pageSize=10`).expect(200);

        expect(queryBus.execute).toHaveBeenCalledWith(new GetBatchUrlsQuery(batchId, 2, 10));
        expect(response.body).toStrictEqual({
          urls: [
            {
              id: url.id,
              url: url.url,
              status: url.status,
              httpStatusCode: url.httpStatusCode,
              responseTimeMs: url.responseTimeMs,
              pageTitle: url.pageTitle,
              errorMessage: url.errorMessage,
            },
          ],
          total: 1,
          page: 2,
          pageSize: 10,
        });
      });
    });
  });

  describe('Given POST /batches/:batchId/cancel', () => {
    test('Then it dispatches CancelBatchCommand for that batch id', async () => {
      const batchId = randomUUID();
      commandBus.execute.mockResolvedValue(undefined);

      await request(httpServer).post(`/batches/${batchId}/cancel`).expect(201);

      expect(commandBus.execute).toHaveBeenCalledWith(new CancelBatchCommand(batchId));
    });
  });

  describe('Given POST /batches/:batchId/retry-failed', () => {
    test('Then it dispatches RetryFailedBatchCommand for that batch id', async () => {
      const batchId = randomUUID();
      commandBus.execute.mockResolvedValue(undefined);

      await request(httpServer).post(`/batches/${batchId}/retry-failed`).expect(201);

      expect(commandBus.execute).toHaveBeenCalledWith(new RetryFailedBatchCommand(batchId));
    });
  });
});
