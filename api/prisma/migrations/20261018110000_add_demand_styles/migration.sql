-- Firm demand templates: letterhead, sections, headings, tone and response
-- window for a firm's demand packages, and the one each letter was drafted with.

CREATE TABLE IF NOT EXISTS "demand_styles" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "demand_styles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "demand_styles_lawFirmId_idx" ON "demand_styles"("lawFirmId");

ALTER TABLE "demand_styles" DROP CONSTRAINT IF EXISTS "demand_styles_lawFirmId_fkey";
ALTER TABLE "demand_styles" ADD CONSTRAINT "demand_styles_lawFirmId_fkey"
    FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "demandStyleId" TEXT;
