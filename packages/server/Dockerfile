# syntax=docker/dockerfile:1.7
ARG PNPM_VERSION=10.13.1

# 1) deps
FROM node:lts-alpine AS deps
WORKDIR /repo
RUN npm i -g pnpm@${PNPM_VERSION}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/package.json
RUN pnpm install --frozen-lockfile

# 2) build
FROM node:lts-alpine AS build
WORKDIR /repo
RUN npm i -g pnpm@${PNPM_VERSION}

COPY --from=deps /repo /repo
COPY . .

RUN pnpm --filter "./packages/server" exec prisma generate
RUN pnpm --filter "./packages/server" build

# 3) prod deps (server only)
FROM node:lts-alpine AS prod_deps
WORKDIR /repo
ENV NODE_ENV=production
RUN npm i -g pnpm@${PNPM_VERSION}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/package.json
COPY packages/server/prisma packages/server/prisma

RUN pnpm --filter "./packages/server..."  install --frozen-lockfile --ignore-scripts
RUN pnpm --filter "./packages/server" exec prisma generate

# 4) runtime (run from package root)
FROM node:lts-alpine AS runner
ENV NODE_ENV=production


WORKDIR /app/packages/server

COPY --from=prod_deps /repo/packages/server/node_modules ./node_modules
COPY --from=prod_deps /repo/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=prod_deps /repo/node_modules/.modules.yaml /app/node_modules/.modules.yaml
COPY --from=prod_deps /repo/node_modules/.pnpm-workspace-state-v1.json /app/node_modules/.pnpm-workspace-state-v1.json

COPY --from=build /repo/packages/server/dist ./dist
COPY --from=build /repo/packages/server/prisma ./prisma
COPY --from=build /repo/packages/server/package.json ./package.json


EXPOSE 3000
CMD ["node", "dist/src/main.js"]