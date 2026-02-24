# syntax=docker/dockerfile:1.7

# 1) Build stage
FROM node:lts-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY packages/client/package.json packages/client/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter finora-client build

# 2) Runtime stage
FROM nginx:1.27-alpine AS runner
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /repo/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]