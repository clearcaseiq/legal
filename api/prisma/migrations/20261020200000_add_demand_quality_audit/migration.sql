-- AlterTable
ALTER TABLE "demand_letters" ADD COLUMN     "approvedAuditId" TEXT,
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "approvedDemandAmount" DOUBLE PRECISION,
ADD COLUMN     "approvedDraftHash" TEXT,
ADD COLUMN     "approvedSourceHash" TEXT,
ADD COLUMN     "demandAmountApprovedAt" TIMESTAMP(3),
ADD COLUMN     "demandAmountApprovedById" TEXT,
ADD COLUMN     "demandAmountApprovedByName" TEXT,
ADD COLUMN     "demandAmountRationale" TEXT;

-- CreateTable
CREATE TABLE "demand_audits" (
    "id" TEXT NOT NULL,
    "demandLetterId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "letterVersion" INTEGER NOT NULL,
    "draftHash" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "evidenceCutoff" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "aiStatus" TEXT,
    "aiError" TEXT,
    "summary" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "demand_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_audit_findings" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "claim" TEXT,
    "support" TEXT,
    "evidence" TEXT,
    "recommendation" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionId" TEXT,

    CONSTRAINT "demand_audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_audit_resolutions" (
    "id" TEXT NOT NULL,
    "demandLetterId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorIsAttorney" BOOLEAN NOT NULL DEFAULT false,
    "letterVersion" INTEGER NOT NULL,
    "auditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_audit_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demand_audits_demandLetterId_startedAt_idx" ON "demand_audits"("demandLetterId", "startedAt");

-- CreateIndex
CREATE INDEX "demand_audits_assessmentId_idx" ON "demand_audits"("assessmentId");

-- CreateIndex
CREATE INDEX "demand_audit_findings_auditId_idx" ON "demand_audit_findings"("auditId");

-- CreateIndex
CREATE INDEX "demand_audit_resolutions_demandLetterId_fingerprint_idx" ON "demand_audit_resolutions"("demandLetterId", "fingerprint");

-- AddForeignKey
ALTER TABLE "demand_audits" ADD CONSTRAINT "demand_audits_demandLetterId_fkey" FOREIGN KEY ("demandLetterId") REFERENCES "demand_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_audit_findings" ADD CONSTRAINT "demand_audit_findings_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "demand_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_audit_resolutions" ADD CONSTRAINT "demand_audit_resolutions_demandLetterId_fkey" FOREIGN KEY ("demandLetterId") REFERENCES "demand_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

