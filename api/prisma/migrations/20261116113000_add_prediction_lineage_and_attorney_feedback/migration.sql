-- Prediction lineage is nullable for legacy rows. Every writer after this
-- migration supplies the revision, trigger event, hash, and immutable snapshot.
ALTER TABLE "predictions"
  ADD COLUMN "assessmentRevision" INTEGER,
  ADD COLUMN "triggerEventId" TEXT,
  ADD COLUMN "inputHash" VARCHAR(64),
  ADD COLUMN "inputSnapshot" TEXT;

CREATE INDEX "predictions_assessmentId_assessmentRevision_idx"
  ON "predictions"("assessmentId", "assessmentRevision");
CREATE INDEX "predictions_triggerEventId_idx" ON "predictions"("triggerEventId");
CREATE INDEX "predictions_inputHash_idx" ON "predictions"("inputHash");
CREATE UNIQUE INDEX "predictions_lineage_dedupe_key"
  ON "predictions"("assessmentId", "assessmentRevision", "inputHash", "modelVersion");

-- Accidental Assessment deletion must not silently erase prediction history.
-- Authorized erasure and rollback paths explicitly delete reviews/predictions.
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_assessmentId_fkey";
ALTER TABLE "predictions"
  ADD CONSTRAINT "predictions_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "predictions"
  ADD CONSTRAINT "predictions_triggerEventId_fkey"
  FOREIGN KEY ("triggerEventId") REFERENCES "case_change_events"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Reuse the existing attorney review table. The AI output stays immutable in
-- predictions; this row records the attorney's separate opinion about it.
ALTER TABLE "attorney_case_reviews"
  ADD COLUMN "predictionId" TEXT,
  ADD COLUMN "liabilityDisagrees" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "liabilityScore" DOUBLE PRECISION,
  ADD COLUMN "liabilityNotes" TEXT,
  ADD COLUMN "evidenceDisagrees" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "evidenceRecommendations" TEXT,
  ADD COLUMN "evidenceNotes" TEXT,
  ADD COLUMN "valuationDisagrees" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "valuationNotes" TEXT;

CREATE INDEX "attorney_case_reviews_predictionId_idx"
  ON "attorney_case_reviews"("predictionId");
CREATE UNIQUE INDEX "attorney_case_reviews_attorneyId_predictionId_key"
  ON "attorney_case_reviews"("attorneyId", "predictionId");

ALTER TABLE "attorney_case_reviews"
  ADD CONSTRAINT "attorney_case_reviews_predictionId_fkey"
  FOREIGN KEY ("predictionId") REFERENCES "predictions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
