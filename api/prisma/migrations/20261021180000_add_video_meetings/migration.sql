-- CreateTable
CREATE TABLE "video_meetings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'zoom',
    "externalMeetingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'scheduled',
    "attorneyId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "appointmentId" TEXT,
    "userId" TEXT,
    "createdByUserId" TEXT,
    "topic" TEXT,
    "joinUrl" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "password" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "timeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_meetings_externalMeetingId_key" ON "video_meetings"("externalMeetingId");

-- CreateIndex
CREATE INDEX "video_meetings_attorneyId_idx" ON "video_meetings"("attorneyId");

-- CreateIndex
CREATE INDEX "video_meetings_assessmentId_idx" ON "video_meetings"("assessmentId");

-- CreateIndex
CREATE INDEX "video_meetings_appointmentId_idx" ON "video_meetings"("appointmentId");
