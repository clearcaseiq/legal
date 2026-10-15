-- Workflow steps that are tracked on the pipeline but do not hold their stage
-- open. The statute-of-limitations deadline is the case: it stays open for the
-- life of the case, so as an ordinary pending step it would keep Case Opening
-- the current stage until the claim resolved.
ALTER TABLE "case_workflow_items" ADD COLUMN IF NOT EXISTS "blocksStage" BOOLEAN NOT NULL DEFAULT true;
