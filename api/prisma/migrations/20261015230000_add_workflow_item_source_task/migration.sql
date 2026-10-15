-- Every task on a case now has a step in the case workflow. Most are linked
-- through the task's sourceTemplateStepId (wfitem:<stepId>), but insurance
-- follow-ups and template tasks already keep their own key there, so for those
-- the step points at the task instead.
ALTER TABLE "case_workflow_items" ADD COLUMN IF NOT EXISTS "sourceTaskId" TEXT;
CREATE INDEX IF NOT EXISTS "case_workflow_items_sourceTaskId_idx" ON "case_workflow_items"("sourceTaskId");
