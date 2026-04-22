import '../src/env'
import { discoverLegalMatchProfileUrls } from '../src/lib/legalmatch/fetcher'

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBoolean(value: string | undefined) {
  return value === 'true'
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

function parseDiscoveryMode(value: string | undefined) {
  if (value === 'sitemap' || value === 'search' || value === 'browser-search' || value === 'browser-index') {
    return value
  }
  return 'auto'
}

async function main() {
  const urls = await discoverLegalMatchProfileUrls({
    maxProfiles: parseNumber(process.env.LEGALMATCH_MAX_PROFILES, 20),
    profileUrls: parseProfileUrls(process.env.LEGALMATCH_PROFILE_URLS),
    searchQueries: parseSearchQueries(process.env.LEGALMATCH_SEARCH_QUERIES),
    sitemapUrl: process.env.LEGALMATCH_SITEMAP_URL,
    discoveryMode: parseDiscoveryMode(process.env.LEGALMATCH_DISCOVERY_MODE),
    discoveryOffset: parseNumber(process.env.LEGALMATCH_DISCOVERY_OFFSET, 0),
    searchPagesPerQuery: parseNumber(process.env.LEGALMATCH_SEARCH_PAGES_PER_QUERY, 3),
    indexPages: parseNumber(process.env.LEGALMATCH_INDEX_PAGES, 4),
    browserHeadless: parseBoolean(process.env.LEGALMATCH_BROWSER_HEADLESS) || process.env.LEGALMATCH_BROWSER_HEADLESS !== 'false',
  })

  console.log(
    JSON.stringify(
      {
        discoveryMode: parseDiscoveryMode(process.env.LEGALMATCH_DISCOVERY_MODE),
        count: urls.length,
        urls,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
