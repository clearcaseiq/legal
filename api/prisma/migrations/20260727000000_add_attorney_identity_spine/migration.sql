-- Identity spine for bulk attorney/firm imports (Phase 1).
--
-- Adds the two dedup keys that bulk import needs: a bar number on attorneys
-- (issued once per person, never reused) and a registrable domain on law firms
-- (the only stable firm key, since firm names vary by source). Also widens the
-- staging table with the roster fields a state bar roll provides.
--
-- The unique indexes are created as partial indexes so the existing rows, which
-- all have NULL, do not collide. Postgres already treats NULLs as distinct in a
-- unique index; the WHERE clause additionally keeps the index small while the
-- columns are mostly empty.

ALTER TABLE "attorneys" ADD COLUMN IF NOT EXISTS "barNumber" TEXT;
ALTER TABLE "attorneys" ADD COLUMN IF NOT EXISTS "barState" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "attorneys_barNumber_key"
  ON "attorneys"("barNumber")
  WHERE "barNumber" IS NOT NULL;

ALTER TABLE "law_firms" ADD COLUMN IF NOT EXISTS "firmDomain" TEXT;
ALTER TABLE "law_firms" ADD COLUMN IF NOT EXISTS "nameKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "law_firms_firmDomain_key"
  ON "law_firms"("firmDomain")
  WHERE "firmDomain" IS NOT NULL;

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
