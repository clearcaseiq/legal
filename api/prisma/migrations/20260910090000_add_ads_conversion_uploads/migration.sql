-- Conversions reported back to Google Ads when a case is retained.
--
-- Ads knows it produced a click but cannot know the click became a signed case:
-- the intake wizard and results page carry no tag, by design, because their URLs
-- can hold an assessment id or a claim token. Offline conversion import is the
-- only way to give Ads that signal, and this table is the record of what was
-- sent, when, and whether it worked.
CREATE TABLE "ads_conversion_uploads" (
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

    CONSTRAINT "ads_conversion_uploads_pkey" PRIMARY KEY ("id")
);

-- One conversion per case. This constraint is the dedup guarantee: reporting a
-- retention twice would double-count it in Ads and inflate whatever the bidding
-- strategy optimises against.
CREATE UNIQUE INDEX "ads_conversion_uploads_assessmentId_key" ON "ads_conversion_uploads"("assessmentId");

-- Drives the sweep's "what still needs sending" query.
CREATE INDEX "ads_conversion_uploads_status_attempts_idx" ON "ads_conversion_uploads"("status", "attempts");

-- Supports the sweep that finds retained cases carrying a click id.
CREATE INDEX "intake_leads_gclid_idx" ON "intake_leads"("gclid");
