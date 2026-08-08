FROM node:24-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/gateway/package.json ./apps/gateway/package.json
RUN pnpm install --frozen-lockfile --filter gateway...

COPY apps/gateway ./apps/gateway
RUN pnpm --filter gateway build && pnpm --filter gateway deploy --legacy --prod /deploy

FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /deploy ./
COPY --from=build --chown=node:node /workspace/apps/gateway/dist ./dist
USER node

EXPOSE 3000
CMD ["node", "dist/src/main"]
