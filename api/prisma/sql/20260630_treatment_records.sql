-- Postgres schema sync for: treatment_records.
--
-- A TreatmentRecord is a single treatment encounter logged against a provider
-- referral: the visit, any diagnosis (free text + optional ICD-10), and the
-- amount the provider billed. This is the running ledger that backs the
-- "track all treatment, diagnoses, and bills throughout" step of the lien-based
-- treatment workflow (see api/src/routes/medical-providers.ts).
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "treatment_records" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "visitType" TEXT NOT NULL DEFAULT 'follow_up',
    "diagnosis" TEXT,
    "diagnosisCode" TEXT,
    "billedAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "treatment_records_referralId_idx" ON "treatment_records"("referralId");
CREATE INDEX IF NOT EXISTS "treatment_records_leadId_idx" ON "treatment_records"("leadId");
CREATE INDEX IF NOT EXISTS "treatment_records_providerId_idx" ON "treatment_records"("providerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_records_referralId_fkey') THEN
    ALTER TABLE "treatment_records"
      ADD CONSTRAINT "treatment_records_referralId_fkey"
      FOREIGN KEY ("referralId") REFERENCES "provider_referrals"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
