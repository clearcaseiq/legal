-- Postgres schema sync for: case_outcomes (valuation calibration substrate).
--
-- Records the real-world resolution of a case (settlement/verdict/dismissed) plus a
-- snapshot of the prediction + features at resolution time, so the valuation engine can
-- be backtested and calibrated against historical outcomes (see
-- api/src/lib/valuation-calibration.ts).
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "case_outcomes" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION,
    "netToClient" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "predictedMedian" DOUBLE PRECISION,
    "featuresSnapshot" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_outcomes_assessmentId_idx" ON "case_outcomes"("assessmentId");
CREATE INDEX IF NOT EXISTS "case_outcomes_outcomeType_idx" ON "case_outcomes"("outcomeType");
CREATE INDEX IF NOT EXISTS "case_outcomes_resolvedAt_idx" ON "case_outcomes"("resolvedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_outcomes_assessmentId_fkey'
  ) THEN
    ALTER TABLE "case_outcomes"
      ADD CONSTRAINT "case_outcomes_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
