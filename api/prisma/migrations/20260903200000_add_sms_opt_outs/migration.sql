-- SMS opt-out. Keyed on the phone number rather than a user because the
-- claimant-facing sends read `IntakeLead.phone`, and an intake lead frequently
-- has no user row at all.
CREATE TABLE "sms_opt_outs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "keyword" TEXT,
    "source" TEXT NOT NULL DEFAULT 'inbound_sms',
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_opt_outs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_opt_outs_phone_key" ON "sms_opt_outs"("phone");

CREATE INDEX "sms_opt_outs_optedInAt_idx" ON "sms_opt_outs"("optedInAt");
