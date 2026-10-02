-- Firm templates say what they are signed as (retainer / HIPAA authorization).
ALTER TABLE "firm_templates" ADD COLUMN IF NOT EXISTS "documentType" TEXT;

-- Envelopes keep what was sent: source template, filled fields, the exact PDF and its hash.
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "fieldValues" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "sourceFilePath" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "sourceSha256" TEXT;
