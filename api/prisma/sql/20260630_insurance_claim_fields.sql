-- Postgres schema sync for: insurance_details claim-setup fields.
--
-- Adds the recovery-path (at-fault vs UM/UIM), claim-number/status, and Dec Page
-- coverage-confirmation columns used by the insurance workstream so attorneys can
-- determine the claim type, request the declaration page (coverage ceiling), and
-- open the claim with the adjuster (see api/src/routes/attorney-dashboard.ts).
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

ALTER TABLE "insurance_details"
  ADD COLUMN IF NOT EXISTS "insuredParty" TEXT,
  ADD COLUMN IF NOT EXISTS "coverageType" TEXT,
  ADD COLUMN IF NOT EXISTS "claimNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "claimStatus" TEXT NOT NULL DEFAULT 'not_opened',
  ADD COLUMN IF NOT EXISTS "claimOpenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decPageRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "coverageConfirmed" BOOLEAN NOT NULL DEFAULT false;
