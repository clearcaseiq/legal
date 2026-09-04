-- Calibration grades the engine that produces the claimant-facing number, which
-- is the underwriting engine rather than the heuristic one. It takes different
-- inputs from computeFeatures, so it needs its own point-in-time snapshot.
ALTER TABLE "case_outcomes" ADD COLUMN "underwritingSnapshot" TEXT;
