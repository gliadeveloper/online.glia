# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs prisma generate — schema not copied yet at this stage
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next build imports Prisma modules; runtime URL comes from compose env_file
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
# Webpack's separate compiler process releases memory before type checking.
# Keep all type checks enabled on the 4GiB build host; this limit is build-only.
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build:docker -- --webpack

# One-shot: docker compose run --rm migrate
FROM deps AS migrator
# Migrations need the CLI and SQL, not a Next build or generated application client.
# npm ci intentionally skipped install scripts. Bundle the migration engine now
# so the release job does not need an engine download after writes are frozen.
RUN node node_modules/@prisma/engines/scripts/postinstall.js \
  && test -n "$(find node_modules/@prisma/engines -maxdepth 1 -name 'schema-engine-*' -type f -print -quit)"
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
CMD ["npx", "prisma", "migrate", "deploy"]

# One-shot: docker compose --profile seed run --rm seed
FROM base AS seed
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
CMD ["npx", "tsx", "prisma/seed.ts"]

FROM base AS runner
# Upload completion verifies complete media bytes before publishing them.
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
