-- Whether the person named on a document is the claimant whose case it was
-- filed on. JSON, mirroring how "visionLabels" stores its verdict on the same
-- table.
--
-- Nullable and left null for every existing row: the comparison runs during
-- extraction, so a file processed before this column existed has no verdict
-- rather than a wrong one. Backfilling would mean re-OCRing the archive, and an
-- unchecked document must not be mistaken for a document that passed.
ALTER TABLE "evidence_files" ADD COLUMN IF NOT EXISTS "identityCheck" TEXT;
