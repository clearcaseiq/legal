-- Attorney countersignature on envelopes (signs after the client).
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "countersignerName" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "countersignerEmail" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "countersignUrl" TEXT;
ALTER TABLE "document_envelopes" ADD COLUMN IF NOT EXISTS "clientSignedAt" TIMESTAMP(3);
