-- Firm templates can be offered in the letter of representation window, to a
-- medical provider or to an insurance carrier, with one default per letter.
ALTER TABLE "firm_templates" ADD COLUMN IF NOT EXISTS "letterUse" TEXT;
ALTER TABLE "firm_templates" ADD COLUMN IF NOT EXISTS "letterDefault" BOOLEAN NOT NULL DEFAULT false;
