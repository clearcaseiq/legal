-- Editable, AI-drafted demand letters with real version history.
--
-- Before this, a demand letter was a single immutable text blob with no author,
-- no history, and no way to edit it: every "edit" in the UI created a brand-new
-- row, so a case accumulated an unlabelled pile of drafts. These columns add
-- authorship, a review gate mirroring CaseTask, and a companion versions table.
--
-- "title" is also a genuine bug fix: api/src/routes/case-tracker.ts already
-- selects DemandLetter.title, which would throw against a real database because
-- the column never existed (the tests pass only because Prisma is mocked).
--
-- All columns are nullable or defaulted so existing letters keep working and
-- keep reading as plain drafts. Idempotent, so this file is safe to re-run.

ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'attorney';
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "contentSource" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "reviewedByName" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "updatedByName" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "currentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "finalizedByName" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "autoDraftKey" TEXT;

-- Holds the assessment id on a letter the AI drafted on its own, so at most one
-- such letter can ever exist per case. This is the real concurrency guard: the
-- coach loop runs from several triggers at once and an LLM call sits between
-- reading "does a letter exist" and inserting one.
CREATE UNIQUE INDEX IF NOT EXISTS "demand_letters_autoDraftKey_key" ON "demand_letters"("autoDraftKey");

-- The original column was created as VARCHAR by the legacy MySQL init; widen it
-- so a full letter can never be truncated.
ALTER TABLE "demand_letters" ALTER COLUMN "content" TYPE TEXT;

CREATE INDEX IF NOT EXISTS "demand_letters_assessmentId_idx" ON "demand_letters"("assessmentId");

CREATE TABLE IF NOT EXISTS "demand_letter_versions" (
    "id" TEXT NOT NULL,
    "demandLetterId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_letter_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "demand_letter_versions_demandLetterId_version_key"
    ON "demand_letter_versions"("demandLetterId", "version");
CREATE INDEX IF NOT EXISTS "demand_letter_versions_demandLetterId_idx"
    ON "demand_letter_versions"("demandLetterId");

DO $$
BEGIN
    ALTER TABLE "demand_letter_versions"
        ADD CONSTRAINT "demand_letter_versions_demandLetterId_fkey"
        FOREIGN KEY ("demandLetterId") REFERENCES "demand_letters"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Seed version 1 for every existing letter so history is never empty and the
-- editor has something to diff against.
INSERT INTO "demand_letter_versions" ("id", "demandLetterId", "version", "content", "source", "createdAt")
SELECT
    'dlv_' || "id",
    "id",
    1,
    "content",
    'deterministic',
    "createdAt"
FROM "demand_letters"
ON CONFLICT DO NOTHING;
