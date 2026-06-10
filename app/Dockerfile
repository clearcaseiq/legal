FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc ./
COPY app/package.json ./app/package.json
COPY api/package.json ./api/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/app/node_modules ./app/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* turbo.json* ./
COPY app ./app
WORKDIR /repo/app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /repo/app/.next ./.next
COPY --from=builder /repo/app/public ./public
COPY --from=builder /repo/app/package.json ./package.json
COPY --from=builder /repo/node_modules ../node_modules
COPY --from=builder /repo/app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Run Next directly (not `pnpm start`) so the runtime never invokes corepack/pnpm,
# which would pull a pnpm version requiring a newer Node than this image provides.
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
