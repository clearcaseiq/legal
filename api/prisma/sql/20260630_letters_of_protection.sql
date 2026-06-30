-- Postgres schema sync for: letters_of_protection.
--
-- A Letter of Protection (LOP) is the lien instrument an attorney sends a medical
-- provider so the provider treats a PI client now and is paid from the eventual
-- settlement. Generated from a provider referral, optionally emailed to the
-- provider, and linked to the LienHolder it creates (see
-- api/src/routes/medical-providers.ts).
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "letters_of_protection" (
    "id" TEXT NOT NULL,
    "referralId" TEXT,
    "leadId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "lienHolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letters_of_protection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "letters_of_protection_leadId_idx" ON "letters_of_protection"("leadId");
CREATE INDEX IF NOT EXISTS "letters_of_protection_providerId_idx" ON "letters_of_protection"("providerId");
CREATE INDEX IF NOT EXISTS "letters_of_protection_referralId_idx" ON "letters_of_protection"("referralId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'letters_of_protection_leadId_fkey') THEN
    ALTER TABLE "letters_of_protection"
      ADD CONSTRAINT "letters_of_protection_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'letters_of_protection_providerId_fkey') THEN
    ALTER TABLE "letters_of_protection"
      ADD CONSTRAINT "letters_of_protection_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "medical_providers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'letters_of_protection_attorneyId_fkey') THEN
    ALTER TABLE "letters_of_protection"
      ADD CONSTRAINT "letters_of_protection_attorneyId_fkey"
      FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'letters_of_protection_referralId_fkey') THEN
    ALTER TABLE "letters_of_protection"
      ADD CONSTRAINT "letters_of_protection_referralId_fkey"
      FOREIGN KEY ("referralId") REFERENCES "provider_referrals"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
