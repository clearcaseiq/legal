-- Medical records departments often accept requests only by fax, so a
-- provider contact can carry a fax number alongside (or instead of) an email.
ALTER TABLE "case_contacts" ADD COLUMN IF NOT EXISTS "fax" TEXT;
