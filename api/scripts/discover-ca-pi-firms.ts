import { createHash } from 'crypto'
import { resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type FirmCandidate = {
  firmId: string
  firmName: string
  website: string
  websiteDomain: string
  city: string | null
  state: string
  practiceFocus: string
  piConfidence: number
  discoverySource: string
  sourceUrl: string
  sourceRank: number
  metadata: Record<string, unknown>
}

type SkippedFirmCandidate = {
  firmId: string
  skippedFirmName: string
  website: string
  websiteDomain: string
  city: string | null
  state: string
  skipReason: string
  discoverySource: string
  sourceUrl: string
  sourceRank: number
  metadata: Record<string, unknown>
}

const USER_AGENT = 'Mozilla/5.0 (compatible; CaseIQ-PI-FirmDiscovery/0.1; +research)'
const BING_SEARCH_URL = 'https://www.bing.com/search?q='
const YAHOO_SEARCH_URL = 'https://search.yahoo.com/search?p='
const MOJEEK_SEARCH_URL = 'https://www.mojeek.com/search?q='
const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json'
const STATE = 'CA'
const SEARCH_PROVIDERS = ['bing', 'yahoo', 'mojeek', 'google'] as const
type SearchProvider = (typeof SEARCH_PROVIDERS)[number]
const DEFAULT_SEARCH_PROVIDERS: SearchProvider[] = ['bing', 'yahoo', 'mojeek']
const EXCLUDED_DOMAINS = [
  'bing.com',
  'google.com',
  'duckduckgo.com',
  'yahoo.com',
  'yelp.com',
  'avvo.com',
  'justia.com',
  'findlaw.com',
  'superlawyers.com',
  'lawyers.com',
  'martindale.com',
  'expertise.com',
  'forbes.com',
  'reddit.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'mapquest.com',
  'wikipedia.org',
  'ca.gov',
  'calbar.ca.gov',
  'bbb.org',
  'thumbtack.com',
  'angi.com',
  'lawinfo.com',
  'signalhire.com',
  'datanyze.com',
  'zoominfo.com',
  'leadnear.com',
  'toyota.com',
  'rockauto.com',
  'cslocallk.com',
  'microsoft.com',
  'threebestrated.com',
  'bestlawyers.com',
]

const CA_CITIES = [
  'Los Angeles',
  'San Diego',
  'San Jose',
  'San Francisco',
  'Sacramento',
  'Fresno',
  'Long Beach',
  'Oakland',
  'Bakersfield',
  'Anaheim',
  'Santa Ana',
  'Riverside',
  'Stockton',
  'Irvine',
  'Chula Vista',
  'Fremont',
  'San Bernardino',
  'Modesto',
  'Fontana',
  'Santa Clarita',
  'Moreno Valley',
  'Glendale',
  'Huntington Beach',
  'Santa Rosa',
  'Oceanside',
  'Garden Grove',
  'Rancho Cucamonga',
  'Ontario',
  'Elk Grove',
  'Corona',
  'Lancaster',
  'Palmdale',
  'Salinas',
  'Pomona',
  'Hayward',
  'Escondido',
  'Torrance',
  'Sunnyvale',
  'Orange',
  'Fullerton',
  'Pasadena',
  'Thousand Oaks',
  'Visalia',
  'Simi Valley',
  'Concord',
  'Roseville',
  'Victorville',
  'Santa Clara',
  'Vallejo',
  'Berkeley',
  'El Monte',
  'Downey',
  'Costa Mesa',
  'Inglewood',
  'Carlsbad',
  'Fairfield',
  'Murrieta',
  'Temecula',
  'Antioch',
  'Richmond',
  'Ventura',
  'Daly City',
  'Norwalk',
  'Burbank',
  'San Mateo',
  'Clovis',
  'Vacaville',
  'Rialto',
  'Compton',
  'Mission Viejo',
  'South Gate',
  'West Covina',
  'Menifee',
  'Carson',
  'Santa Monica',
  'Westminster',
  'Redding',
  'Santa Barbara',
  'Chico',
  'Newport Beach',
  'San Leandro',
  'San Marcos',
  'Whittier',
  'Hawthorne',
  'Citrus Heights',
  'Tracy',
  'Alhambra',
  'Livermore',
  'Buena Park',
  'Lakewood',
  'Merced',
  'Hemet',
  'Chino',
  'Indio',
  'Redwood City',
  'Lake Forest',
  'Napa',
  'Tustin',
  'Bellflower',
  'Mountain View',
  'Chino Hills',
  'Baldwin Park',
  'Alameda',
  'Upland',
  'San Ramon',
  'Folsom',
  'Pleasanton',
  'Union City',
  'Manteca',
  'Perris',
  'Lynwood',
  'Apple Valley',
  'Redlands',
  'Turlock',
  'Milpitas',
  'Redondo Beach',
  'Rancho Cordova',
  'Yorba Linda',
  'Palo Alto',
  'Davis',
  'Camarillo',
  'Walnut Creek',
  'Pittsburg',
  'South San Francisco',
  'Yuba City',
  'San Clemente',
  'Laguna Niguel',
  'Pico Rivera',
  'Montebello',
  'Lodi',
  'Madera',
  'Santa Cruz',
  'La Habra',
  'Encinitas',
  'Monterey Park',
  'Tulare',
  'Cupertino',
  'Gardena',
  'National City',
  'Rocklin',
  'Petaluma',
  'Huntington Park',
  'San Rafael',
  'La Mesa',
  'Arcadia',
  'Fountain Valley',
  'Diamond Bar',
  'Woodland',
  'Santee',
  'Porterville',
  'Paramount',
  'Hacienda Heights',
  'Palm Desert',
  'Cerritos',
  'Watsonville',
  'Brentwood',
  'West Sacramento',
  'Novato',
  'Colton',
  'Gilroy',
  'Cathedral City',
  'Delano',
  'Yucaipa',
  'Placentia',
  'Poway',
  'Rosemead',
  'Aliso Viejo',
  'Palm Springs',
  'Cypress',
  'Azusa',
  'Covina',
  'La Mirada',
  'Rancho Santa Margarita',
  'Ceres',
  'San Luis Obispo',
  'Dublin',
  'Lincoln',
  'Newark',
  'Lompoc',
  'El Centro',
  'Danville',
  'Bell Gardens',
  'Coachella',
  'Rancho Palos Verdes',
]

const PRACTICE_QUERIES = [
  'personal injury lawyer',
  'car accident lawyer',
  'truck accident lawyer',
  'motorcycle accident lawyer',
  'slip and fall lawyer',
  'wrongful death lawyer',
  'personal injury law firm case results',
  'injury attorneys',
  'accident attorneys',
  'trial lawyers personal injury',
  'catastrophic injury lawyer',
  'pedestrian accident lawyer',
  'bicycle accident lawyer',
  'rideshare accident lawyer',
  'brain injury lawyer',
  'spinal cord injury lawyer',
  'premises liability lawyer',
  'dog bite lawyer',
  'Uber accident lawyer',
  'Lyft accident lawyer',
  'verdicts settlements personal injury law firm',
]

function getArg(name: string) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

function getIntArg(name: string, fallback: number) {
  const parsed = Number(getArg(name))
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function getNonNegativeIntArg(name: string, fallback: number) {
  const parsed = Number(getArg(name))
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

function getSearchProviders() {
  const providersArg = getArg('providers')
  if (!providersArg) return DEFAULT_SEARCH_PROVIDERS

  const providers = providersArg
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is SearchProvider => SEARCH_PROVIDERS.includes(provider as SearchProvider))

  return providers.length > 0 ? providers : DEFAULT_SEARCH_PROVIDERS
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.replace(/&amp;/g, '&'))
    const redirectTarget = unwrapBingRedirect(url) || unwrapYahooRedirect(url)
    if (redirectTarget) return normalizeUrl(redirectTarget)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function unwrapYahooRedirect(url: URL) {
  if (!normalizeDomain(url.hostname).endsWith('yahoo.com')) return null
  const match = url.pathname.match(/\/RU=([^/]+)/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

function unwrapBingRedirect(url: URL) {
  if (!normalizeDomain(url.hostname).endsWith('bing.com')) return null
  const encoded = url.searchParams.get('u')
  if (!encoded?.startsWith('a1')) return null

  try {
    const base64Url = encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64Url, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function normalizeDomain(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function rootWebsite(rawUrl: string) {
  const url = new URL(rawUrl)
  return `${url.protocol}//${url.host}/`
}

function isExcludedDomain(domain: string) {
  return EXCLUDED_DOMAINS.some((excluded) => domain === excluded || domain.endsWith(`.${excluded}`))
}

function skipReasonFor(domain: string, title: string) {
  const haystack = `${domain} ${title}`
  if (isExcludedDomain(domain)) return 'excluded_domain'
  if ((domain.match(/-/g) || []).length > 3) return 'noisy_domain'
  if (/\b(local|directory|listing|lead|profile|company)\b/i.test(domain)) return 'noisy_domain'
  if (/\b(directory|best lawyers|top attorneys|near me|reviews?|ratings?)\b/i.test(title)) return 'directory_result'
  if (!/\b(law|lawyer|attorney|injury|accident|legal|firm|trial)\b/i.test(haystack)) return 'missing_firm_signal'
  return null
}

function looksLikeFirm(domain: string, title: string) {
  const reason = skipReasonFor(domain, title)
  if (reason) return false
  return true
}

function confidenceFor(title: string, domain: string, query: string) {
  let score = 0.45
  const haystack = `${title} ${domain} ${query}`
  if (/\bpersonal injury\b/i.test(haystack)) score += 0.2
  if (/\b(car|truck|motorcycle|accident|wrongful death|slip and fall)\b/i.test(haystack)) score += 0.15
  if (/\b(law firm|attorneys?|lawyers?)\b/i.test(haystack)) score += 0.15
  if (/\bcase results?|verdicts?|settlements?\b/i.test(haystack)) score += 0.05
  return Math.min(0.99, Number(score.toFixed(3)))
}

function firmNameFromTitle(title: string, domain: string) {
  const fallback = domain
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  const cleanSegment = (segment: string) =>
    segment
    .replace(/\b(?:Personal Injury|Car Accident|Truck Accident|Wrongful Death|Lawyer|Attorney)s?\b/gi, '')
    .replace(/\bin\s+[A-Z][A-Za-z\s]+,?\s*CA\b/g, '')
      .replace(/\b(?:Los Angeles|San Diego|San Jose|San Francisco|Sacramento|California|CA|Success Rate)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const segments = title.split(/\s+(?:[-|–])\s+/).map(cleanSegment)
  for (const segment of segments.reverse()) {
    if (
      segment.length >= 3 &&
      segment.length <= 120 &&
      !/^\d/.test(segment) &&
      !/^(accident|injury|law|legal)$/i.test(segment) &&
      !/\b(in|near|free consultation)\b/i.test(segment)
    ) {
      return segment
    }
  }

  const cleaned = cleanSegment(title)
  if (
    cleaned.length >= 3 &&
    cleaned.length <= 120 &&
    !/^\d/.test(cleaned) &&
    !/[|]/.test(cleaned) &&
    !/^(accident|injury|law|legal|in|-|,|\s)+$/i.test(cleaned)
  ) {
    return cleaned
  }
  return fallback
}

function buildSearchUrl(provider: SearchProvider, query: string, page: number) {
  const offset = page * 10
  if (provider === 'bing') return `${BING_SEARCH_URL}${encodeURIComponent(query)}&first=${offset + 1}`
  if (provider === 'yahoo') return `${YAHOO_SEARCH_URL}${encodeURIComponent(query)}&b=${offset + 1}`
  if (provider === 'mojeek') return `${MOJEEK_SEARCH_URL}${encodeURIComponent(query)}&s=${offset}`

  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) throw new Error('SERPAPI_API_KEY is required for --providers=google')
  const url = new URL(SERPAPI_SEARCH_URL)
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', query)
  url.searchParams.set('location', 'California, United States')
  url.searchParams.set('google_domain', 'google.com')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('num', '10')
  url.searchParams.set('start', String(offset))
  url.searchParams.set('api_key', apiKey)
  return url.toString()
}

function publicSearchUrl(searchUrl: string) {
  try {
    const url = new URL(searchUrl)
    url.searchParams.delete('api_key')
    return url.toString()
  } catch {
    return searchUrl
  }
}

async function extractSerpApiResults(searchUrl: string) {
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error(`Google search API failed ${response.status} ${response.statusText}`)

  const payload = (await response.json()) as {
    error?: string
    organic_results?: Array<{ link?: string; title?: string }>
  }
  if (payload.error) throw new Error(`Google search API error: ${payload.error}`)

  return (payload.organic_results || [])
    .map((result) => {
      const url = result.link ? normalizeUrl(result.link) : null
      const title = result.title ? stripHtml(result.title) : ''
      return url && title ? { url, title } : null
    })
    .filter((result): result is { url: string; title: string } => Boolean(result))
}

function extractOrganicResults(html: string) {
  const results: Array<{ url: string; title: string }> = []
  const seen = new Set<string>()
  const h2LinkRe = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/gi
  for (const match of html.matchAll(h2LinkRe)) {
    const url = normalizeUrl(match[1])
    if (!url) continue
    const title = stripHtml(match[2])
    if (!title) continue
    seen.add(url)
    results.push({ url, title })
  }

  const anchorRe = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]{0,500}?)<\/a>/gi
  for (const match of html.matchAll(anchorRe)) {
    const url = normalizeUrl(match[1])
    if (!url || seen.has(url)) continue
    const title = stripHtml(match[2])
    if (title.length < 8 || title.length > 180) continue
    if (/^(cached|translate|images|videos|news|maps|shopping|more|next|previous)$/i.test(title)) continue
    seen.add(url)
    results.push({ url, title })
  }

  return results
}

function dedupeSearchResults(results: Array<{ url: string; title: string }>) {
  const seenDomains = new Set<string>()
  const deduped: Array<{ url: string; title: string }> = []
  for (const result of results) {
    const domain = normalizeDomain(new URL(result.url).hostname)
    if (seenDomains.has(domain)) continue
    seenDomains.add(domain)
    deduped.push(result)
  }
  return deduped
}

function candidateFromSearchResult(
  result: { url: string; title: string },
  city: string,
  query: string,
  rank: number,
  provider: SearchProvider,
  searchUrl: string,
  page: number,
): FirmCandidate | null {
  const url = new URL(result.url)
  const domain = normalizeDomain(url.hostname)
  if (!looksLikeFirm(domain, result.title)) return null

  const website = rootWebsite(result.url)
  const firmName = firmNameFromTitle(result.title, domain)
  const hash = createHash('sha1').update(`${STATE}:${domain}`).digest('hex').slice(0, 16)

  return {
    firmId: `firm_${STATE.toLowerCase()}_${hash}`,
    firmName,
    website,
    websiteDomain: domain,
    city,
    state: STATE,
    practiceFocus: 'personal_injury',
    piConfidence: confidenceFor(result.title, domain, query),
    discoverySource: `${provider}_search`,
    sourceUrl: publicSearchUrl(searchUrl),
    sourceRank: rank,
    metadata: {
      search_provider: provider,
      search_page: page + 1,
      search_city: city,
      search_query: query,
      result_title: result.title,
      result_url: result.url,
    },
  }
}

function skippedCandidateFromSearchResult(
  result: { url: string; title: string },
  city: string,
  query: string,
  rank: number,
  provider: SearchProvider,
  searchUrl: string,
  page: number,
): SkippedFirmCandidate | null {
  const url = new URL(result.url)
  const domain = normalizeDomain(url.hostname)
  const skipReason = skipReasonFor(domain, result.title)
  if (!skipReason) return null
  if (skipReason === 'missing_firm_signal') return null
  if (!/\b(law|lawyer|attorney|injury|accident|firm|attorneys?)\b/i.test(`${domain} ${result.title}`)) return null

  const website = rootWebsite(result.url)
  const skippedFirmName = firmNameFromTitle(result.title, domain)
  const hash = createHash('sha1').update(`${STATE}:skipped:${domain}`).digest('hex').slice(0, 16)

  return {
    firmId: `firm_${STATE.toLowerCase()}_skipped_${hash}`,
    skippedFirmName,
    website,
    websiteDomain: domain,
    city,
    state: STATE,
    skipReason,
    discoverySource: `${provider}_search_skipped`,
    sourceUrl: publicSearchUrl(searchUrl),
    sourceRank: rank,
    metadata: {
      search_provider: provider,
      search_page: page + 1,
      search_city: city,
      search_query: query,
      result_title: result.title,
      result_url: result.url,
      skipped: true,
      skip_reason: skipReason,
    },
  }
}

async function ensureTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    create table if not exists public.law_firms (
      firm_id text primary key,
      firm_name text not null,
      website text,
      website_domain text,
      phone text,
      email text,
      address_1 text,
      address_2 text,
      city text,
      state text not null,
      zip text,
      country text not null default 'US',
      practice_focus text,
      is_personal_injury boolean,
      pi_confidence numeric(4,3),
      discovery_source text,
      source_url text,
      source_state text,
      source_rank int,
      status text not null default 'discovered',
      notes text,
      skipped_firm_name text,
      skip_reason text,
      metadata_json jsonb not null default '{}'::jsonb,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await prisma.$executeRawUnsafe(`create index if not exists law_firms_state_idx on public.law_firms (state)`)
  await prisma.$executeRawUnsafe(`create index if not exists law_firms_website_domain_idx on public.law_firms (website_domain) where website_domain is not null`)
  await prisma.$executeRawUnsafe(`create unique index if not exists law_firms_state_domain_unique_idx on public.law_firms (state, lower(website_domain)) where website_domain is not null`)
  await prisma.$executeRawUnsafe(`alter table public.law_firms add column if not exists skipped_firm_name text`)
  await prisma.$executeRawUnsafe(`alter table public.law_firms add column if not exists skip_reason text`)
  await prisma.$executeRawUnsafe(
    `create index if not exists law_firms_skip_reason_idx on public.law_firms (state, skip_reason) where skip_reason is not null`,
  )
}

async function upsertCandidate(prisma: PrismaClient, candidate: FirmCandidate) {
  await prisma.$executeRawUnsafe(
    `
    insert into public.law_firms (
      firm_id, firm_name, website, website_domain, city, state, practice_focus,
      is_personal_injury, pi_confidence, discovery_source, source_url, source_state,
      source_rank, status, metadata_json, last_seen_at
    )
    values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,$12,'discovered',$13::jsonb,now())
    on conflict (state, lower(website_domain)) where website_domain is not null do update set
      firm_name = case when length(public.law_firms.firm_name) < length(excluded.firm_name) then excluded.firm_name else public.law_firms.firm_name end,
      website = coalesce(public.law_firms.website, excluded.website),
      city = coalesce(public.law_firms.city, excluded.city),
      practice_focus = excluded.practice_focus,
      is_personal_injury = true,
      pi_confidence = greatest(coalesce(public.law_firms.pi_confidence, 0), excluded.pi_confidence),
      discovery_source = excluded.discovery_source,
      source_url = excluded.source_url,
      source_state = excluded.source_state,
      source_rank = least(coalesce(public.law_firms.source_rank, excluded.source_rank), excluded.source_rank),
      status = case when public.law_firms.status = 'rejected' then 'discovered' else public.law_firms.status end,
      skipped_firm_name = null,
      skip_reason = null,
      metadata_json = public.law_firms.metadata_json || excluded.metadata_json,
      last_seen_at = now(),
      updated_at = now()
  `,
    candidate.firmId,
    candidate.firmName,
    candidate.website,
    candidate.websiteDomain,
    candidate.city,
    candidate.state,
    candidate.practiceFocus,
    candidate.piConfidence,
    candidate.discoverySource,
    candidate.sourceUrl,
    candidate.state,
    candidate.sourceRank,
    JSON.stringify(candidate.metadata),
  )
}

async function upsertSkippedCandidate(prisma: PrismaClient, candidate: SkippedFirmCandidate) {
  await prisma.$executeRawUnsafe(
    `
    insert into public.law_firms (
      firm_id, firm_name, website, website_domain, city, state, practice_focus,
      is_personal_injury, pi_confidence, discovery_source, source_url, source_state,
      source_rank, status, skipped_firm_name, skip_reason, notes, metadata_json, last_seen_at
    )
    values ($1,$2,$3,$4,$5,$6,'personal_injury',true,null,$7,$8,$9,$10,'rejected',$11,$12,$13,$14::jsonb,now())
    on conflict (state, lower(website_domain)) where website_domain is not null do update set
      skipped_firm_name = coalesce(public.law_firms.skipped_firm_name, excluded.skipped_firm_name),
      skip_reason = coalesce(public.law_firms.skip_reason, excluded.skip_reason),
      notes = coalesce(public.law_firms.notes, excluded.notes),
      metadata_json = public.law_firms.metadata_json || excluded.metadata_json,
      updated_at = now()
  `,
    candidate.firmId,
    candidate.skippedFirmName,
    candidate.website,
    candidate.websiteDomain,
    candidate.city,
    candidate.state,
    candidate.discoverySource,
    candidate.sourceUrl,
    candidate.state,
    candidate.sourceRank,
    candidate.skippedFirmName,
    candidate.skipReason,
    `Skipped during PI firm discovery: ${candidate.skipReason}`,
    JSON.stringify(candidate.metadata),
  )
}

async function fetchSearch(searchUrl: string) {
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!response.ok) throw new Error(`Search failed ${response.status} ${response.statusText}`)
  return response.text()
}

async function fetchSearchResults(provider: SearchProvider, searchUrl: string) {
  if (provider === 'google') return extractSerpApiResults(searchUrl)

  const html = await fetchSearch(searchUrl)
  return extractOrganicResults(html)
}

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL or DATABASE_URL is required')

  const dryRun = !process.argv.includes('--write')
  const cityStart = getNonNegativeIntArg('city-start', 0)
  const maxCities = getIntArg('max-cities', 25)
  const selectedCities = CA_CITIES.slice(cityStart, cityStart + maxCities)
  const maxResultsPerQuery = getIntArg('max-results-per-query', 8)
  const searchPages = getIntArg('search-pages', 1)
  const searchProviders = getSearchProviders()
  if (searchProviders.includes('google') && !process.env.SERPAPI_API_KEY) {
    throw new Error('SERPAPI_API_KEY is required when --providers includes google')
  }
  const maxQueries = getIntArg('max-queries', selectedCities.length * PRACTICE_QUERIES.length * searchProviders.length * searchPages)
  const delayMs = getIntArg('delay-ms', 1500)
  const recordSkips = process.argv.includes('--record-skips')
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

  let searched = 0
  let found = 0
  let skipped = 0
  const errors: string[] = []

  try {
    if (!dryRun && !process.argv.includes('--skip-ensure')) await ensureTables(prisma)

    for (const city of selectedCities) {
      for (const query of PRACTICE_QUERIES) {
        if (searched >= maxQueries) break
        for (const provider of searchProviders) {
          for (let page = 0; page < searchPages; page += 1) {
            const searchQuery = `${city} ${query}`
            const searchUrl = buildSearchUrl(provider, searchQuery, page)
            searched += 1
            try {
              const results = dedupeSearchResults(await fetchSearchResults(provider, searchUrl)).slice(0, maxResultsPerQuery)
              let queryFound = 0
              for (const [index, result] of results.entries()) {
                const candidate = candidateFromSearchResult(result, city, query, page * maxResultsPerQuery + index + 1, provider, searchUrl, page)
                if (!candidate) continue
                queryFound += 1
                found += 1
                if (dryRun) {
                  console.log(JSON.stringify({ dryRun: true, candidate }))
                } else {
                  await upsertCandidate(prisma, candidate)
                }
              }
              if (recordSkips) {
                for (const [index, result] of results.entries()) {
                  const skippedCandidate = skippedCandidateFromSearchResult(
                    result,
                    city,
                    query,
                    page * maxResultsPerQuery + index + 1,
                    provider,
                    searchUrl,
                    page,
                  )
                  if (!skippedCandidate) continue
                  skipped += 1
                  if (dryRun) {
                    console.log(JSON.stringify({ dryRun: true, skippedCandidate }))
                  } else {
                    await upsertSkippedCandidate(prisma, skippedCandidate)
                  }
                }
              }
              console.log(
                JSON.stringify({ progress: { provider, page: page + 1, city, query, results: results.length, candidates: queryFound } }),
              )
            } catch (error) {
              errors.push(`${provider} ${city} ${query} page ${page + 1}: ${error instanceof Error ? error.message : String(error)}`)
            }
            await sleep(delayMs)
            if (searched >= maxQueries) break
          }
          if (searched >= maxQueries) break
        }
        if (searched >= maxQueries) break
      }
      if (searched >= maxQueries) break
    }

    let persisted: unknown = null
    if (!dryRun) {
      persisted = await prisma.$queryRawUnsafe(`
        select state, count(*)::int as firms
        from public.law_firms
        group by state
        order by state
      `)
    }

    console.log(
      JSON.stringify(
        { dryRun, state: STATE, cityStart, cities: selectedCities.length, searched, found, skipped, persisted, errors: errors.slice(0, 25) },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
