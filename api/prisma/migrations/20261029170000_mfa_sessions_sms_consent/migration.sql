-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "mfaPendingSecret" TEXT,
ADD COLUMN     "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN     "mfaRecoveryCodes" TEXT,
ADD COLUMN     "mfaLastUsedStep" INTEGER,
ADD COLUMN     "mfaFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaLockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE INDEX "consents_phone_consentType_idx" ON "consents"("phone", "consentType");

-- MFA is enforced on the resolved role. Attorney accounts created before
-- attorney signup set User.role still carry the default 'client', and
-- /auth/login already refuses them, so they are attorneys in every sense but
-- the column.
UPDATE "users" u
SET "role" = 'attorney'
WHERE u."role" = 'client'
  AND EXISTS (SELECT 1 FROM "attorneys" a WHERE lower(a."email") = lower(u."email"));
