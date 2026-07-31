-- Case-scoped consent records.
--
-- "consents" could only ever be keyed to a User, but intake is deliberately
-- anonymous: a visitor completes an assessment and authorizes disclosure of
-- their case to specific firms on /results, before any account exists. The
-- result was that the one authorization that has to be provable — permission to
-- send an identified person's injury facts to a law firm — was stored for
-- guests as a bare boolean inside assessment JSON, with no version, document
-- hash, IP, user agent or timestamp, while the well-designed audited table sat
-- behind auth middleware and never saw it.
--
-- Two changes make that record writable for a guest:
--   1. "userId" becomes nullable, so a consent need not belong to an account.
--   2. "assessmentId" scopes a consent to a single case, which is the right
--      grain for an authorization that names particular firms for one matter.
--
-- Deliberately NOT adding a CHECK that one of the two is present. A consent row
-- with neither would be meaningless, but a failed write here would break intake
-- submission, and the application already supplies one or the other.
--
-- Idempotent, so this file is safe to re-run.

ALTER TABLE "consents" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "consents" ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;

-- Which firms the authorization actually covers. Permission to disclose a case
-- to three named firms is not permission to disclose it to a fourth, so the
-- named set has to travel with the record rather than being inferred later from
-- whatever the routing queue happens to hold.
ALTER TABLE "consents" ADD COLUMN IF NOT EXISTS "metadata" TEXT;

-- Guest authorizations are looked up by case, and the routing gate does that
-- lookup on every wave, so the case+type pair is the hot path.
CREATE INDEX IF NOT EXISTS "consents_assessmentId_consentType_idx"
  ON "consents" ("assessmentId", "consentType");

CREATE INDEX IF NOT EXISTS "consents_userId_idx" ON "consents" ("userId");

DO $$
BEGIN
  ALTER TABLE "consents"
    ADD CONSTRAINT "consents_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
