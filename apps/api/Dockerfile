FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# 1. Install dependencies AND Build in the same continuous stage
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
RUN pnpm install --frozen-lockfile

# Copy rest of source files and run builds
COPY . .
ENV NODE_ENV=production
RUN pnpm --filter shared-contracts build
RUN pnpm --filter api build

# 2. Prune production dependencies
FROM build AS isolate
RUN pnpm --filter api deploy --prod --legacy /prod/api

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

COPY --from=isolate /prod/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/packages/shared-contracts/dist ./node_modules/shared-contracts/dist

USER apiuser
EXPOSE 3000

CMD ["node", "dist/main"]