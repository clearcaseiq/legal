-- Case-scoped attorney reviews (CP-480).
--
-- A review used to be identified by the (attorney, plaintiff) pair, so a
-- plaintiff who worked with the same attorney on two matters could hold only one
-- review and the second silently overwrote the first. The case is now part of
-- the key.
--
-- This exists as a file because `prisma db push` refuses to apply it
-- unattended. Adding a unique key is classed as a possible-data-loss change and
-- requires --accept-data-loss, which the entrypoint deliberately does not pass:
-- that flag would also let genuinely destructive changes through on every future
-- deploy. The warning is precautionary rather than a detected conflict — the old
-- key already guaranteed (attorneyId, userId) was unique, so the three-column
-- key is strictly weaker and every existing row satisfies it by construction.
--
-- Apply this once, by hand, and `db push` then sees no difference and boots
-- normally. See deploy/README.md.
--
-- Written as indexes rather than table constraints because that is how Prisma
-- itself implements @@unique, and push compares against what Prisma would have
-- created. Contains exactly what schema.prisma implies and nothing more: any
-- extra index added here would be dropped again by the next push.
--
-- Idempotent, and free of DO blocks so it survives being piped through
-- `prisma db execute --stdin`.

ALTER TABLE "attorney_reviews" ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;

ALTER TABLE "attorney_reviews"
  DROP CONSTRAINT IF EXISTS "attorney_reviews_assessmentId_fkey";
ALTER TABLE "attorney_reviews"
  ADD CONSTRAINT "attorney_reviews_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Order matters: the old two-column key has to go before the three-column one is
-- added, or the pair stays enforced and a second review for a different case is
-- still rejected. Dropped twice because the key may exist either as a bare
-- unique index or as a UNIQUE constraint backed by one, and each form ignores
-- the other's DROP.
ALTER TABLE "attorney_reviews"
  DROP CONSTRAINT IF EXISTS "attorney_reviews_attorneyId_userId_key";
DROP INDEX IF EXISTS "attorney_reviews_attorneyId_userId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "attorney_reviews_attorneyId_userId_assessmentId_key"
  ON "attorney_reviews" ("attorneyId", "userId", "assessmentId");
