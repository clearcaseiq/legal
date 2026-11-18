ALTER TABLE "sync_api_keys"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "data_export_runs" (
  "id" TEXT PRIMARY KEY,
  "lawFirmId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "requestedBySyncKeyId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'snapshot',
  "sinceCursor" INTEGER,
  "cutoffCursor" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "failedAt" TIMESTAMPTZ,
  "error" TEXT,
  "rowCounts" TEXT,
  "reconciliation" TEXT,
  "filePath" TEXT,
  "fileSize" INTEGER,
  "contentHash" VARCHAR(64),
  "manifestHash" VARCHAR(64),
  "expiresAt" TIMESTAMPTZ,
  "webhookUrl" TEXT,
  "webhookSecret" TEXT,
  "webhookStatus" TEXT,
  "webhookAttempts" INTEGER NOT NULL DEFAULT 0,
  "webhookNextAttemptAt" TIMESTAMPTZ,
  "webhookDeliveredAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "data_export_artifacts" (
  "id" TEXT PRIMARY KEY,
  "exportRunId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "sourceId" TEXT,
  "archivePath" TEXT NOT NULL,
  "rowCount" INTEGER,
  "byteSize" INTEGER NOT NULL,
  "contentHash" VARCHAR(64) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "error" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "data_export_artifacts_exportRunId_fkey"
    FOREIGN KEY ("exportRunId") REFERENCES "data_export_runs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "data_export_runs_lawFirmId_createdAt_idx"
  ON "data_export_runs"("lawFirmId", "createdAt");
CREATE INDEX IF NOT EXISTS "data_export_runs_status_createdAt_idx"
  ON "data_export_runs"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "data_export_runs_webhookStatus_webhookNextAttemptAt_idx"
  ON "data_export_runs"("webhookStatus", "webhookNextAttemptAt");
CREATE UNIQUE INDEX IF NOT EXISTS "data_export_artifacts_exportRunId_archivePath_key"
  ON "data_export_artifacts"("exportRunId", "archivePath");
CREATE INDEX IF NOT EXISTS "data_export_artifacts_exportRunId_kind_idx"
  ON "data_export_artifacts"("exportRunId", "kind");
