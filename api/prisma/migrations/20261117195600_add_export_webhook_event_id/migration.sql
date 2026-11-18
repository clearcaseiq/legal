ALTER TABLE "data_export_runs"
  ADD COLUMN IF NOT EXISTS "webhookEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "data_export_runs_webhookEventId_key"
  ON "data_export_runs"("webhookEventId");
