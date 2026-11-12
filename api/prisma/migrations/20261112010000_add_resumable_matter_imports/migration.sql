CREATE TABLE "matter_import_runs" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceChecksum" TEXT NOT NULL,
    "duplicateMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "fixtureVersion" TEXT,
    "sanitizationVersion" TEXT,
    "totalMatters" INTEGER NOT NULL DEFAULT 0,
    "completedMatters" INTEGER NOT NULL DEFAULT 0,
    "failedMatters" INTEGER NOT NULL DEFAULT 0,
    "reconciliation" JSONB,
    "error" TEXT,
    "completedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "matter_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matter_import_matters" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "report" JSONB,
    "error" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "matter_import_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matter_import_records" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceData" JSONB NOT NULL,
    "relationshipKeys" JSONB,
    "targetModel" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'created',
    "beforeData" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "matter_import_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "matter_import_runs_ownerKey_source_sourceChecksum_status_idx"
ON "matter_import_runs"("ownerKey", "source", "sourceChecksum", "status");

CREATE INDEX "matter_import_runs_attorneyId_createdAt_idx"
ON "matter_import_runs"("attorneyId", "createdAt");

CREATE UNIQUE INDEX "matter_import_matters_runId_externalId_key"
ON "matter_import_matters"("runId", "externalId");

CREATE INDEX "matter_import_matters_assessmentId_idx"
ON "matter_import_matters"("assessmentId");

CREATE UNIQUE INDEX "matter_import_records_runId_matterId_sourceKey_key"
ON "matter_import_records"("runId", "matterId", "sourceKey");

CREATE INDEX "matter_import_records_assessmentId_sourceKey_idx"
ON "matter_import_records"("assessmentId", "sourceKey");

CREATE INDEX "matter_import_records_targetModel_targetId_idx"
ON "matter_import_records"("targetModel", "targetId");

ALTER TABLE "matter_import_matters"
ADD CONSTRAINT "matter_import_matters_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "matter_import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matter_import_records"
ADD CONSTRAINT "matter_import_records_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "matter_import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matter_import_records"
ADD CONSTRAINT "matter_import_records_matterId_fkey"
FOREIGN KEY ("matterId") REFERENCES "matter_import_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
