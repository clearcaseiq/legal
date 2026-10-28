-- AlterTable
ALTER TABLE "intake_leads" ADD COLUMN     "visitId" TEXT;

-- CreateTable
CREATE TABLE "intake_visits" (
    "id" TEXT NOT NULL,
    "landingPath" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads_submitted_conversion_uploads" (
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

    CONSTRAINT "ads_submitted_conversion_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intake_visits_createdAt_idx" ON "intake_visits"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ads_submitted_conversion_uploads_assessmentId_key" ON "ads_submitted_conversion_uploads"("assessmentId");

-- CreateIndex
CREATE INDEX "ads_submitted_conversion_uploads_status_attempts_idx" ON "ads_submitted_conversion_uploads"("status", "attempts");

-- CreateIndex
CREATE INDEX "intake_leads_visitId_idx" ON "intake_leads"("visitId");

