-- Identity spine for bulk attorney/firm imports (Phase 1).
--
-- Adds the two dedup keys that bulk import needs: a bar number on attorneys
-- (issued once per person, never reused) and a registrable domain on law firms
-- (the only stable firm key, since firm names vary by source). Also widens the
-- staging table with the roster fields a state bar roll provides.
--
-- Existing rows all have NULL in the new unique columns, and Postgres treats
-- NULLs as distinct in a unique index, so nothing collides. The indexes are
-- deliberately plain rather than partial: this project keeps the database in
-- step with `prisma db push`, which creates plain unique indexes, and a partial
-- index here would read as drift on every subsequent push.
--
-- Every statement is idempotent, so this file is safe to re-run.

ALTER TABLE "attorneys" ADD COLUMN IF NOT EXISTS "barNumber" TEXT;
ALTER TABLE "attorneys" ADD COLUMN IF NOT EXISTS "barState" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "attorneys_barNumber_key"
  ON "attorneys"("barNumber");

ALTER TABLE "law_firms" ADD COLUMN IF NOT EXISTS "firmDomain" TEXT;
ALTER TABLE "law_firms" ADD COLUMN IF NOT EXISTS "nameKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "law_firms_firmDomain_key"
  ON "law_firms"("firmDomain");

CREATE INDEX IF NOT EXISTS "law_firms_nameKey_state_idx"
  ON "law_firms"("nameKey", "state");

ALTER TABLE "production_attorneys" ADD COLUMN IF NOT EXISTS "barNumber" TEXT;
ALTER TABLE "production_attorneys" ADD COLUMN IF NOT EXISTS "barState" TEXT;
ALTER TABLE "production_attorneys" ADD COLUMN IF NOT EXISTS "licenseStatus" TEXT;
ALTER TABLE "production_attorneys" ADD COLUMN IF NOT EXISTS "countySource" TEXT;
ALTER TABLE "production_attorneys" ADD COLUMN IF NOT EXISTS "firmSize" INTEGER;

CREATE INDEX IF NOT EXISTS "production_attorneys_barNumber_idx"
  ON "production_attorneys"("barNumber");

CREATE INDEX IF NOT EXISTS "production_attorneys_county_idx"
  ON "production_attorneys"("county");
