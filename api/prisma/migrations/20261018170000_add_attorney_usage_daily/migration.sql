-- Per-user, per-day workspace usage (active minutes, screen and feature counts)
-- for the admin attorney activity report.

CREATE TABLE IF NOT EXISTS "attorney_usage_daily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lawFirmId" TEXT,
    "day" TEXT NOT NULL,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,
    "screens" TEXT,
    "features" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "attorney_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attorney_usage_daily_userId_day_key" ON "attorney_usage_daily"("userId", "day");
CREATE INDEX IF NOT EXISTS "attorney_usage_daily_lawFirmId_day_idx" ON "attorney_usage_daily"("lawFirmId", "day");
CREATE INDEX IF NOT EXISTS "attorney_usage_daily_day_idx" ON "attorney_usage_daily"("day");

CREATE INDEX IF NOT EXISTS "attorney_activity_events_actorUserId_occurredAt_idx" ON "attorney_activity_events"("actorUserId", "occurredAt");
