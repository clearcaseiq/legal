-- Adds assessments."referenceCode": the short, human-friendly case reference
-- (e.g. "CCIQ-7Q2K9F") shown to plaintiffs and used by phone support.
--
-- Idempotent AND non-destructive: safe to run on prod and safe to re-run.
--   * The column is nullable, so existing rows load unchanged (NULL until the
--     backfill or a lazy GET assigns a code).
--   * Postgres treats NULLs as distinct, so the UNIQUE index tolerates the many
--     existing NULL rows without conflict.
--
-- The api container entrypoint (docker-entrypoint.sh) already runs
-- `prisma db push`, which applies this exact additive change automatically on
-- restart. Run this SQL manually only when you want the column in place WITHOUT
-- rebuilding/restarting the api container -- e.g. to pre-apply it before the new
-- image ships, or to repair a box that booted with ALLOW_SCHEMA_DRIFT=true.
--
-- The index name matches what Prisma generates (`<table>_<field>_key`) so a
-- later `db push` sees it as already satisfied and does not recreate it.
--
-- --- How to run on EC2 -------------------------------------------------------
-- Against the database directly (psql):
--   psql "$DATABASE_URL" -f api/scripts/add-assessment-reference-code.sql
--
-- Or from inside the running api container:
--   docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T api \
--     node ../node_modules/prisma/build/index.js db execute \
--     --schema=prisma/schema.prisma --file scripts/add-assessment-reference-code.sql
--
-- Then assign codes to existing rows (idempotent; only touches NULLs):
--   node ../node_modules/tsx/dist/cli.mjs scripts/backfill-reference-codes.ts
-- -----------------------------------------------------------------------------

ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "referenceCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "assessments_referenceCode_key"
  ON "assessments" ("referenceCode");
