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
set -e

echo "[entrypoint] syncing database schema (prisma db push)..."
if node ../node_modules/prisma/build/index.js db push --schema=prisma/schema.prisma --skip-generate; then
  echo "[entrypoint] schema in sync."
else
  echo "[entrypoint] WARNING: prisma db push failed (possible destructive change or DB connectivity). Starting API anyway."
fi

echo "[entrypoint] starting API..."
exec node dist/index.js
