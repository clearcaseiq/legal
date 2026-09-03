-- Human-assisted intake. One row per assessment, created when the report
-- generates, which is before the plaintiff submits for attorney review — hence
-- the FK to "assessments" rather than to "lead_submissions".
CREATE TABLE IF NOT EXISTS "case_assistance" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "assignedSpecialistId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new_submission',
  "nextAction" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "assignedAt" TIMESTAMP(3),
  "reviewDueAt" TIMESTAMP(3),
  "lastContactAt" TIMESTAMP(3),
  "firstContactAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_assistance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "case_assistance_assessmentId_key" ON "case_assistance" ("assessmentId");
-- The queue's three tabs: mine, unassigned, and everything by status.
CREATE INDEX IF NOT EXISTS "case_assistance_assignedSpecialistId_status_idx" ON "case_assistance" ("assignedSpecialistId", "status");
CREATE INDEX IF NOT EXISTS "case_assistance_status_createdAt_idx" ON "case_assistance" ("status", "createdAt");

-- Durable contact log. Nothing recorded manual outreach before this:
-- "platform_notification_events" holds only machine-sent notifications.
CREATE TABLE IF NOT EXISTS "case_interactions" (
  "id" TEXT NOT NULL,
  "assistanceId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "specialistId" TEXT,
  "specialistName" TEXT,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "outcome" TEXT,
  "notes" TEXT,
  "documentRequestId" TEXT,
  "notificationEventId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_interactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_interactions_assistanceId_occurredAt_idx" ON "case_interactions" ("assistanceId", "occurredAt");
CREATE INDEX IF NOT EXISTS "case_interactions_assessmentId_occurredAt_idx" ON "case_interactions" ("assessmentId", "occurredAt");

-- Deactivating an employee account must not delete their case history, so the
-- specialist FKs null out while "specialistName" keeps the timeline readable.
ALTER TABLE "case_assistance"
  ADD CONSTRAINT "case_assistance_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_assistance"
  ADD CONSTRAINT "case_assistance_assignedSpecialistId_fkey"
  FOREIGN KEY ("assignedSpecialistId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_interactions"
  ADD CONSTRAINT "case_interactions_assistanceId_fkey"
  FOREIGN KEY ("assistanceId") REFERENCES "case_assistance" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_interactions"
  ADD CONSTRAINT "case_interactions_specialistId_fkey"
  FOREIGN KEY ("specialistId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
