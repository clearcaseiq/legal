#!/bin/sh
# Prod container entrypoint.
#
# This project syncs schema via `prisma db push` (there is no active migration
# history for Postgres — the migrations/ folder is legacy MySQL). To keep the
# database in step with schema.prisma on every deploy, we run a non-destructive
# `db push` before starting the API.
#
# Notes:
#   - No `--accept-data-loss`: push applies additive changes (new tables/columns/
#     indexes) but ABORTS rather than dropping data, so it is safe to run on prod.
#   - Push failure is non-fatal: we log a warning and still start the API so a
#     transient sync issue never takes the service down.
#   - The Prisma CLI location varies with the pnpm layout (hoisted to
#     ../node_modules, api-local ./node_modules, or under .pnpm), so we probe a
#     few candidates and fall back to a search instead of hard-coding one path.
set -e

echo "[entrypoint] locating prisma CLI..."
PRISMA_CLI=""
for candidate in \
  "../node_modules/prisma/build/index.js" \
  "./node_modules/prisma/build/index.js" \
  "/node_modules/prisma/build/index.js" \
  "/app/node_modules/prisma/build/index.js"; do
  if [ -f "$candidate" ]; then
    PRISMA_CLI="$candidate"
    break
  fi
done
if [ -z "$PRISMA_CLI" ]; then
  PRISMA_CLI=$(find /node_modules/.pnpm ../node_modules/.pnpm /app/node_modules/.pnpm \
    -maxdepth 3 -path "*prisma*/build/index.js" 2>/dev/null | head -n1)
fi

if [ -z "$PRISMA_CLI" ]; then
  echo "[entrypoint] WARNING: could not locate the prisma CLI; skipping schema sync. Starting API anyway."
else
  echo "[entrypoint] using prisma CLI: $PRISMA_CLI"
  echo "[entrypoint] syncing database schema (prisma db push)..."
  # Run WITHOUT swallowing output so any drift/connectivity failure is visible in
  # the container logs. Non-fatal: never let a sync hiccup take the API down.
  if node "$PRISMA_CLI" db push --schema=prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] schema in sync."
  else
    echo "[entrypoint] WARNING: prisma db push failed (possible destructive change or DB connectivity). Starting API anyway."
  fi
fi

echo "[entrypoint] starting API..."
exec node dist/index.js
