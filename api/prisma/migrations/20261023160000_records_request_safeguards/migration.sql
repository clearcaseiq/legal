-- AlterTable
ALTER TABLE "case_letters" ADD COLUMN "requestType" TEXT,
ADD COLUMN "recordTypes" TEXT,
ADD COLUMN "recordsFrom" TIMESTAMP(3),
ADD COLUMN "recordsTo" TIMESTAMP(3),
ADD COLUMN "representationBasis" TEXT,
ADD COLUMN "checks" TEXT,
ADD COLUMN "acknowledgedWarnings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvedByEmail" TEXT,
ADD COLUMN "approvedByRole" TEXT,
ADD COLUMN "signedByName" TEXT,
ADD COLUMN "followUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastFollowUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "case_contacts" ADD COLUMN "address" TEXT;

-- CreateTable
CREATE TABLE "representation_attestations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "attorneyName" TEXT NOT NULL,
    "attestedByUserId" TEXT,
    "attestedByEmail" TEXT,
    "engagementDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "representation_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "representation_attestations_leadId_idx" ON "representation_attestations"("leadId");
