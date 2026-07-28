-- Task merging: fold several overlapping tasks into one surviving task.
--
-- Absorbed tasks are closed and tagged with the survivor's id rather than
-- deleted. Two independent reasons force that:
--
--   * The AI loops dedupe on lowercased title across EVERY status, so a deleted
--     coach task is recreated on the next run (the background sweep re-runs every
--     retained case on an interval). Keeping the row, title intact, is what makes
--     a merge stick.
--   * Nothing references CaseTask through a foreign key. "time_entries" and
--     "case_comment_threads" both point at a task via a bare string column with
--     no cascade, so a hard delete silently strands logged time and comments.
--
-- Task lists hide absorbed rows so a merge does not leave behind a pile of
-- "completed" work nobody actually did.
--
-- Idempotent, so this file is safe to re-run.

ALTER TABLE "case_tasks" ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT;

-- Every task list filters on this column, and it is the lookup used to resolve
-- "which task did this one get folded into".
CREATE INDEX IF NOT EXISTS "case_tasks_mergedIntoId_idx" ON "case_tasks" ("mergedIntoId");
