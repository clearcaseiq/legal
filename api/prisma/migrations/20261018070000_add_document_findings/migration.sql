-- Visits, charges and wage figures read out of uploaded documents, each tied to
-- the page and passage it came from, awaiting attorney review.

CREATE TABLE IF NOT EXISTS "document_findings" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "evidenceFileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "data" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "sourceQuote" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fingerprint" TEXT NOT NULL,
    "extractor" TEXT NOT NULL DEFAULT 'ai',
    "acceptedEntityType" TEXT,
    "acceptedEntityId" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_findings_assessmentId_status_idx" ON "document_findings"("assessmentId", "status");
CREATE INDEX IF NOT EXISTS "document_findings_evidenceFileId_idx" ON "document_findings"("evidenceFileId");
CREATE INDEX IF NOT EXISTS "document_findings_assessmentId_fingerprint_idx" ON "document_findings"("assessmentId", "fingerprint");

ALTER TABLE "document_findings" DROP CONSTRAINT IF EXISTS "document_findings_assessmentId_fkey";
ALTER TABLE "document_findings" ADD CONSTRAINT "document_findings_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_findings" DROP CONSTRAINT IF EXISTS "document_findings_evidenceFileId_fkey";
ALTER TABLE "document_findings" ADD CONSTRAINT "document_findings_evidenceFileId_fkey"
    FOREIGN KEY ("evidenceFileId") REFERENCES "evidence_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "diagnosisCodes" TEXT;
ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "procedureCodes" TEXT;
ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "sourceFileId" TEXT;
ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "sourcePage" INTEGER;
ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "sourceQuote" TEXT;
ALTER TABLE "medical_treatment_entries" ADD COLUMN IF NOT EXISTS "findingId" TEXT;

ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "sourceFileId" TEXT;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "sourcePage" INTEGER;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "sourceQuote" TEXT;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "documentedAmount" DOUBLE PRECISION;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "findingId" TEXT;
