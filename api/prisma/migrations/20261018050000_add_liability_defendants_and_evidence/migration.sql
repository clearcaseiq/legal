-- A case can have several defendants and several pieces of liability evidence.
-- The single-value columns on liability_records stay as a rollup of these.

CREATE TABLE IF NOT EXISTS "liability_defendants" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'driver',
    "faultPct" INTEGER,
    "insurerName" TEXT,
    "insuranceDetailId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "counselName" TEXT,
    "counselFirm" TEXT,
    "counselPhone" TEXT,
    "counselEmail" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "liability_defendants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "liability_defendants_assessmentId_idx" ON "liability_defendants"("assessmentId");

ALTER TABLE "liability_defendants" DROP CONSTRAINT IF EXISTS "liability_defendants_assessmentId_fkey";
ALTER TABLE "liability_defendants" ADD CONSTRAINT "liability_defendants_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "liability_evidence_items" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needed',
    "referenceNumber" TEXT,
    "date" TIMESTAMP(3),
    "description" TEXT,
    "evidenceFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "liability_evidence_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "liability_evidence_items_assessmentId_idx" ON "liability_evidence_items"("assessmentId");

ALTER TABLE "liability_evidence_items" DROP CONSTRAINT IF EXISTS "liability_evidence_items_assessmentId_fkey";
ALTER TABLE "liability_evidence_items" ADD CONSTRAINT "liability_evidence_items_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over what each case already records.
INSERT INTO "liability_defendants" ("id", "assessmentId", "name", "faultPct", "insurerName", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || lr."id"), lr."assessmentId",
       COALESCE(NULLIF(TRIM(lr."defendantName"), ''), 'Defendant'), lr."defendantFaultPct",
       NULLIF(TRIM(lr."defendantInsurer"), ''), CURRENT_TIMESTAMP
FROM "liability_records" lr
WHERE (NULLIF(TRIM(lr."defendantName"), '') IS NOT NULL OR NULLIF(TRIM(lr."defendantInsurer"), '') IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "liability_defendants" d WHERE d."assessmentId" = lr."assessmentId");

INSERT INTO "liability_evidence_items" ("id", "assessmentId", "type", "status", "referenceNumber", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || lr."id" || 'pr'), lr."assessmentId", 'police_report',
       lr."policeReportStatus", NULLIF(TRIM(lr."policeReportNumber"), ''), CURRENT_TIMESTAMP
FROM "liability_records" lr
WHERE lr."policeReportStatus" IN ('requested', 'received')
  AND NOT EXISTS (SELECT 1 FROM "liability_evidence_items" e WHERE e."assessmentId" = lr."assessmentId");

INSERT INTO "liability_evidence_items" ("id", "assessmentId", "type", "status", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || lr."id" || 'ph'), lr."assessmentId", 'photos', 'received', CURRENT_TIMESTAMP
FROM "liability_records" lr
WHERE lr."hasPhotos" = true
  AND NOT EXISTS (SELECT 1 FROM "liability_evidence_items" e WHERE e."assessmentId" = lr."assessmentId" AND e."type" = 'photos');

INSERT INTO "liability_evidence_items" ("id", "assessmentId", "type", "status", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || lr."id" || 'vd'), lr."assessmentId", 'video', 'received', CURRENT_TIMESTAMP
FROM "liability_records" lr
WHERE lr."hasVideo" = true
  AND NOT EXISTS (SELECT 1 FROM "liability_evidence_items" e WHERE e."assessmentId" = lr."assessmentId" AND e."type" = 'video');

INSERT INTO "liability_evidence_items" ("id", "assessmentId", "type", "status", "description", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || lr."id" || 'w' || n::text), lr."assessmentId", 'witness_statement',
       'needed', 'Witness ' || n::text, CURRENT_TIMESTAMP
FROM "liability_records" lr
CROSS JOIN LATERAL generate_series(1, GREATEST(lr."witnessCount", CASE WHEN lr."hasWitnesses" THEN 1 ELSE 0 END)) AS n
WHERE NOT EXISTS (SELECT 1 FROM "liability_evidence_items" e WHERE e."assessmentId" = lr."assessmentId" AND e."type" = 'witness_statement');
