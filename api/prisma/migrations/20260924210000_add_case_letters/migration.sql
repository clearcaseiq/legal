-- Letters of representation sent on a case, to an insurance carrier or a treating
-- provider. One row per delivery.
CREATE TABLE IF NOT EXISTS "case_letters" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "insuranceDetailId" TEXT,
    "caseContactId" TEXT,
    "providerName" TEXT,
    "documentRequestId" TEXT,
    "lienHolderId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "deliveredVia" TEXT NOT NULL,
    "includesLop" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sentByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_letters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_letters_leadId_idx" ON "case_letters"("leadId");

DO $$ BEGIN
    ALTER TABLE "case_letters" ADD CONSTRAINT "case_letters_leadId_fkey"
        FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
