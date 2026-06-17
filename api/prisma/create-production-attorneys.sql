-- Surgical, idempotent creation of the production_attorneys staging table.
-- Safe to run against production: only creates the new table + indexes,
-- never touches existing tables. Column/index names match Prisma conventions.

CREATE TABLE IF NOT EXISTS "production_attorneys" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'lawyers.com',
    "dedupeHash" VARCHAR(64) NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "firmName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" VARCHAR(1024),
    "profileUrl" VARCHAR(1024),
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "county" TEXT,
    "practiceAreas" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scraped',
    "promotedAttorneyId" TEXT,
    "sourcePage" INTEGER,
    "rawPayload" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_attorneys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "production_attorneys_source_dedupeHash_key"
    ON "production_attorneys" ("source", "dedupeHash");

CREATE INDEX IF NOT EXISTS "production_attorneys_source_status_idx"
    ON "production_attorneys" ("source", "status");

CREATE INDEX IF NOT EXISTS "production_attorneys_state_city_idx"
    ON "production_attorneys" ("state", "city");

CREATE INDEX IF NOT EXISTS "production_attorneys_phone_idx"
    ON "production_attorneys" ("phone");
