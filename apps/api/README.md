# apps/api

NestJS + Fastify. HTTP only, no BullMQ processor lives here, see `apps/worker` for that. Owns the
REST endpoints, the SSE stream, and applies MikroORM migrations on boot.

## Run

From the repo root (needs Postgres/Redis/LocalStack up, see the root README's `pnpm bootstrap`):

```bash
pnpm --filter api start:dev
```

- http://localhost:3000/api/docs - Swagger UI, generated from the `@nestjs/swagger` decorators on
  every controller/DTO in this app
- http://localhost:3000/api/docs-json - the raw OpenAPI spec, this is what `apps/web`'s orval
  codegen (`pnpm --filter web generate:api`) reads from, so it must be pointed at a running
  instance of this app, there's no static exported spec checked in
- http://localhost:3000/health - liveness check

## Folder structure

```
src/
  batches/                 the one real feature module
    controllers/            BatchesController (REST), BatchEventsController (SSE)
    commands/                CQRS commands: create, cancel, retry-failed, request/complete CSV upload
    queries/                 CQRS queries: get one, list (paginated), get urls, get-updates-since
    services/                CreateBatchService, the one piece of non-CQRS orchestration
    repositories/            BatchRepository, UrlRepository, direct MikroORM query builders
    dto/                     request/response DTOs, class-validator decorated
    redis/                   CacheInvalidationListener, subscribes to the worker's invalidation
                             channel since this is batch-list-specific, not generic caching
    utils/                   BatchListCursorUtil (opaque pagination cursor encode/decode)
  cache/                    generic Redis-backed cache-aside layer + @Cache() decorator, no
                             batch-specific logic lives here on purpose
  database/                 MikroORM config, migrations, the advisory-lock-wrapped migration runner
  queue/                    BullMQ queue registration (this app only enqueues jobs, never processes them)
  redis/                    the raw ioredis client provider, BatchEventsPublisher
  sse/                      RedisChannelSseStreamUtil, the reusable subscribe-then-replay-then-live
                             SSE mechanics; SseCursorUtil for the `timestamp|entityId` event id format
  storage/                  IStorageClient interface + S3StorageClient implementation (S3Module vs.
                             StorageModule: only StorageModule should ever be imported by feature
                             modules, S3 is an implementation detail behind it)
```

## Testing

```bash
pnpm test:unit   # fast, mocked (Suites automock), no external services
pnpm test:it     # real Postgres + real testcontainers, no mocked persistence
pnpm test:e2e    # currently empty, reserved for real end-to-end specs; the existing
                 # controller/SSE tests already boot a real NestFastifyApplication and live
                 # under test:unit instead
pnpm test        # all three, in that order
```

`test/__mocks__/` holds entity mock factories (`mockBatchEntity`, `mockUrlEntity`).
`test/helpers/database-test-environment.ts` and `sse-test-client.ts` are the two reusable pieces
worth knowing about if you're adding a new test: the former spins up a real Postgres via
testcontainers and exposes a MikroORM instance against it, the latter is a raw HTTP client for
`@Sse()` endpoints since supertest can't handle a response that intentionally never ends.
