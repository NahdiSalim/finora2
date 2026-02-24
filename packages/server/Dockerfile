# syntax=docker/dockerfile:1.7

# 1) deps (install)
FROM node:lts-alpine AS deps
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile


# 2) build
FROM node:lts-alpine AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY --from=deps /repo/node_modules /repo/node_modules
COPY . .


RUN pnpm --filter server prisma generate

RUN pnpm --filter server build


# 3) runtime (prod)
FROM node:lts-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
USER nodeusr

COPY --from=build /repo/packages/server/dist ./dist
COPY --from=build /repo/packages/server/package.json ./package.json
COPY --from=build /repo/packages/server/prisma ./prisma

USER root
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
RUN pnpm add -g pnpm@10.13.1 >/dev/null 2>&1 || true
WORKDIR /tmp/install
COPY --from=build /repo/pnpm-lock.yaml /tmp/install/pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml /tmp/install/pnpm-workspace.yaml
COPY --from=build /repo/package.json /tmp/install/package.json
COPY --from=build /repo/packages/server/package.json /tmp/install/packages/server/package.json
RUN pnpm --filter server --prod install --frozen-lockfile
WORKDIR /app
RUN cp -r /tmp/install/node_modules ./node_modules
USER nodeusr

EXPOSE 3000
CMD ["node", "dist/main"]