import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import type { LegalMatchImportStats, LegalMatchProfile } from './types'

const SOURCE_NAME = 'legalmatch'

type ImportSourceRow = {
  id: string
  attorneyId: string | null
}

export async function createImportRun(
  prisma: PrismaClient,
  input: { mode: string; notes: string | null }
) {
  const id = uuidv4()
  await prisma.$executeRaw`
    INSERT INTO attorney_import_runs
      ("id", "source", "mode", "status", "notes", "startedAt", "createdAt", "updatedAt")
    VALUES (${id}, ${SOURCE_NAME}, ${input.mode}, 'running', ${input.notes}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
  `
  return id
}

export async function updateImportRun(
  prisma: PrismaClient,
  importRunId: string | null,
  stats: Partial<LegalMatchImportStats>
) {
  if (!importRunId) return
  await prisma.$executeRaw`
    UPDATE attorney_import_runs
       SET "pagesDiscovered" = COALESCE(${stats.pagesDiscovered ?? null}, "pagesDiscovered"),
           "pagesFetched" = COALESCE(${stats.pagesFetched ?? null}, "pagesFetched"),
           "pagesParsed" = COALESCE(${stats.pagesParsed ?? null}, "pagesParsed"),
           "attorneysCreated" = COALESCE(${stats.attorneysCreated ?? null}, "attorneysCreated"),
           "attorneysUpdated" = COALESCE(${stats.attorneysUpdated ?? null}, "attorneysUpdated"),
           "attorneysSkipped" = COALESCE(${stats.attorneysSkipped ?? null}, "attorneysSkipped"),
           "updatedAt" = CURRENT_TIMESTAMP(3)
     WHERE "id" = ${importRunId}
  `
}

export async function finalizeImportRun(
  prisma: PrismaClient,
  importRunId: string | null,
  input: {
    stats: LegalMatchImportStats
    errors: string[]
    status: string
  }
) {
  if (!importRunId) return
  await prisma.$executeRaw`
    UPDATE attorney_import_runs
       SET "status" = ${input.status},
           "errorMessage" = ${input.errors.length > 0 ? input.errors.join('\n') : null},
           "pagesDiscovered" = ${input.stats.pagesDiscovered},
           "pagesFetched" = ${input.stats.pagesFetched},
           "pagesParsed" = ${input.stats.pagesParsed},
           "attorneysCreated" = ${input.stats.attorneysCreated},
           "attorneysUpdated" = ${input.stats.attorneysUpdated},
           "attorneysSkipped" = ${input.stats.attorneysSkipped},
           "finishedAt" = CURRENT_TIMESTAMP(3),
           "updatedAt" = CURRENT_TIMESTAMP(3)
     WHERE "id" = ${importRunId}
  `
}

export async function getImportSource(
  prisma: PrismaClient,
  sourceUrlHash: string
) {
  const rows = await prisma.$queryRaw<ImportSourceRow[]>`
    SELECT "id", "attorneyId"
      FROM attorney_import_sources
     WHERE "source" = ${SOURCE_NAME} AND "sourceUrlHash" = ${sourceUrlHash}
     LIMIT 1
  `

  return rows[0] ?? null
}

export async function listImportedSourceUrlHashes(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ sourceUrlHash: string }>>`
    SELECT "sourceUrlHash"
      FROM attorney_import_sources
     WHERE "source" = ${SOURCE_NAME}
  `

  return rows.map((row) => row.sourceUrlHash)
}

export async function upsertImportSource(
  prisma: PrismaClient,
  input: {
    attorneyId: string
    importRunId: string
    profile: LegalMatchProfile
  }
) {
  const id = uuidv4()
  await prisma.$executeRaw`
    INSERT INTO attorney_import_sources
      ("id", "source", "externalId", "sourceUrl", "sourceUrlHash", "rawContentHash", "status", "parseWarnings", "sourcePayload", "lastFetchedAt", "lastParsedAt", "attorneyId", "importRunId", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${SOURCE_NAME},
      ${input.profile.externalId ?? null},
      ${input.profile.sourceUrl},
      ${input.profile.sourceUrlHash},
      ${input.profile.rawContentHash},
      'parsed',
      ${input.profile.parseWarnings.length > 0 ? JSON.stringify(input.profile.parseWarnings) : null},
      ${JSON.stringify(input.profile.sourcePayload)},
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3),
      ${input.attorneyId},
      ${input.importRunId},
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3)
    )
    ON CONFLICT ("source", "sourceUrlHash")
    DO UPDATE SET
      "externalId" = EXCLUDED."externalId",
      "sourceUrl" = EXCLUDED."sourceUrl",
      "rawContentHash" = EXCLUDED."rawContentHash",
      "status" = EXCLUDED."status",
      "parseWarnings" = EXCLUDED."parseWarnings",
      "sourcePayload" = EXCLUDED."sourcePayload",
      "lastFetchedAt" = EXCLUDED."lastFetchedAt",
      "lastParsedAt" = EXCLUDED."lastParsedAt",
      "attorneyId" = EXCLUDED."attorneyId",
      "importRunId" = EXCLUDED."importRunId",
      "updatedAt" = CURRENT_TIMESTAMP(3)
  `
}
