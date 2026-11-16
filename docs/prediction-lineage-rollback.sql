-- DESTRUCTIVE EMERGENCY ROLLBACK.
-- Export lineage and attorney feedback before running this file.
-- Application rollback should normally happen without reverting this additive
-- migration; use this only when the database itself must return to the prior
-- schema.

BEGIN;

ALTER TABLE "attorney_case_reviews"
  DROP CONSTRAINT "attorney_case_reviews_predictionId_fkey";
DROP INDEX "attorney_case_reviews_attorneyId_predictionId_key";
DROP INDEX "attorney_case_reviews_predictionId_idx";
ALTER TABLE "attorney_case_reviews"
  DROP COLUMN "predictionId",
  DROP COLUMN "liabilityDisagrees",
  DROP COLUMN "liabilityScore",
  DROP COLUMN "liabilityNotes",
  DROP COLUMN "evidenceDisagrees",
  DROP COLUMN "evidenceRecommendations",
  DROP COLUMN "evidenceNotes",
  DROP COLUMN "valuationDisagrees",
  DROP COLUMN "valuationNotes";

ALTER TABLE "predictions"
  DROP CONSTRAINT "predictions_triggerEventId_fkey";
ALTER TABLE "predictions"
  DROP CONSTRAINT "predictions_assessmentId_fkey";
DROP INDEX "predictions_lineage_dedupe_key";
DROP INDEX "predictions_inputHash_idx";
DROP INDEX "predictions_triggerEventId_idx";
DROP INDEX "predictions_assessmentId_assessmentRevision_idx";
ALTER TABLE "predictions"
  DROP COLUMN "assessmentRevision",
  DROP COLUMN "triggerEventId",
  DROP COLUMN "inputHash",
  DROP COLUMN "inputSnapshot";
ALTER TABLE "predictions"
  ADD CONSTRAINT "predictions_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
