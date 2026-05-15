# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @paperclipai/ui build
RUN pnpm --filter @paperclipai/server... build
RUN pnpm --filter @paperclipai/server deploy --prod /prod
RUN node scripts/apply-publish-config.mjs /prod
RUN mkdir -p /prod/ui-dist \
  && cp -R ui/dist/. /prod/ui-dist/ \
  && test -f /prod/dist/index.js \
  && test -f /prod/ui-dist/index.html

FROM node:22-alpine AS runtime
RUN apk add --no-cache curl \
  && mkdir -p /paperclip \
  && chown node:node /paperclip
WORKDIR /app
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000 \
  SERVE_UI=true \
  PAPERCLIP_HOME=/paperclip \
  PAPERCLIP_INSTANCE_ID=default \
  PAPERCLIP_DEPLOYMENT_MODE=authenticated \
  PAPERCLIP_DEPLOYMENT_EXPOSURE=private
COPY --from=build --chown=node:node /prod ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "dist/index.js"]
