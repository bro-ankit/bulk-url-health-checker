FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# 1. Install dependencies AND Build
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN pnpm --filter shared-contracts build
RUN pnpm --filter worker build

# 2. Prune production dependencies
FROM build AS isolate
RUN pnpm --filter worker deploy --prod --legacy /prod/worker

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser

COPY --from=isolate /prod/worker/node_modules ./node_modules
COPY --from=build /repo/apps/worker/dist ./dist
COPY --from=build /repo/apps/worker/package.json ./package.json
COPY --from=build /repo/packages/shared-contracts/dist ./node_modules/shared-contracts/dist

USER workeruser

CMD ["node", "dist/main"]