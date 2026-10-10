-- AlterTable
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "evidenceNotes" JSONB;
