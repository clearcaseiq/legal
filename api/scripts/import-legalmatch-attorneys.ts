import '../src/env'
import { prisma } from '../src/lib/prisma'
import { runLegalMatchImport } from '../src/lib/legalmatch/importer'

function parseBoolean(value: string | undefined) {
  return value === 'true'
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseProfileUrls(value: string | undefined) {
  if (!value) return []
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseSearchQueries(value: string | undefined) {
  if (!value) return []
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFetchMode(value: string | undefined) {
  if (value === 'http' || value === 'browser') return value
  return 'auto'
}

function parseDiscoveryMode(value: string | undefined) {
  if (value === 'sitemap' || value === 'search' || value === 'browser-search' || value === 'browser-index') {
    return value
  }
  return 'auto'
}

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('LegalMatch import is production-only. Set NODE_ENV=production before running this script.')
  }

  if (!parseBoolean(process.env.LEGALMATCH_ALLOW_PRODUCTION_IMPORT)) {
    throw new Error('Set LEGALMATCH_ALLOW_PRODUCTION_IMPORT=true to run the LegalMatch importer.')
  }

  const dryRun = parseBoolean(process.env.LEGALMATCH_DRY_RUN)
  const maxProfiles = parseNumber(process.env.LEGALMATCH_MAX_PROFILES, 100)
  const delayMs = parseNumber(process.env.LEGALMATCH_FETCH_DELAY_MS, 1500)
  const fetchMode = parseFetchMode(process.env.LEGALMATCH_FETCH_MODE)
  const browserHeadless = process.env.LEGALMATCH_BROWSER_HEADLESS !== 'false'
  const discoveryMode = parseDiscoveryMode(process.env.LEGALMATCH_DISCOVERY_MODE)
  const discoveryOffset = parseNumber(process.env.LEGALMATCH_DISCOVERY_OFFSET, 0)
  const searchPagesPerQuery = parseNumber(process.env.LEGALMATCH_SEARCH_PAGES_PER_QUERY, 3)
  const indexPages = parseNumber(process.env.LEGALMATCH_INDEX_PAGES, 4)
  const sitemapUrl = process.env.LEGALMATCH_SITEMAP_URL
  const profileUrls = parseProfileUrls(process.env.LEGALMATCH_PROFILE_URLS)
  const searchQueries = parseSearchQueries(process.env.LEGALMATCH_SEARCH_QUERIES)
  const skipKnownImported = parseBoolean(process.env.LEGALMATCH_SKIP_IMPORTED)

  const result = await runLegalMatchImport(prisma, {
    dryRun,
    maxProfiles,
    delayMs,
    fetchMode,
    browserHeadless,
    discoveryMode,
    discoveryOffset,
    searchPagesPerQuery,
    indexPages,
    sitemapUrl,
    profileUrls,
    searchQueries,
    skipKnownImported,
  })

  console.log(
    JSON.stringify(
      {
        dryRun,
        fetchMode,
        discoveryMode,
        stats: result.stats,
        errors: result.errors,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
