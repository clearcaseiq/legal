-- Last heartbeat from an open web session, for the online indicator between a
-- plaintiff and their attorney. Null until the user's first visit after release.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
