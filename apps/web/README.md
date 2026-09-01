# apps/web

Next.js App Router, TypeScript. The BFF proxy route plus an orval-generated react-query client
against `apps/api`'s OpenAPI spec.

## Run

From the repo root (needs `apps/api` running, since this app proxies to it and generates its
client from its live spec):

```bash
pnpm --filter web dev
```

Check the terminal for the port, `next dev` defaults to 3000 but the API is already there, so it
auto-shifts (usually to 3001).

## Regenerating the API client

```bash
pnpm --filter web generate:api
```

This hits `apps/api`'s live `/api/docs-json` (see `orval.config.ts`), so `apps/api` must be
running first. There's no static exported OpenAPI file checked in, the generated client
(`src/lib/__generated__/api.ts`) is checked in, but always regenerate it after changing a
controller/DTO in `apps/api` rather than hand-editing the generated file.

## Folder structure

```
src/
  app/
    batches/
      page.tsx              batch list, server component, prefetches via queryClient.query() +
                            <HydrationBoundary>
      [batchId]/page.tsx     batch detail, same SSR-then-hydrate pattern
    api/proxy/[...path]/     the BFF proxy: an allowlisted path forwarder so the browser never
                            needs to know the real API base URL. The one deliberate exception is
                            the SSE endpoint, the browser's EventSource connects directly to the
                            API, proxying a long-lived streaming response through a Route Handler
                            adds a second hop with its own buffering behavior to reason about,
                            not worth it for exactly the piece whose resilience most matters
  components/
    pages/batches-page/      one folder per page-level feature, each with a container
                            (`use-x.tsx` hook + a plain `x.tsx` wired to it) and a presentational
                            View (`x-view.tsx`, all props, no data fetching, this is what
                            Storybook renders)
    organisms/                shared, page-agnostic pieces (Modal)
  lib/__generated__/        the orval-generated client, do not hand-edit
  utils/test-utils/         renderHook + MOCK_QUERY_CLIENT, seed a hook's TanStack Query cache
                            directly via queryMocks rather than mocking the API module, see any
                            use-*.test.tsx for the pattern
  __mocks__/                 mockBatchDto, mockUrlCheckResultDto, plain data factories for tests
                            and stories
```

## Testing

```bash
pnpm test         # hook tests + Storybook "storyshots" snapshot pass, in that order
pnpm test:watch
pnpm storybook    # browse every View component directly at http://localhost:6006
```

Hook tests never mock the generated API module, seed the TanStack Query cache instead
(`renderHook(..., { queryMocks: [...] })`), the same convention `pks-client-portal` uses. This
only works because every imperative fetch in a hook goes through `queryClient.query(...)`, not a
raw generated function call bypassing the cache, keep new hooks consistent with that if you want
them testable the same way.

`src/storyshots.test.tsx` renders every `*.stories.tsx` file and snapshots it, `next/navigation`'s
`useRouter` is mocked there specifically (a framework/environment concern, not a data-mocking one)
since this harness renders stories directly and skips Storybook's own preview decorators.
