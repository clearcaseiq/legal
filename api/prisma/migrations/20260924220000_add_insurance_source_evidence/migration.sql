-- The uploaded insurance document a policy was recorded from.
ALTER TABLE "insurance_details" ADD COLUMN IF NOT EXISTS "sourceEvidenceFileId" TEXT;
