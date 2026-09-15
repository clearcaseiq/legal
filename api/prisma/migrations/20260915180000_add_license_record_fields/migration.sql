-- A bar lookup returns more than a boolean: the licence status, and the name the
-- State Bar publishes for that number. Both are needed to explain why a badge
-- was withheld, and the name is what makes the lookup identity evidence rather
-- than proof that some stranger's number is active.
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "licenseStatus" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "licenseRecordName" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "licenseNameMatch" TEXT;
