# apps/worker

NestJS application context, `NestFactory.createApplicationContext`, no HTTP listener at all. Hosts
the BullMQ processor that actually checks URLs. This is what makes "workers run in a separate
process from the API" structural rather than just "we ran two npm scripts", there's no `@Sse()`,
no `@Controller()`, no Fastify adapter anywhere in this app.

## Run

From the repo root (needs Postgres/Redis up):

```bash
pnpm --filter worker start:dev
```

There's no port to open, no HTTP surface, watch the terminal logs for job pickup/completion, or
inspect `urls`/`batches` rows directly in Postgres.

## Folder structure

```
src/
  batches/
    processors/
      check-url.processor.ts   the one real piece of business logic in this app: per-job
                                orchestration (cancel checks, semaphore acquire/release, mark
                                succeeded/failed, publish the SSE update, invalidate the batch-list
                                cache), wrapped in @CreateRequestContext() since there's no HTTP
                                middleware here to establish a MikroORM context implicitly
      url-checker.util.ts       the actual fetch + timeout + title-extraction logic, kept
                                deliberately separate from the processor so it's testable/mockable
                                on its own
    repositories/               BatchRepository, UrlRepository, a separate copy from apps/api's
                                (not shared via shared-contracts) since each app's repository
                                surface is intentionally narrow to what that app actually needs
  database/                    MikroORM config; this app never runs migrations itself, only the
                                API does, to keep one clear migration owner
  queue/                       BullMQ Worker registration: this is where the global rate limit
                                (`limiter: { max: 10, duration: 1000 }`) and the per-process
                                `concurrency` option are actually set
  redis/
    redis-semaphore.service.ts  the Lua-scripted counting semaphore, the actual mechanism behind
                                "5 in flight, across any number of worker processes"
    batch-events.publisher.ts   publishes to the per-batch SSE channel
    cache-invalidation.publisher.ts  publishes to the batch-list cache invalidation channel,
                                since this process has no access to the API's in-process cache
                                manager to invalidate it directly
```

## Testing

```bash
pnpm test:unit   # CheckUrlProcessor via Suites automock, no real Redis/Postgres
pnpm test:it     # RedisSemaphoreService against a real Redis (proves the actual blocking/limit
                 # behavior, not just that .eval() was called), repositories against real Postgres
pnpm test        # both, in that order
```

The semaphore's `test:it` suite is the one most worth reading if you only read one test file in
this app: it runs two separate `RedisSemaphoreService` instances against the same Redis key,
the same shape as two real worker processes, and proves the limit holds across both.
