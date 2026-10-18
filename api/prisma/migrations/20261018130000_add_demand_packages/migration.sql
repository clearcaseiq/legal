-- Built PDF demand packages: background build status, exhibit selection, Bates
-- range, the stored file, and the share link / send record for the adjuster.

CREATE TABLE IF NOT EXISTS "demand_packages" (
    "id" TEXT NOT NULL,
    "demandLetterId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "config" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "letterVersion" INTEGER,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "exhibitCount" INTEGER,
    "batesPrefix" TEXT,
    "batesStart" INTEGER,
    "batesEnd" INTEGER,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentById" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "requestedByAttorneyId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "demand_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "demand_packages_shareToken_key" ON "demand_packages"("shareToken");
CREATE INDEX IF NOT EXISTS "demand_packages_demandLetterId_createdAt_idx" ON "demand_packages"("demandLetterId", "createdAt");
CREATE INDEX IF NOT EXISTS "demand_packages_assessmentId_idx" ON "demand_packages"("assessmentId");
CREATE INDEX IF NOT EXISTS "demand_packages_status_idx" ON "demand_packages"("status");

ALTER TABLE "demand_packages" DROP CONSTRAINT IF EXISTS "demand_packages_demandLetterId_fkey";
ALTER TABLE "demand_packages" ADD CONSTRAINT "demand_packages_demandLetterId_fkey"
    FOREIGN KEY ("demandLetterId") REFERENCES "demand_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
