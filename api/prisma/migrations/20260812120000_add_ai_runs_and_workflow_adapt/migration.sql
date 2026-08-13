-- AiRun audit table + CaseWorkflow adaptation metadata.
CREATE TABLE IF NOT EXISTS "ai_runs" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "assessmentId" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "status" TEXT NOT NULL,
  "inputSummary" JSONB,
  "outputSummary" JSONB,
  "error" TEXT,
  "latencyMs" INTEGER,
  "tokenUsage" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_runs_assessmentId_kind_idx" ON "ai_runs"("assessmentId", "kind");
CREATE INDEX IF NOT EXISTS "ai_runs_kind_createdAt_idx" ON "ai_runs"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_runs_createdAt_idx" ON "ai_runs"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ai_runs"
    ADD CONSTRAINT "ai_runs_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "case_workflows" ADD COLUMN IF NOT EXISTS "aiAdaptedAt" TIMESTAMP(3);
ALTER TABLE "case_workflows" ADD COLUMN IF NOT EXISTS "aiAdaptRationale" TEXT;
ALTER TABLE "case_workflows" ADD COLUMN IF NOT EXISTS "aiAdaptRunId" TEXT;
