-- Lead quality controls for paid traffic.
--
-- The IP address and Turnstile outcome let suspicious leads be reported to the
-- ad agency without sharing contact details. ipAddress is cleared after 180 days
-- by the IP retention sweep. Not backfilled: older leads recorded no client IP,
-- and before the load-balancer fix the address seen was an internal one anyway.
ALTER TABLE "intake_leads" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN IF NOT EXISTS "captchaPassed" BOOLEAN;
ALTER TABLE "intake_leads" ADD COLUMN IF NOT EXISTS "repeatCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "intake_leads_createdAt_idx" ON "intake_leads"("createdAt");

-- "Qualified lead" offline conversions, one per case. A separate table so the
-- unique assessmentId on ads_conversion_uploads stays the retained-case dedup key.
CREATE TABLE IF NOT EXISTS "ads_qualified_conversion_uploads" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "gclid" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "convertedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_qualified_conversion_uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ads_qualified_conversion_uploads_assessmentId_key"
    ON "ads_qualified_conversion_uploads"("assessmentId");
CREATE INDEX IF NOT EXISTS "ads_qualified_conversion_uploads_status_attempts_idx"
    ON "ads_qualified_conversion_uploads"("status", "attempts");
