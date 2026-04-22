CREATE TABLE "attorney_import_runs" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "notes" TEXT,
  "errorMessage" TEXT,
  "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
  "pagesFetched" INTEGER NOT NULL DEFAULT 0,
  "pagesParsed" INTEGER NOT NULL DEFAULT 0,
  "attorneysCreated" INTEGER NOT NULL DEFAULT 0,
  "attorneysUpdated" INTEGER NOT NULL DEFAULT 0,
  "attorneysSkipped" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "attorney_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attorney_import_runs_source_status_idx"
  ON "attorney_import_runs"("source", "status");

CREATE TABLE "attorney_import_sources" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "externalId" TEXT,
  "sourceUrl" VARCHAR(1024) NOT NULL,
  "sourceUrlHash" VARCHAR(64) NOT NULL,
  "rawContentHash" VARCHAR(64),
  "status" TEXT NOT NULL DEFAULT 'discovered',
  "parseWarnings" TEXT,
  "sourcePayload" TEXT,
  "lastFetchedAt" TIMESTAMP(3),
  "lastParsedAt" TIMESTAMP(3),
  "attorneyId" TEXT,
  "importRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "attorney_import_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attorney_import_sources_source_sourceUrlHash_key" UNIQUE ("source", "sourceUrlHash"),
  CONSTRAINT "attorney_import_sources_attorneyId_fkey"
    FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "attorney_import_sources_importRunId_fkey"
    FOREIGN KEY ("importRunId") REFERENCES "attorney_import_runs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "attorney_import_sources_attorneyId_idx"
  ON "attorney_import_sources"("attorneyId");

CREATE INDEX "attorney_import_sources_importRunId_idx"
  ON "attorney_import_sources"("importRunId");

CREATE INDEX "attorney_import_sources_source_status_idx"
  ON "attorney_import_sources"("source", "status");
