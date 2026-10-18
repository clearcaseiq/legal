-- Medical charges carry what was paid and adjusted against them, and every
-- change to a ledger figure is kept.

ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "paidAmount" DOUBLE PRECISION;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "adjustedAmount" DOUBLE PRECISION;
ALTER TABLE "damage_items" ADD COLUMN IF NOT EXISTS "payer" TEXT;

CREATE TABLE IF NOT EXISTS "damage_item_changes" (
    "id" TEXT NOT NULL,
    "damageItemId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "reason" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "damage_item_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "damage_item_changes_damageItemId_createdAt_idx" ON "damage_item_changes"("damageItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "damage_item_changes_assessmentId_idx" ON "damage_item_changes"("assessmentId");

ALTER TABLE "damage_item_changes" DROP CONSTRAINT IF EXISTS "damage_item_changes_damageItemId_fkey";
ALTER TABLE "damage_item_changes" ADD CONSTRAINT "damage_item_changes_damageItemId_fkey"
    FOREIGN KEY ("damageItemId") REFERENCES "damage_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
