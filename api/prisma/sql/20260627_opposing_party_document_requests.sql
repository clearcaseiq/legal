-- Postgres schema sync for: defendant / opposing-party document requests
-- (+ provisional intake-lead account columns from the same release).
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

-- ── intake_leads: provisional account + abandonment tracking ──────────────────
ALTER TABLE "intake_leads" ADD COLUMN IF NOT EXISTS "abandonmentEmailedAt" TIMESTAMP(3);
ALTER TABLE "intake_leads" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "intake_leads_userId_idx" ON "intake_leads"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'intake_leads_userId_fkey'
  ) THEN
    ALTER TABLE "intake_leads"
      ADD CONSTRAINT "intake_leads_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── document_requests: opposing-party / external-recipient support ────────────
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "caseContactId" TEXT;
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'attorney';
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "recipientEmail" TEXT;
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT;
ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT 'plaintiff';

-- ── external_document_uploads: files returned by the opposing party ───────────
CREATE TABLE IF NOT EXISTS "external_document_uploads" (
    "id" TEXT NOT NULL,
    "documentRequestId" TEXT NOT NULL,
    "docType" TEXT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedByName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_document_uploads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "external_document_uploads_documentRequestId_idx"
  ON "external_document_uploads"("documentRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_document_uploads_documentRequestId_fkey'
  ) THEN
    ALTER TABLE "external_document_uploads"
      ADD CONSTRAINT "external_document_uploads_documentRequestId_fkey"
      FOREIGN KEY ("documentRequestId") REFERENCES "document_requests"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── opposing_doc_request_suggestions: plaintiff-suggested requests ────────────
CREATE TABLE IF NOT EXISTS "opposing_doc_request_suggestions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "leadId" TEXT,
    "suggestedByUserId" TEXT,
    "requestedDocs" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientRole" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "documentRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opposing_doc_request_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "opposing_doc_request_suggestions_assessmentId_idx"
  ON "opposing_doc_request_suggestions"("assessmentId");
CREATE INDEX IF NOT EXISTS "opposing_doc_request_suggestions_leadId_idx"
  ON "opposing_doc_request_suggestions"("leadId");
