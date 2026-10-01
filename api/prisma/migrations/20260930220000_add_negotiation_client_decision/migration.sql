-- AlterTable
ALTER TABLE "negotiation_events" ADD COLUMN     "clientDecidedAt" TIMESTAMP(3),
ADD COLUMN     "clientDecision" TEXT,
ADD COLUMN     "clientDecisionNote" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "proofFileIds" TEXT,
ADD COLUMN     "sharedWithClientAt" TIMESTAMP(3),
ADD COLUMN     "terms" TEXT;

-- CreateIndex
CREATE INDEX "negotiation_events_assessmentId_clientDecision_idx" ON "negotiation_events"("assessmentId", "clientDecision");
