-- Import identity for attorney-imported caseloads.
--
-- The external id previously lived only inside the `facts` JSON blob, where
-- nothing could key on it, so re-uploading the same CSV export created a fresh
-- duplicate of every case in it.
--
-- Scoped to the owner rather than globally unique: two firms exporting from
-- their own Clio instances will collide on matter numbers as low as '1'.
-- `import_owner_key` is the firm, or the importing attorney when they have no
-- firm — denormalized because Postgres treats NULLs as distinct in a unique
-- index, so keying on the nullable law_firm_id would silently let a solo
-- attorney duplicate their entire caseload on every re-upload.
--
-- All three columns are NULL for cases that did not come from an import, and
-- the unique index does not constrain rows with NULLs, so existing cases and
-- every ordinary intake are unaffected.

ALTER TABLE "assessments" ADD COLUMN "importSource" TEXT;
ALTER TABLE "assessments" ADD COLUMN "importExternalId" TEXT;
ALTER TABLE "assessments" ADD COLUMN "importOwnerKey" TEXT;

CREATE UNIQUE INDEX "assessments_importOwnerKey_importSource_importExternalId_key"
  ON "assessments" ("importOwnerKey", "importSource", "importExternalId");
