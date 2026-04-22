import { gunzipSync } from 'zlib'
import { LegalMatchFetchResult } from './types'
import { decodeHtmlEntities, normalizeWhitespace, uniqueStrings } from './utils'

const DEFAULT_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
}

const PROFILE_PATH_RE = /\/law-library\/attorney-profile\/[^/?#]+\.html$/i
const DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/'
const SEARCH_DISCOVERY_TERMS = [
  'personal injury',
  'family law',
  'criminal defense',
  'business law',
  'employment law',
  'estate planning',
  'immigration law',
  'elder law',
  'real estate',
  'bankruptcy',
  'civil litigation',
  'probate',
  'taxation services',
  'intellectual property',
]
const SEARCH_DISCOVERY_REGIONS = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  'District of Columbia',
]

export class LegalMatchFetchBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegalMatchFetchBlockedError'
  }
}

export async function fetchLegalMatchHtml(url: string): Promise<LegalMatchFetchResult> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })
  const html = await response.text()
  const finalUrl = response.url || url
  const challenged = isCloudflareChallenge(html, response.status)
  if (challenged) {
    throw new LegalMatchFetchBlockedError(
      `LegalMatch blocked plain HTTP access for ${url}. A browser-backed session or allowlisted production egress may be required.`
    )
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }
  return {
    url,
    finalUrl,
    status: response.status,
    html,
    challenged,
  }
}

export async function fetchLegalMatchHtmlWithBrowser(
  url: string,
  options: { headless: boolean }
): Promise<LegalMatchFetchResult> {
  let chromium: typeof import('@playwright/test').chromium | null = null
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch {
    throw new Error(
      'Browser fetch mode requires Playwright. Install Chromium with `pnpm test:e2e:install` before running the LegalMatch importer in browser mode.'
    )
  }

  const browser = await chromium.launch({ headless: options.headless })
  const page = await browser.newPage({
    userAgent: DEFAULT_HEADERS['user-agent'],
  })

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined)
    const html = await page.content()
    const finalUrl = page.url()
    const status = response?.status() ?? 200
    const challenged = isCloudflareChallenge(html, status)
    if (challenged) {
      throw new LegalMatchFetchBlockedError(
        `LegalMatch browser fetch still encountered a challenge at ${url}. A manual allowlist or authenticated browser context may be required.`
      )
    }

    return {
      url,
      finalUrl,
      status,
      html,
      challenged: false,
    }
  } finally {
    await page.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

export async function discoverLegalMatchProfileUrls(input: {
  sitemapUrl?: string
  profileUrls?: string[]
  maxProfiles?: number
  searchQueries?: string[]
  discoveryMode?: 'auto' | 'sitemap' | 'search' | 'browser-search' | 'browser-index'
  discoveryOffset?: number
  searchPagesPerQuery?: number
  indexPages?: number
  browserHeadless?: boolean
}) {
  const explicitUrls = uniqueStrings(input.profileUrls ?? []).filter(isAttorneyProfileUrl)
  if (explicitUrls.length > 0) {
    return sliceDiscoveredUrls(explicitUrls, input.discoveryOffset, input.maxProfiles)
  }

  if (input.discoveryMode === 'sitemap') {
    const sitemapUrls = await discoverLegalMatchProfileUrlsFromSitemap(input)
    return sliceDiscoveredUrls(sitemapUrls, input.discoveryOffset, input.maxProfiles)
  }

  if (input.discoveryMode === 'search') {
    const searchUrls = await discoverLegalMatchProfileUrlsFromSearchIndex(input)
    return sliceDiscoveredUrls(searchUrls, input.discoveryOffset, input.maxProfiles)
  }

  if (input.discoveryMode === 'browser-search') {
    const browserSearchUrls = await discoverLegalMatchProfileUrlsFromBrowserSearch(input)
    return sliceDiscoveredUrls(browserSearchUrls, input.discoveryOffset, input.maxProfiles)
  }

  if (input.discoveryMode === 'browser-index') {
    const browserIndexUrls = await discoverLegalMatchProfileUrlsFromBrowserIndex(input)
    return sliceDiscoveredUrls(browserIndexUrls, input.discoveryOffset, input.maxProfiles)
  }

  try {
    const sitemapUrls = await discoverLegalMatchProfileUrlsFromSitemap(input)
    if (sitemapUrls.length > 0) {
      return sliceDiscoveredUrls(sitemapUrls, input.discoveryOffset, input.maxProfiles)
    }
  } catch (error) {
    if (!(error instanceof LegalMatchFetchBlockedError)) {
      throw error
    }
  }

  const browserSearchUrls = await discoverLegalMatchProfileUrlsFromBrowserSearch(input)
  if (browserSearchUrls.length > 0) {
    return sliceDiscoveredUrls(browserSearchUrls, input.discoveryOffset, input.maxProfiles)
  }

  const browserIndexUrls = await discoverLegalMatchProfileUrlsFromBrowserIndex(input)
  if (browserIndexUrls.length > 0) {
    return sliceDiscoveredUrls(browserIndexUrls, input.discoveryOffset, input.maxProfiles)
  }

  const searchUrls = await discoverLegalMatchProfileUrlsFromSearchIndex(input)
  return sliceDiscoveredUrls(searchUrls, input.discoveryOffset, input.maxProfiles)
}

async function discoverLegalMatchProfileUrlsFromSitemap(input: {
  sitemapUrl?: string
  maxProfiles?: number
}) {
  const sitemapUrl = input.sitemapUrl || 'https://www.legalmatch.com/sitemap.xml.gz'
  const robotsTxt = await fetchText('https://www.legalmatch.com/robots.txt')
  if (robotsDisallowsProfiles(robotsTxt)) {
    throw new LegalMatchFetchBlockedError('LegalMatch robots.txt disallows attorney profile crawling for generic user agents.')
  }

  const queue = [sitemapUrl]
  const visited = new Set<string>()
  const discoveredProfiles = new Set<string>()

  while (queue.length > 0) {
    const nextUrl = queue.shift()
    if (!nextUrl || visited.has(nextUrl)) continue
    visited.add(nextUrl)

    const xml = await fetchSitemapXml(nextUrl)
    for (const loc of extractXmlLocs(xml)) {
      if (isAttorneyProfileUrl(loc)) {
        discoveredProfiles.add(loc)
        if (input.maxProfiles && discoveredProfiles.size >= input.maxProfiles) {
          return Array.from(discoveredProfiles)
        }
        continue
      }
      if (isSitemapUrl(loc)) queue.push(loc)
    }
  }

  return limitUrls(Array.from(discoveredProfiles), input.maxProfiles)
}

async function discoverLegalMatchProfileUrlsFromSearchIndex(input: {
  maxProfiles?: number
  searchQueries?: string[]
}) {
  const queries = buildSearchDiscoveryQueries(input.searchQueries)
  const discovered = new Set<string>()

  for (const query of queries) {
    const html = await fetchDuckDuckGoSearchHtml(query)
    for (const url of extractAttorneyProfileUrlsFromSearchResultsHtml(html)) {
      discovered.add(url)
      if (input.maxProfiles && discovered.size >= input.maxProfiles) {
        return Array.from(discovered)
      }
    }
  }

  return limitUrls(Array.from(discovered), input.maxProfiles)
}

async function discoverLegalMatchProfileUrlsFromBrowserSearch(input: {
  maxProfiles?: number
  searchQueries?: string[]
  searchPagesPerQuery?: number
  browserHeadless?: boolean
}) {
  const queries = buildSearchDiscoveryQueries(input.searchQueries)
  const discovered = new Set<string>()
  const pagesPerQuery = Math.max(1, input.searchPagesPerQuery ?? 3)

  for (const query of queries) {
    for (let pageIndex = 0; pageIndex < pagesPerQuery; pageIndex += 1) {
      const html = await fetchBrowserSearchHtml(query, pageIndex, {
        headless: input.browserHeadless !== false,
      })
      const urls = extractAttorneyProfileUrlsFromSearchResultsHtml(html)
      if (urls.length === 0) {
        break
      }

      for (const url of urls) {
        discovered.add(url)
        if (input.maxProfiles && discovered.size >= input.maxProfiles) {
          return Array.from(discovered)
        }
      }
    }
  }

  return limitUrls(Array.from(discovered), input.maxProfiles)
}

async function discoverLegalMatchProfileUrlsFromBrowserIndex(input: {
  maxProfiles?: number
  indexPages?: number
  browserHeadless?: boolean
}) {
  const discovered = new Set<string>()
  const maxPages = Math.max(1, input.indexPages ?? 4)

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const fetched = await fetchLegalMatchHtmlWithBrowser(buildLegalMatchIndexUrl(pageNumber), {
      headless: input.browserHeadless !== false,
    })
    for (const url of extractAttorneyProfileUrlsFromDirectoryHtml(fetched.html)) {
      discovered.add(url)
      if (input.maxProfiles && discovered.size >= input.maxProfiles) {
        return Array.from(discovered)
      }
    }
  }

  return limitUrls(Array.from(discovered), input.maxProfiles)
}

export function isAttorneyProfileUrl(url: string) {
  try {
    const parsed = new URL(url)
    return /(^|\.)legalmatch\.com$/i.test(parsed.hostname) && PROFILE_PATH_RE.test(parsed.pathname)
  } catch {
    return false
  }
}

export function isCloudflareChallenge(html: string, status?: number) {
  const normalized = normalizeWhitespace(html).toLowerCase()
  return (
    normalized.includes('just a moment') ||
    normalized.includes('enable javascript and cookies to continue') ||
    normalized.includes('_cf_chl_opt') ||
    (status === 403 && normalized.includes('cloudflare'))
  )
}

export function extractAttorneyProfileUrlsFromSearchResultsHtml(html: string) {
  const inlineUrls = Array.from(
    html.matchAll(/https?:\/\/(?:www\.)?legalmatch\.com\/law-library\/attorney-profile\/[^"'\\\s<>]+\.html/gi),
    (match) => normalizeAttorneyProfileUrl(match[0])
  ).filter((value): value is string => Boolean(value))
  const matches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi), (match) => match[1])
  const urls = matches
    .map(resolveSearchResultHref)
    .filter((value): value is string => Boolean(value))
    .filter(isAttorneyProfileUrl)

  return uniqueStrings([...inlineUrls, ...urls])
}

async function fetchSitemapXml(url: string) {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })
  const bytes = new Uint8Array(await response.arrayBuffer())
  const isGzipPayload = bytes[0] === 0x1f && bytes[1] === 0x8b
  const decoded = isGzipPayload
    ? gunzipSync(bytes).toString('utf8')
    : Buffer.from(bytes).toString('utf8')

  if (isCloudflareChallenge(decoded, response.status)) {
    throw new LegalMatchFetchBlockedError(
      `LegalMatch sitemap access is challenge-protected at ${url}. Configure LEGALMATCH_PROFILE_URLS with allowed profile URLs or run from an allowlisted environment.`
    )
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap ${url}: HTTP ${response.status}`)
  }

  return decoded
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })
  const text = await response.text()
  if (isCloudflareChallenge(text, response.status) || response.status === 403) {
    throw new LegalMatchFetchBlockedError(`LegalMatch blocked access to ${url}: HTTP ${response.status}`)
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }
  return text
}

async function fetchDuckDuckGoSearchHtml(query: string) {
  const url = `${DUCKDUCKGO_HTML_URL}?q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })
  const html = await response.text()
  if (!response.ok) {
    throw new Error(`Failed to fetch search results for "${query}": HTTP ${response.status}`)
  }
  return html
}

async function fetchBrowserSearchHtml(
  query: string,
  pageIndex: number,
  options: { headless: boolean }
) {
  const url = buildDuckDuckGoSearchUrl(query, pageIndex)
  const response = await fetchLegalMatchHtmlWithBrowser(url, { headless: options.headless })
  return response.html
}

function extractXmlLocs(xml: string) {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gsi), (match) => decodeHtmlEntities(match[1].trim()))
}

function isSitemapUrl(url: string) {
  return /\.xml(?:\.gz)?$/i.test(url)
}

function limitUrls(urls: string[], maxProfiles?: number) {
  return maxProfiles ? urls.slice(0, maxProfiles) : urls
}

export function sliceDiscoveredUrls(urls: string[], discoveryOffset = 0, maxProfiles?: number) {
  const offset = Math.max(0, discoveryOffset)
  const sliced = urls.slice(offset)
  return limitUrls(sliced, maxProfiles)
}

function robotsDisallowsProfiles(robotsTxt: string) {
  const lines = robotsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const patterns = lines
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.replace(/^disallow:/i, '').trim())
    .filter(Boolean)

  return patterns.some((pattern) => wildcardPathMatch(pattern, '/law-library/attorney-profile/example.html'))
}

function wildcardPathMatch(pattern: string, path: string) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}`).test(path)
}

function resolveSearchResultHref(value: string) {
  const normalized = decodeHtmlEntities(normalizeWhitespace(value))
  if (!normalized || normalized.startsWith('#') || /^javascript:/i.test(normalized)) {
    return null
  }
  if (isAttorneyProfileUrl(normalized)) {
    return normalizeAttorneyProfileUrl(normalized)
  }

  try {
    const parsed = new URL(normalized, DUCKDUCKGO_HTML_URL)
    const redirectUrl = parsed.searchParams.get('uddg')
    if (redirectUrl && isAttorneyProfileUrl(redirectUrl)) {
      return normalizeAttorneyProfileUrl(redirectUrl)
    }
  } catch {
    return null
  }

  return null
}

function normalizeAttorneyProfileUrl(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value)
  if (!normalized || !isAttorneyProfileUrl(normalized)) return null
  try {
    const parsed = new URL(normalized)
    return `https://www.legalmatch.com${parsed.pathname}`
  } catch {
    return null
  }
}

export function buildBingSearchUrl(query: string, pageIndex: number) {
  const page = Math.max(0, pageIndex)
  const first = page * 10 + 1
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`
}

export function buildDuckDuckGoSearchUrl(query: string, pageIndex: number) {
  const page = Math.max(0, pageIndex)
  const offset = page * 30
  return `${DUCKDUCKGO_HTML_URL}?q=${encodeURIComponent(query)}&s=${offset}`
}

export function buildLegalMatchIndexUrl(pageNumber: number) {
  const page = Math.max(1, pageNumber)
  return `https://www.legalmatch.com/law-library/attorney-profile/index.html?_category=&_rating=&_sort=&_page=${page}`
}

export function buildSearchDiscoveryQueries(searchQueries?: string[]) {
  if (searchQueries?.length) {
    return uniqueStrings(searchQueries)
  }

  const baseQueries = SEARCH_DISCOVERY_TERMS.map(
    (term) => `site:legalmatch.com/law-library/attorney-profile "${term}"`
  )
  const regionalQueries = SEARCH_DISCOVERY_TERMS.flatMap((term) =>
    SEARCH_DISCOVERY_REGIONS.map(
      (region) => `site:legalmatch.com/law-library/attorney-profile "${term}" "${region}"`
    )
  )

  return uniqueStrings([...baseQueries, ...regionalQueries])
}

function extractAttorneyProfileUrlsFromDirectoryHtml(html: string) {
  const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi), (match) => match[1])
  return uniqueStrings(hrefs)
    .map((href) => resolveDirectoryHref(href))
    .filter((value): value is string => Boolean(value))
}

function resolveDirectoryHref(value: string) {
  const normalized = decodeHtmlEntities(normalizeWhitespace(value))
  if (!normalized) return null

  try {
    const parsed = new URL(normalized, 'https://www.legalmatch.com')
    return normalizeAttorneyProfileUrl(parsed.toString())
  } catch {
    return null
  }
}
