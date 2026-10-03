-- Envelopes sent as part of a combined client packet (sign + upload in one link).
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "packetRequestId" TEXT;
CREATE INDEX IF NOT EXISTS "document_envelopes_packetRequestId_idx" ON "document_envelopes"("packetRequestId");

-- Executed agreements were filed under "other"; they get their own category so
-- they stay out of evidence coverage.
UPDATE "evidence_files" SET "category" = 'agreements' WHERE "uploadMethod" = 'esign' AND "category" = 'other';
