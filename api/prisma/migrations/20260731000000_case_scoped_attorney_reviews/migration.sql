-- Case-scoped attorney reviews (CP-480).
--
-- A review used to be identified by the (attorney, plaintiff) pair, so a
-- plaintiff who worked with the same attorney on two matters could hold only one
-- review and the second silently overwrote the first. The case is now part of
-- the key.
--
-- This exists as a file because `prisma db push` refuses to apply it
-- unattended. Adding a unique constraint is classed as a possible-data-loss
-- change and requires --accept-data-loss, which the entrypoint deliberately does
-- not pass: that flag would also let genuinely destructive changes through on
-- every future deploy. The warning is precautionary rather than a detected
-- conflict — the old constraint already guaranteed (attorneyId, userId) was
-- unique, so the three-column constraint is strictly weaker and every existing
-- row satisfies it by construction.
--
-- Apply this once, by hand, and `db push` then sees no difference and boots
-- normally. See deploy/README.md.
--
-- Contains exactly what schema.prisma implies and nothing more: any extra index
-- added here would be dropped again by the next `db push`.
--
-- Idempotent, so this file is safe to re-run.

ALTER TABLE "attorney_reviews" ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;

DO $$
BEGIN
  ALTER TABLE "attorney_reviews"
    ADD CONSTRAINT "attorney_reviews_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order matters: the old two-column constraint has to go before the three-column
-- one is added, or the pair stays enforced and a second review for a different
-- case is still rejected.
ALTER TABLE "attorney_reviews"
  DROP CONSTRAINT IF EXISTS "attorney_reviews_attorneyId_userId_key";

DO $$
BEGIN
  ALTER TABLE "attorney_reviews"
    ADD CONSTRAINT "attorney_reviews_attorneyId_userId_assessmentId_key"
    UNIQUE ("attorneyId", "userId", "assessmentId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
