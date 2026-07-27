-- Personal-injury segmentation (Phase 2).
--
-- California does not certify personal injury as a legal specialty, so there is
-- no roster to look up and PI practice must be inferred from evidence. Two new
-- tables hold that inference:
--
--   segment_signals   one row per piece of evidence, with its source and date
--   attorney_segments the derived score for one attorney or firm
--
-- Signals are kept separately from scores so that changing the scoring weights
-- means recomputing, not re-gathering, and so a reviewer can see exactly why an
-- entity was classified. attorney_segments is entirely derived and can be
-- rebuilt from signals at any time.
--
-- Both tables carry nullable attorneyId and lawFirmId, exactly one of which is
-- set: evidence attaches to whichever level it actually describes. Court filings
-- name an attorney; a website describes a firm.
--
-- Every statement is idempotent, so this file is safe to re-run.

CREATE TABLE IF NOT EXISTS "segment_signals" (
  "id"         TEXT NOT NULL,
  "attorneyId" TEXT,
  "lawFirmId"  TEXT,
  "source"     TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "side"       TEXT,
  "subtype"    TEXT,
  "count"      INTEGER NOT NULL DEFAULT 1,
  "weight"     DOUBLE PRECISION,
  "value"      TEXT,
  "sourceRef"  VARCHAR(1024),
  "observedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "segment_signals_pkey" PRIMARY KEY ("id")
);

-- Re-deriving a source updates rows in place instead of piling up duplicates.
-- NULLs are distinct in Postgres unique indexes, so the attorney-level index
-- does not constrain firm-level rows and vice versa.
CREATE UNIQUE INDEX IF NOT EXISTS "segment_signals_attorneyId_source_kind_key"
  ON "segment_signals"("attorneyId", "source", "kind");

CREATE UNIQUE INDEX IF NOT EXISTS "segment_signals_lawFirmId_source_kind_key"
  ON "segment_signals"("lawFirmId", "source", "kind");

CREATE INDEX IF NOT EXISTS "segment_signals_attorneyId_idx"
  ON "segment_signals"("attorneyId");

CREATE INDEX IF NOT EXISTS "segment_signals_lawFirmId_idx"
  ON "segment_signals"("lawFirmId");

CREATE INDEX IF NOT EXISTS "segment_signals_source_kind_idx"
  ON "segment_signals"("source", "kind");

CREATE TABLE IF NOT EXISTS "attorney_segments" (
  "id"                TEXT NOT NULL,
  "attorneyId"        TEXT,
  "lawFirmId"         TEXT,
  "piScore"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "piSide"            TEXT NOT NULL DEFAULT 'unknown',
  "sideConfidence"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "piSubtypes"        TEXT,
  "confidence"        TEXT NOT NULL DEFAULT 'none',
  "claimantEligible"  BOOLEAN NOT NULL DEFAULT false,
  "eligibilityReason" TEXT,
  "rationale"         TEXT,
  "breakdown"         TEXT,
  "signalCount"       INTEGER NOT NULL DEFAULT 0,
  "inheritedFromFirm" BOOLEAN NOT NULL DEFAULT false,
  "scoreVersion"      TEXT NOT NULL,
  "scoredAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "attorney_segments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attorney_segments_attorneyId_key"
  ON "attorney_segments"("attorneyId");

CREATE UNIQUE INDEX IF NOT EXISTS "attorney_segments_lawFirmId_key"
  ON "attorney_segments"("lawFirmId");

-- Routing reads these: "plaintiff-side firms above a score threshold".
CREATE INDEX IF NOT EXISTS "attorney_segments_piSide_piScore_idx"
  ON "attorney_segments"("piSide", "piScore");

CREATE INDEX IF NOT EXISTS "attorney_segments_claimantEligible_idx"
  ON "attorney_segments"("claimantEligible");

-- Lets a weight change be rolled out by recomputing only stale score versions.
CREATE INDEX IF NOT EXISTS "attorney_segments_scoreVersion_idx"
  ON "attorney_segments"("scoreVersion");

DO $$
BEGIN
  ALTER TABLE "segment_signals" ADD CONSTRAINT "segment_signals_attorneyId_fkey"
    FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "segment_signals" ADD CONSTRAINT "segment_signals_lawFirmId_fkey"
    FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "attorney_segments" ADD CONSTRAINT "attorney_segments_attorneyId_fkey"
    FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "attorney_segments" ADD CONSTRAINT "attorney_segments_lawFirmId_fkey"
    FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
