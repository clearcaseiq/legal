-- Text-to-Case: inbound MMS document intake.

-- Which phone number may text documents to which case. Also the consent record:
-- a binding only exists because an attorney on the case sent the invite.
CREATE TABLE IF NOT EXISTS "case_phone_bindings" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "boundByUserId" TEXT,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInboundAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_phone_bindings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_phone_bindings_phoneE164_status_idx" ON "case_phone_bindings"("phoneE164", "status");
CREATE INDEX IF NOT EXISTS "case_phone_bindings_assessmentId_status_idx" ON "case_phone_bindings"("assessmentId", "status");

DO $$
BEGIN
    ALTER TABLE "case_phone_bindings"
        ADD CONSTRAINT "case_phone_bindings_assessmentId_fkey"
        FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- SHA-256 of file bytes, so a photo texted twice is not billed twice.
ALTER TABLE "evidence_files" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
CREATE INDEX IF NOT EXISTS "evidence_files_assessmentId_contentHash_idx" ON "evidence_files"("assessmentId", "contentHash");

-- Record which case an inbound text delivered documents to.
ALTER TABLE "sms_webhook_receipts" ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;
ALTER TABLE "sms_webhook_receipts" ADD COLUMN IF NOT EXISTS "numMedia" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "sms_webhook_receipts_assessmentId_createdAt_idx" ON "sms_webhook_receipts"("assessmentId", "createdAt");
