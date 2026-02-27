# syntax=docker/dockerfile:1.7
ARG PNPM_VERSION=10.13.1

# 1) deps
FROM node:24.13.1 AS deps
WORKDIR /repo
RUN npm i -g pnpm@${PNPM_VERSION}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/package.json
RUN pnpm install --frozen-lockfile

# 2) build
FROM node:24.13.1 AS build
WORKDIR /repo
RUN npm i -g pnpm@${PNPM_VERSION}

COPY --from=deps /repo /repo
COPY . .

RUN node packages/server/scripts/merge-prisma-models.js
RUN pnpm --filter "./packages/server" exec prisma generate --schema ./prisma/schema.prisma

RUN pnpm --filter "./packages/server" build

# 3) prod deps 
FROM node:24.13.1 AS prod_deps
WORKDIR /repo
ENV NODE_ENV=production
RUN npm i -g pnpm@${PNPM_VERSION}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/package.json
COPY packages/server/prisma packages/server/prisma
COPY packages/server/scripts packages/server/scripts

RUN pnpm --filter "./packages/server..." install --frozen-lockfile --ignore-scripts

RUN node packages/server/scripts/merge-prisma-models.js
RUN pnpm --filter "./packages/server" exec prisma generate --schema ./prisma/schema.prisma

# 4) runtime
FROM node:24.13.1 AS runner
ENV NODE_ENV=production
WORKDIR /app/packages/server

COPY --from=prod_deps /repo/packages/server/node_modules ./node_modules
COPY --from=prod_deps /repo/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=prod_deps /repo/node_modules/.modules.yaml /app/node_modules/.modules.yaml
COPY --from=prod_deps /repo/node_modules/.pnpm-workspace-state-v1.json /app/node_modules/.pnpm-workspace-state-v1.json

COPY --from=build /repo/packages/server/dist ./dist
COPY --from=build /repo/packages/server/prisma ./prisma
COPY --from=build /repo/packages/server/package.json ./package.json
COPY --from=build /repo/packages/server/scripts ./scripts

EXPOSE 3000

CMD ["sh", "-lc", "\
  set -e; \
  if [ -z \"${DATABASE_URL:-}\" ]; then \
    echo 'ERROR: DATABASE_URL is empty (missing env).'; exit 1; \
  fi; \
  node scripts/merge-prisma-models.js; \
  npx prisma generate --schema ./prisma/schema.prisma; \
  npx prisma db push --schema ./prisma/schema.prisma --url \"$DATABASE_URL\"; \
  exec node dist/src/main.js \
"]