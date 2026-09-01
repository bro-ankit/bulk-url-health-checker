# packages/shared-contracts

Everything `apps/api` and `apps/worker` both need: MikroORM entities, DTOs published over Redis
pub/sub, shared constants, and a couple of small reusable utils. Consumed via its compiled `dist`
(`pnpm build:packages` from the repo root, or `pnpm --filter shared-contracts build`), not
transpiled on the fly by the consuming apps.

`apps/web` does **not** depend on this package, its types come from the orval-generated client
against `apps/api`'s OpenAPI spec instead, that's the real client/server type-safety boundary for
the frontend.

## Folder structure

```
src/
  entities/          BatchEntity, UrlEntity (MikroORM), BATCH_CONSTANTS, the enums (BatchStatus,
                     UrlCheckStatus). ids are required fields with no default, generated
                     client-side by the caller and passed in, never left to a Postgres or
                     ORM-side default, see the root README's idempotency section for why
  batch-events/      BatchEventEnvelopeDto and friends, the class-validator-decorated shape
                     published on the Redis pub/sub channel and consumed by the SSE endpoint,
                     validated on both the publish and the parse side
  logger/            AppLoggerService (pino-backed) + @InjectLogger(), a property decorator
                     wrapping @Inject() that also calls setContext(ClassName) exactly once
  cache/             BatchListCacheKeyUtil, one static method, used identically by both apps so
                     the cache key format can't drift between them
  validation/        validateAndTransformInstance, a generic class-validator/class-transformer
                     wrapper (plainToInstance + validate + a readable error message), not a
                     batch-specific concern despite currently having one real caller
```

## A build-time constraint worth knowing before touching a constructor here

Both consuming apps set `"useDefineForClassFields": false` in their `tsconfig.json`, and so does
this package. This setting is required: without it, a class field declared with `!` and no
initializer breaks dependency injection for that field, TypeScript's native class-field emit
shadows a legacy property decorator's own `Object.defineProperty`, so the value is still assigned
correctly but any side effect inside the decorator's setter (such as `setContext` in
`@InjectLogger()`) never runs.

The same family of issue applies to constructor parameters: any `import type` on a class used as
a constructor parameter type with no explicit `@Inject()` token degrades
`Reflect.getMetadata('design:paramtypes', ...)` to `Function`/`Object`, and NestJS can no longer
resolve that dependency. Use a value import for any constructor parameter type resolved
implicitly.

## Testing

```bash
pnpm test
```

Pure unit tests, no database, no Redis. Includes `InjectLogger()`'s own decorator test, worth
reading as the reference example for testing a property decorator with real observable behavior
rather than just checking metadata got set.
