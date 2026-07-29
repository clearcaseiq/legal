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
#   - Push failure is FATAL. This used to warn and start anyway, on the theory
#     that a transient sync issue should not take the service down. In practice
#     the opposite happened: a failed push left the API serving traffic with a
#     generated client that selected columns the database did not have, so every
#     case query threw for three days while the container looked healthy. A
#     container that refuses to start is far easier to notice than one that
#     quietly 500s. Set ALLOW_SCHEMA_DRIFT=true to boot anyway (break-glass, e.g.
#     to reach a shell on a box whose schema you are mid-way through repairing).
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

fail_or_continue() {
  if [ "$ALLOW_SCHEMA_DRIFT" = "true" ]; then
    echo "[entrypoint] ALLOW_SCHEMA_DRIFT=true — starting API despite the failure above."
    return 0
  fi
  echo "[entrypoint] Refusing to start against an unverified schema."
  echo "[entrypoint] Fix the schema, or set ALLOW_SCHEMA_DRIFT=true to override."
  exit 1
}

if [ -z "$PRISMA_CLI" ]; then
  echo "[entrypoint] ERROR: could not locate the prisma CLI, so the schema cannot be verified."
  fail_or_continue
else
  echo "[entrypoint] using prisma CLI: $PRISMA_CLI"
  echo "[entrypoint] syncing database schema (prisma db push)..."
  # Run WITHOUT swallowing output so any drift/connectivity failure is visible in
  # the container logs.
  if node "$PRISMA_CLI" db push --schema=prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] schema in sync."
  else
    echo "[entrypoint] ERROR: prisma db push failed (possible destructive change or DB connectivity)."
    fail_or_continue
  fi
fi

echo "[entrypoint] starting API..."
exec node dist/index.js
