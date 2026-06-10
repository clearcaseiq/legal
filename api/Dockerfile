FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc ./
COPY api/package.json ./api/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/api/node_modules ./api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* turbo.json* ./
COPY api ./api
WORKDIR /repo/api
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /repo/api/dist ./dist
COPY --from=builder /repo/api/prisma ./prisma
COPY --from=builder /repo/api/package.json ./package.json
COPY --from=builder /repo/node_modules ../node_modules
COPY --from=builder /repo/api/node_modules ./node_modules

RUN mkdir -p uploads && chown nodejs:nodejs uploads

USER nodejs

EXPOSE 4000

# Run Node directly (not `pnpm start`) so the runtime never invokes corepack/pnpm,
# which would pull a pnpm version requiring a newer Node than this image provides.
CMD ["node", "dist/index.js"]
