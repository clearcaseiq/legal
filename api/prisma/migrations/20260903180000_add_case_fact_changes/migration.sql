-- Per-field authorship for Assessment.facts.
--
-- case_change_events records that a case changed and who caused it. This records
-- which field went from what to what, which is what lets a human resolve a
-- disagreement between a claimant's answer and a specialist's correction rather
-- than one silently overwriting the other.

CREATE TABLE "case_fact_changes" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "previousValue" TEXT,
    "nextValue" TEXT,
    "revision" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_fact_changes_pkey" PRIMARY KEY ("id")
);

-- "who last touched this field", the lookup on-behalf editing needs.
CREATE INDEX "case_fact_changes_assessmentId_path_createdAt_idx"
    ON "case_fact_changes"("assessmentId", "path", "createdAt");

CREATE INDEX "case_fact_changes_assessmentId_revision_idx"
    ON "case_fact_changes"("assessmentId", "revision");

ALTER TABLE "case_fact_changes"
    ADD CONSTRAINT "case_fact_changes_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
