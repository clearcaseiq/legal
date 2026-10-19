-- AlterTable
ALTER TABLE "document_requests" ADD COLUMN "recipientPhone" TEXT,
ADD COLUMN "liabilityEvidenceItemId" TEXT;

-- CreateIndex
CREATE INDEX "document_requests_liabilityEvidenceItemId_idx" ON "document_requests"("liabilityEvidenceItemId");
