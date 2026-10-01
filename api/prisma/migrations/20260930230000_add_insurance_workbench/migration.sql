-- Insurance workbench: claim milestones, policy-limits demand, per-policy
-- correspondence and document slots, and carrier-scoped document requests.

ALTER TABLE "insurance_details"
  ADD COLUMN "lorAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "claimNumberAt" TIMESTAMP(3),
  ADD COLUMN "coverageConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "liabilityDecision" TEXT,
  ADD COLUMN "liabilityDecisionAt" TIMESTAMP(3),
  ADD COLUMN "limitsDemandSentAt" TIMESTAMP(3),
  ADD COLUMN "limitsDemandDeadline" TIMESTAMP(3),
  ADD COLUMN "limitsDemandStatus" TEXT,
  ADD COLUMN "limitsDemandLetterId" TEXT;

ALTER TABLE "document_requests" ADD COLUMN "insuranceDetailId" TEXT;

CREATE TABLE "insurance_correspondence" (
    "id" TEXT NOT NULL,
    "insuranceDetailId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "contactName" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceFileIds" TEXT,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_correspondence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_correspondence_insuranceDetailId_occurredAt_idx" ON "insurance_correspondence"("insuranceDetailId", "occurredAt");
CREATE INDEX "insurance_correspondence_assessmentId_idx" ON "insurance_correspondence"("assessmentId");

ALTER TABLE "insurance_correspondence" ADD CONSTRAINT "insurance_correspondence_insuranceDetailId_fkey" FOREIGN KEY ("insuranceDetailId") REFERENCES "insurance_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "insurance_documents" (
    "id" TEXT NOT NULL,
    "insuranceDetailId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "evidenceFileId" TEXT,
    "externalUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_documents_insuranceDetailId_evidenceFileId_key" ON "insurance_documents"("insuranceDetailId", "evidenceFileId");
CREATE UNIQUE INDEX "insurance_documents_insuranceDetailId_externalUploadId_key" ON "insurance_documents"("insuranceDetailId", "externalUploadId");
CREATE INDEX "insurance_documents_assessmentId_idx" ON "insurance_documents"("assessmentId");

ALTER TABLE "insurance_documents" ADD CONSTRAINT "insurance_documents_insuranceDetailId_fkey" FOREIGN KEY ("insuranceDetailId") REFERENCES "insurance_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
