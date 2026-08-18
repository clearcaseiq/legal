-- Timestamped path through the intake funnel. `current_step` records where a
-- claimant stopped; this records how they got there and how long each step held
-- them, which is what per-step drop-off analysis actually needs.
ALTER TABLE "intake_leads" ADD COLUMN "stepHistory" TEXT;

-- Hot claimant read paths that were running without a supporting index.
-- "My cases, newest first" — the first query of every plaintiff session.
CREATE INDEX IF NOT EXISTS "assessments_userId_createdAt_idx" ON "assessments" ("userId", "createdAt");

-- Evidence is always read as "the files on this case" or "the files this user
-- owns", newest first. Neither had an index, so each list scanned the whole table.
CREATE INDEX IF NOT EXISTS "evidence_files_assessmentId_createdAt_idx" ON "evidence_files" ("assessmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "evidence_files_userId_createdAt_idx" ON "evidence_files" ("userId", "createdAt");

-- The notification bell polls one user's rows, newest first, on every visit.
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications" ("userId", "createdAt");

-- Attorney and firm dashboards read their pipeline by assignee and by stage.
CREATE INDEX IF NOT EXISTS "lead_submissions_assignedAttorneyId_status_idx" ON "lead_submissions" ("assignedAttorneyId", "status");
CREATE INDEX IF NOT EXISTS "lead_submissions_lifecycleState_idx" ON "lead_submissions" ("lifecycleState");
