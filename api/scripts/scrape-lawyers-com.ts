/**
 * Paginated scraper for lawyers.com directory listings.
 *
 * It walks a listing URL by incrementing `?page=N` until pages stop returning
 * new firms, parsing structured JSON-LD first (most reliable) and falling back
 * to lightweight HTML heuristics. A Playwright browser session is used only if
 * plain HTTP is blocked by bot protection.
 *
 * RESPONSIBLE USE: review https://www.lawyers.com/robots.txt and the site Terms
 * of Service before running. Scrape only public data, keep the delay generous,
 * and do not redistribute copyrighted content.
 *
 * Run:
 *   cd api
 *   LAWYERS_BASE_URL="https://www.lawyers.com/personal-injury/glendale/california/law-firms/" \
 *   LAWYERS_MAX_PAGES=20 LAWYERS_DELAY_MS=3000 \
 *   node ../node_modules/tsx/dist/cli.mjs scripts/scrape-lawyers-com.ts
 *
 * Useful env vars:
 *   LAWYERS_BASE_URL     Listing URL (without page param). Required.
 *   LAWYERS_START_PAGE   First page number (default 1).
 *   LAWYERS_MAX_PAGES    Hard cap on pages fetched (default 25).
 *   LAWYERS_MAX_FIRMS    Hard cap on firms collected (default 1000).
 *   LAWYERS_DELAY_MS     Base delay between requests in ms (default 3000).
 *   LAWYERS_USE_BROWSER  "always" | "auto" | "never" (default "auto").
 *   LAWYERS_HEADLESS     "false" to watch the browser (default headless).
 *   LAWYERS_PERSIST      "db" | "json" | "both" (default "both").
 *   LAWYERS_SOURCE       Source tag stored on each row (default "lawyers.com").
 *   LAWYERS_FETCH_DETAILS "true" to visit each firm page for richer data.
 *   LAWYERS_DETAIL_DELAY_MS Delay between detail-page fetches (default = LAWYERS_DELAY_MS).
 *   LAWYERS_OUTPUT       JSON output path (default tmp/lawyers-com-<slug>.json).
 *
 * Sitemap mode (crawl many cities at once, e.g. a whole state):
 *   LAWYERS_SITEMAPS     Comma-separated sitemap XML URLs to discover listing URLs from.
 *   LAWYERS_URL_FILTER   Regex to filter discovered <loc> URLs
 *                        (default: personal-injury California law-firms listings).
 *   LAWYERS_DISCOVER_ONLY "true" to only write the discovered URL list and exit.
 *
 *   Example (all California personal-injury cities):
 *     LAWYERS_SITEMAPS="https://www.lawyers.com/california_0000.xml,https://www.lawyers.com/california_0001.xml,https://www.lawyers.com/california_0002.xml,https://www.lawyers.com/california_0003.xml" \
 *     LAWYERS_MAX_FIRMS=100000 node ../node_modules/tsx/dist/cli.mjs scripts/scrape-lawyers-com.ts
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import '../src/env'
import { prisma } from '../src/lib/prisma'

const DEFAULT_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

export interface Firm {
  name: string
  profileUrl: string | null
  phone: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  rating: number | null
  reviewCount: number | null
  sourcePage: number
  // Enriched from the firm detail page (only when LAWYERS_FETCH_DETAILS=true):
  website: string | null
  email: string | null
  description: string | null
  practiceAreas: string[]
  attorneys: string[]
  detailFetched: boolean
}

interface FetchResult {
  html: string
  status: number
  finalUrl: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl)
  url.searchParams.set('page', String(page))
  return url.toString()
}

const US_STATE_CODES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode-island': 'RI',
  'south-carolina': 'SC', 'south-dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west-virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
}

/** Infer a 2-letter state code from a listing URL path like .../glendale/california/... */
function stateFromUrl(baseUrl: string): string | null {
  try {
    const segments = new URL(baseUrl).pathname.toLowerCase().split('/').filter(Boolean)
    for (const segment of segments) {
      if (US_STATE_CODES[segment]) return US_STATE_CODES[segment]
    }
  } catch {
    // ignore
  }
  return null
}

function slugFromUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'listing'
  } catch {
    return 'listing'
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** Stable dedupe key: prefer the profile URL, else normalized name + location. */
function dedupeHashFor(firm: Firm): string {
  const basis = firm.profileUrl
    ? firm.profileUrl.trim().toLowerCase()
    : [firm.name, firm.city, firm.state].map((p) => (p ?? '').trim().toLowerCase()).join('|')
  return sha256(basis)
}

// ---------------------------------------------------------------------------
// Fetching (HTTP first, Playwright fallback when blocked)
// ---------------------------------------------------------------------------

function looksBlocked(html: string, status: number): boolean {
  if (status === 403 || status === 429 || status === 503) return true
  const needle = html.slice(0, 4000).toLowerCase()
  return (
    needle.includes('cf-browser-verification') ||
    needle.includes('just a moment') ||
    needle.includes('captcha') ||
    needle.includes('access denied') ||
    needle.includes('px-captcha')
  )
}

async function fetchHttp(url: string): Promise<FetchResult> {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, redirect: 'follow' })
  return {
    html: await response.text(),
    status: response.status,
    finalUrl: response.url || url,
  }
}

let cachedBrowser: import('@playwright/test').Browser | null = null

async function fetchWithBrowser(url: string, headless: boolean): Promise<FetchResult> {
  if (!cachedBrowser) {
    let chromium: typeof import('@playwright/test').chromium
    try {
      ;({ chromium } = await import('@playwright/test'))
    } catch {
      throw new Error(
        'Browser mode needs Playwright Chromium. Install it with `pnpm test:e2e:install` (or `npx playwright install chromium`).'
      )
    }
    cachedBrowser = await chromium.launch({ headless })
  }
  const page = await cachedBrowser.newPage({ userAgent: DEFAULT_HEADERS['user-agent'] })
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined)
    return {
      html: await page.content(),
      status: response?.status() ?? 200,
      finalUrl: page.url(),
    }
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function fetchPage(url: string, mode: string, headless: boolean): Promise<FetchResult> {
  if (mode === 'always') return fetchWithBrowser(url, headless)
  const httpResult = await fetchHttp(url)
  if (mode === 'never') return httpResult
  if (looksBlocked(httpResult.html, httpResult.status)) {
    console.warn(`  ↳ HTTP looked blocked (status ${httpResult.status}); retrying with browser…`)
    return fetchWithBrowser(url, headless)
  }
  return httpResult
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function pickNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function collectJsonLdNodes(html: string): unknown[] {
  const nodes: unknown[] = []
  const blockRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = blockRe.exec(html)) !== null) {
    const raw = match[1].trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const queue = asArray(parsed)
      while (queue.length) {
        const node = queue.shift() as Record<string, unknown>
        if (!node || typeof node !== 'object') continue
        nodes.push(node)
        // Unwrap @graph and itemListElement containers.
        for (const key of ['@graph', 'itemListElement', 'item']) {
          const child = (node as Record<string, unknown>)[key]
          if (child) queue.push(...asArray(child))
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks; HTML heuristics cover the gap.
    }
  }
  return nodes
}

const FIRM_TYPES = new Set([
  'attorney',
  'legalservice',
  'localbusiness',
  'organization',
  'professionalservice',
])

function firmFromJsonLd(node: Record<string, unknown>, page: number): Firm | null {
  const types = asArray(node['@type'] as string | string[]).map((t) => String(t).toLowerCase())
  if (!types.some((t) => FIRM_TYPES.has(t))) return null
  const name = typeof node.name === 'string' ? decodeEntities(node.name) : null
  if (!name) return null

  const address = (node.address ?? {}) as Record<string, unknown>
  const rating = (node.aggregateRating ?? {}) as Record<string, unknown>
  const url = typeof node.url === 'string' ? node.url : typeof node['@id'] === 'string' ? (node['@id'] as string) : null
  // lawyers.com puts the firm's own website in JSON-LD `url`; treat external URLs as the website.
  const isExternal = url ? !url.includes('lawyers.com') : false

  return {
    name,
    profileUrl: url,
    phone: typeof node.telephone === 'string' ? node.telephone : null,
    street: typeof address.streetAddress === 'string' ? decodeEntities(address.streetAddress) : null,
    city: typeof address.addressLocality === 'string' ? address.addressLocality : null,
    state: typeof address.addressRegion === 'string' ? address.addressRegion : null,
    zip: typeof address.postalCode === 'string' ? address.postalCode : null,
    rating: pickNumber(rating.ratingValue),
    reviewCount: pickNumber(rating.reviewCount ?? rating.ratingCount),
    sourcePage: page,
    website: isExternal ? url : null,
    email: null,
    description: null,
    practiceAreas: [],
    attorneys: [],
    detailFetched: false,
  }
}

/** Heuristic fallback: pull firm profile anchors if JSON-LD is absent. */
function firmsFromHtmlHeuristic(html: string, page: number): Firm[] {
  const firms: Firm[] = []
  const seen = new Set<string>()
  const anchorRe = /<a[^>]+href="([^"]*\/law-firms\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, ' '))
    if (!text || text.length < 3 || seen.has(href)) continue
    seen.add(href)
    firms.push({
      name: text,
      profileUrl: href.startsWith('http') ? href : `https://www.lawyers.com${href}`,
      phone: null,
      street: null,
      city: null,
      state: null,
      zip: null,
      rating: null,
      reviewCount: null,
      sourcePage: page,
      website: null,
      email: null,
      description: null,
      practiceAreas: [],
      attorneys: [],
      detailFetched: false,
    })
  }
  return firms
}

function parseFirms(html: string, page: number): Firm[] {
  const fromJsonLd = collectJsonLdNodes(html)
    .map((node) => firmFromJsonLd(node as Record<string, unknown>, page))
    .filter((firm): firm is Firm => firm !== null)
  if (fromJsonLd.length > 0) return fromJsonLd
  return firmsFromHtmlHeuristic(html, page)
}

// ---------------------------------------------------------------------------
// Detail-page enrichment (per firm)
// ---------------------------------------------------------------------------

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    'i'
  )
  const match = re.exec(html)
  return match ? decodeEntities(match[1]) : null
}

function firstEmail(html: string): string | null {
  const mailto = /mailto:([^"'?\s>]+@[^"'?\s>]+)/i.exec(html)
  if (mailto) return mailto[1].toLowerCase()
  const inline = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(stripTags(html))
  return inline ? inline[0].toLowerCase() : null
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
}

/** Extract richer fields from a firm detail page and merge into the listing record. */
function enrichFromDetail(firm: Firm, html: string): Firm {
  const enriched: Firm = { ...firm, detailFetched: true }
  const practiceAreas = new Set(firm.practiceAreas)
  const attorneys = new Set(firm.attorneys)

  for (const node of collectJsonLdNodes(html)) {
    const record = node as Record<string, unknown>
    const types = asArray(record['@type'] as string | string[]).map((t) => String(t).toLowerCase())

    if (types.some((t) => FIRM_TYPES.has(t))) {
      if (!enriched.phone && typeof record.telephone === 'string') enriched.phone = record.telephone
      if (!enriched.email && typeof record.email === 'string') enriched.email = record.email
      if (!enriched.website && typeof record.url === 'string' && !record.url.includes('lawyers.com')) {
        enriched.website = record.url
      }
      if (!enriched.description && typeof record.description === 'string') {
        enriched.description = decodeEntities(record.description)
      }
      const address = (record.address ?? {}) as Record<string, unknown>
      if (!enriched.street && typeof address.streetAddress === 'string') {
        enriched.street = decodeEntities(address.streetAddress)
      }
      if (!enriched.city && typeof address.addressLocality === 'string') enriched.city = address.addressLocality
      if (!enriched.state && typeof address.addressRegion === 'string') enriched.state = address.addressRegion
      if (!enriched.zip && typeof address.postalCode === 'string') enriched.zip = address.postalCode

      for (const key of ['knowsAbout', 'serviceType', 'areaServed']) {
        for (const area of asArray(record[key] as unknown)) {
          const label = typeof area === 'string' ? area : (area as Record<string, unknown>)?.name
          if (typeof label === 'string' && label.trim()) practiceAreas.add(decodeEntities(label))
        }
      }
      for (const key of ['employee', 'member', 'founder', 'employees']) {
        for (const person of asArray(record[key] as unknown)) {
          const label =
            typeof person === 'string' ? person : (person as Record<string, unknown>)?.name
          if (typeof label === 'string' && label.trim()) attorneys.add(decodeEntities(label))
        }
      }
    }

    // Standalone Person/Attorney nodes on the page = lawyers at the firm.
    if (types.includes('person') || types.includes('attorney')) {
      const label = typeof record.name === 'string' ? decodeEntities(record.name) : null
      if (label) attorneys.add(label)
    }
  }

  // HTML fallbacks when structured data is thin.
  if (!enriched.website) {
    const ext = /href=["'](https?:\/\/(?!www\.lawyers\.com)[^"']+)["'][^>]*>\s*(?:visit\s*website|website|firm website)/i.exec(
      html
    )
    if (ext) enriched.website = ext[1]
  }
  if (!enriched.email) enriched.email = firstEmail(html)
  if (!enriched.description) enriched.description = metaContent(html, 'description')
  if (practiceAreas.size === 0) {
    const paRe = /\/practice-areas?\/[^"']*["'][^>]*>([^<]{3,60})</gi
    let m: RegExpExecArray | null
    while ((m = paRe.exec(html)) !== null) practiceAreas.add(decodeEntities(m[1]))
  }

  enriched.practiceAreas = [...practiceAreas]
  enriched.attorneys = [...attorneys]
  return enriched
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface CrawlOptions {
  startPage: number
  maxPages: number
  maxFirms: number
  baseDelay: number
  mode: string
  headless: boolean
}

/** Pull every <loc> URL matching `filterRe` out of one or more XML sitemaps. */
async function discoverListingUrls(sitemapUrls: string[], filterRe: RegExp): Promise<string[]> {
  const found = new Set<string>()
  for (const sitemap of sitemapUrls) {
    console.log(`Sitemap: ${sitemap}`)
    let res: FetchResult
    try {
      res = await fetchHttp(sitemap)
    } catch (error) {
      console.warn(`  ↳ failed: ${(error as Error).message}`)
      continue
    }
    const locRe = /<loc>([^<]+)<\/loc>/gi
    let m: RegExpExecArray | null
    let count = 0
    while ((m = locRe.exec(res.html)) !== null) {
      const url = m[1].trim()
      if (filterRe.test(url)) {
        found.add(url)
        count += 1
      }
    }
    console.log(`  ↳ ${count} matching URLs`)
    await sleep(1000)
  }
  return [...found]
}

/** Crawl a single paginated listing, adding new firms into the shared map. */
async function crawlListing(
  baseUrl: string,
  opts: CrawlOptions,
  collected: Map<string, Firm>
): Promise<number> {
  const fallbackState = stateFromUrl(baseUrl)
  let emptyStreak = 0
  let addedTotal = 0

  for (let page = opts.startPage; page < opts.startPage + opts.maxPages; page += 1) {
    if (collected.size >= opts.maxFirms) break
    const url = buildPageUrl(baseUrl, page)

    let result: FetchResult
    try {
      result = await fetchPage(url, opts.mode, opts.headless)
    } catch (error) {
      console.warn(`    ↳ fetch failed (page ${page}): ${(error as Error).message}`)
      break
    }

    if (result.status === 404) break

    const firms = parseFirms(result.html, page)
    let added = 0
    for (const firm of firms) {
      if (!firm.state && fallbackState) firm.state = fallbackState
      const key = (firm.profileUrl ?? firm.name).toLowerCase()
      if (collected.has(key)) continue
      collected.set(key, firm)
      added += 1
      addedTotal += 1
      if (collected.size >= opts.maxFirms) break
    }

    // Stop when two consecutive pages add nothing new (end of results / repeats).
    if (added === 0) {
      emptyStreak += 1
      if (emptyStreak >= 2) break
    } else {
      emptyStreak = 0
    }

    await sleep(opts.baseDelay + Math.floor(Math.random() * 1000))
  }

  return addedTotal
}

async function main() {
  const baseUrl = process.env.LAWYERS_BASE_URL
  const sitemaps = (process.env.LAWYERS_SITEMAPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const discoverOnly = process.env.LAWYERS_DISCOVER_ONLY === 'true'

  const opts: CrawlOptions = {
    startPage: num(process.env.LAWYERS_START_PAGE, 1),
    maxPages: num(process.env.LAWYERS_MAX_PAGES, 25),
    maxFirms: num(process.env.LAWYERS_MAX_FIRMS, 1000),
    baseDelay: num(process.env.LAWYERS_DELAY_MS, 3000),
    mode: process.env.LAWYERS_USE_BROWSER ?? 'auto',
    headless: process.env.LAWYERS_HEADLESS !== 'false',
  }
  const persist = process.env.LAWYERS_PERSIST ?? 'both'
  const source = process.env.LAWYERS_SOURCE ?? 'lawyers.com'
  const fetchDetails = process.env.LAWYERS_FETCH_DETAILS === 'true'
  const detailDelay = num(process.env.LAWYERS_DETAIL_DELAY_MS, opts.baseDelay)

  // Build the list of listing URLs to crawl: either explicit, or discovered from sitemaps.
  let baseUrls: string[]
  if (sitemaps.length > 0) {
    const filter = process.env.LAWYERS_URL_FILTER
      ? new RegExp(process.env.LAWYERS_URL_FILTER, 'i')
      : /\/personal-injury\/[^/]+\/california\/law-firms\/?$/i
    console.log(`Discovering listing URLs from ${sitemaps.length} sitemap(s)…`)
    baseUrls = await discoverListingUrls(sitemaps, filter)
    console.log(`Discovered ${baseUrls.length} listing URLs.\n`)
  } else if (baseUrl) {
    baseUrls = [baseUrl]
  } else {
    throw new Error(
      'Set LAWYERS_BASE_URL or LAWYERS_SITEMAPS. Example base URL: ' +
        '"https://www.lawyers.com/personal-injury/glendale/california/law-firms/"'
    )
  }

  const outputPath = resolve(
    process.env.LAWYERS_OUTPUT ??
      `tmp/lawyers-com-${baseUrl ? slugFromUrl(baseUrl) : 'sitemap-crawl'}.json`
  )

  if (discoverOnly) {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, JSON.stringify(baseUrls, null, 2), 'utf8')
    console.log(`Discover-only: wrote ${baseUrls.length} URLs to ${outputPath}`)
    await prisma.$disconnect().catch(() => undefined)
    return
  }

  console.log(`Crawling ${baseUrls.length} listing(s) | delay ${opts.baseDelay}ms | mode ${opts.mode}\n`)

  const collected = new Map<string, Firm>()
  for (let i = 0; i < baseUrls.length; i += 1) {
    if (collected.size >= opts.maxFirms) {
      console.log('Reached LAWYERS_MAX_FIRMS cap — stopping.')
      break
    }
    const listing = baseUrls[i]
    const added = await crawlListing(listing, opts, collected)
    console.log(`[${i + 1}/${baseUrls.length}] ${listing} → +${added} (total ${collected.size})`)
  }

  let firms = [...collected.values()]

  // Phase 2: visit each firm's detail page for richer per-firm/attorney data.
  if (fetchDetails) {
    const withUrls = firms.filter((f) => f.profileUrl)
    console.log(`\nFetching ${withUrls.length} firm detail pages…`)
    const enriched: Firm[] = []
    for (let i = 0; i < firms.length; i += 1) {
      const firm = firms[i]
      if (!firm.profileUrl) {
        enriched.push(firm)
        continue
      }
      console.log(`  [${i + 1}/${firms.length}] ${firm.name}`)
      try {
        const detail = await fetchPage(firm.profileUrl, mode, headless)
        if (detail.status >= 400) {
          console.warn(`    ↳ HTTP ${detail.status}, keeping listing data only`)
          enriched.push(firm)
        } else {
          const merged = enrichFromDetail(firm, detail.html)
          console.log(
            `    ↳ ${merged.practiceAreas.length} practice areas, ${merged.attorneys.length} attorneys` +
              `${merged.website ? ', website' : ''}${merged.email ? ', email' : ''}`
          )
          enriched.push(merged)
        }
      } catch (error) {
        console.warn(`    ↳ detail fetch failed: ${(error as Error).message}`)
        enriched.push(firm)
      }
      await sleep(detailDelay + Math.floor(Math.random() * 1000))
    }
    firms = enriched
  }

  if (persist === 'json' || persist === 'both') {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, JSON.stringify(firms, null, 2), 'utf8')
    console.log(`\nSaved ${firms.length} unique firms to ${outputPath}`)
  }

  if (persist === 'db' || persist === 'both') {
    const { created, updated } = await persistToDb(firms, source)
    console.log(`Upserted into production_attorneys: ${created} created, ${updated} updated.`)
  }

  console.log(`\nDone. ${firms.length} unique firms (persist mode: ${persist}).`)

  if (cachedBrowser) await cachedBrowser.close().catch(() => undefined)
  await prisma.$disconnect().catch(() => undefined)
}

async function persistToDb(firms: Firm[], source: string): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  for (const firm of firms) {
    const dedupeHash = dedupeHashFor(firm)
    const data = {
      source,
      dedupeHash,
      name: firm.name,
      email: firm.email,
      phone: firm.phone,
      website: firm.website,
      profileUrl: firm.profileUrl,
      street: firm.street,
      city: firm.city,
      state: firm.state,
      zip: firm.zip,
      practiceAreas: firm.practiceAreas.length > 0 ? JSON.stringify(firm.practiceAreas) : null,
      rating: firm.rating,
      reviewCount: firm.reviewCount,
      sourcePage: firm.sourcePage,
      rawPayload: JSON.stringify(firm),
      scrapedAt: new Date(),
    }
    const existing = await prisma.productionAttorney.findUnique({
      where: { source_dedupeHash: { source, dedupeHash } },
      select: { id: true },
    })
    await prisma.productionAttorney.upsert({
      where: { source_dedupeHash: { source, dedupeHash } },
      // Don't clobber review state on re-scrape; refresh the scraped fields only.
      update: { ...data },
      create: data,
    })
    if (existing) updated += 1
    else created += 1
  }
  return { created, updated }
}

main().catch(async (error) => {
  console.error(error)
  if (cachedBrowser) await cachedBrowser.close().catch(() => undefined)
  process.exit(1)
})
