-- CreateTable
CREATE TABLE "attorney_activity_events" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lawFirmId" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "assessmentId" TEXT,
    "leadId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "taskOrigin" TEXT,
    "properties" TEXT,
    "context" TEXT,

    CONSTRAINT "attorney_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attorney_activity_events_lawFirmId_occurredAt_idx" ON "attorney_activity_events"("lawFirmId", "occurredAt");

-- CreateIndex
CREATE INDEX "attorney_activity_events_assessmentId_occurredAt_idx" ON "attorney_activity_events"("assessmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "attorney_activity_events_action_occurredAt_idx" ON "attorney_activity_events"("action", "occurredAt");
