-- One-time codes a claimant enters before their case is sent to attorneys.
CREATE TABLE IF NOT EXISTS "case_submit_otps" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_submit_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_submit_otps_assessmentId_createdAt_idx"
    ON "case_submit_otps"("assessmentId", "createdAt");
