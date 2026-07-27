-- Google Places firm discovery (Phase 3).
--
-- Staging table for law-firm office locations found through Google Places. Places
-- is a discovery source rather than a source of record: it supplies a business
-- name, address, phone, website and rating, but no attorney names or emails.
--
-- The column split matters legally, not just organisationally. Google's terms do
-- not permit building a permanent standalone database out of Maps content; Place
-- IDs are explicitly exempt and may be retained indefinitely, while other Places
-- content may only be cached temporarily. So:
--
--   * "placeId" and pipeline state are permanent.
--   * every "cached*" column is Google content and is purged at "cacheExpiresAt".
--   * "websiteDomain" is retained as the minimum bridge back to the firm's own
--     site, which is where the permanent record is sourced from instead.
--
-- Every statement is idempotent, so this file is safe to re-run.

CREATE TABLE IF NOT EXISTS "discovered_firm_locations" (
  "id"                     TEXT NOT NULL,
  "placeId"                TEXT NOT NULL,

  "discoveryQuery"         TEXT,
  "discoveryCity"          TEXT,

  -- Retained past cache expiry: the bridge to independent sourcing.
  "websiteDomain"          TEXT,

  -- Cached Google content. Cleared when "cacheExpiresAt" passes.
  "cachedName"             TEXT,
  "cachedFormattedAddress" TEXT,
  "cachedCity"             TEXT,
  "cachedCounty"           TEXT,
  "cachedState"            TEXT,
  "cachedPostalCode"       TEXT,
  "cachedPhone"            TEXT,
  "cachedWebsiteUri"       VARCHAR(1024),
  "cachedRating"           DOUBLE PRECISION,
  "cachedReviewCount"      INTEGER,
  "cachedOpeningHours"     TEXT,
  "cachedLatitude"         DOUBLE PRECISION,
  "cachedLongitude"        DOUBLE PRECISION,
  "cachedPrimaryType"      TEXT,
  "cachedTypes"            TEXT,
  "cachedGoogleMapsUri"    VARCHAR(1024),
  "cachedAt"               TIMESTAMP(3),
  "cacheExpiresAt"         TIMESTAMP(3),

  "status"                 TEXT NOT NULL DEFAULT 'discovered',
  "rejectionReason"        TEXT,
  "independentlySourcedAt" TIMESTAMP(3),
  "promotedLawFirmId"      TEXT,

  "firstSeenAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "discovered_firm_locations_pkey" PRIMARY KEY ("id")
);

-- Re-running discovery updates a listing in place instead of duplicating it.
CREATE UNIQUE INDEX IF NOT EXISTS "discovered_firm_locations_placeId_key"
  ON "discovered_firm_locations"("placeId");

CREATE INDEX IF NOT EXISTS "discovered_firm_locations_status_idx"
  ON "discovered_firm_locations"("status");

-- Offices are grouped into firms on this column.
CREATE INDEX IF NOT EXISTS "discovered_firm_locations_websiteDomain_idx"
  ON "discovered_firm_locations"("websiteDomain");

CREATE INDEX IF NOT EXISTS "discovered_firm_locations_cachedCounty_idx"
  ON "discovered_firm_locations"("cachedCounty");

-- Drives the cache purge sweep.
CREATE INDEX IF NOT EXISTS "discovered_firm_locations_cacheExpiresAt_idx"
  ON "discovered_firm_locations"("cacheExpiresAt");
