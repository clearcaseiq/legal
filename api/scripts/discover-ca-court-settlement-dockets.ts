import { createHash } from 'crypto'
import { resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type SearchResult = {
  title: string
  link: string
  snippet: string
  position: number
  query: string
  searchUrl: string
}

type Candidate = {
  candidateId: string
  url: string
  sourceDomain: string
  title: string
  snippet: string
  state: 'CA'
  courtHint: string | null
  countyHint: string | null
  signalType: string
  confidence: number
  documentKind: string
  sourceQuery: string
  sourceUrl: string
  sourceRank: number
  metadata: Record<string, unknown>
}

const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json'
const BING_SEARCH_URL = 'https://www.bing.com/search'
const STATE = 'CA'

const COURT_DOMAINS = [
  'lacourt.org',
  'occourts.org',
  'sdcourt.ca.gov',
  'fresno.courts.ca.gov',
  'alameda.courts.ca.gov',
  'sacramento.courts.ca.gov',
  'riverside.courts.ca.gov',
  'sb-court.org',
  'sanmateo.courts.ca.gov',
  'sonoma.courts.ca.gov',
  'stanislaus.courts.ca.gov',
  'ventura.courts.ca.gov',
  'santaclara.courts.ca.gov',
  'contracosta.courts.ca.gov',
  'kern.courts.ca.gov',
]

const SETTLEMENT_QUERIES = [
  '"good faith settlement" "personal injury"',
  '"determination of good faith settlement" "CCP 877.6"',
  '"minor\'s compromise" "personal injury"',
  '"petition to approve compromise" "personal injury"',
  '"notice of settlement" "personal injury"',
  '"request for dismissal" "settlement" "personal injury"',
  '"mandatory settlement conference" "personal injury"',
  '"settlement amount" "personal injury"',
]

const SIGNAL_RULES: Array<{ signalType: string; pattern: RegExp; confidence: number }> = [
  { signalType: 'good_faith_settlement', pattern: /\bgood faith settlement|ccp\s*877\.?6\b/i, confidence: 0.93 },
  { signalType: 'minor_compromise', pattern: /\bminor'?s compromise|petition to approve compromise|compromise of minor\b/i, confidence: 0.95 },
  { signalType: 'notice_of_settlement', pattern: /\bnotice of settlement|case settled|settled\b/i, confidence: 0.85 },
  { signalType: 'dismissal_after_settlement', pattern: /\brequest for dismissal|dismissal with prejudice\b/i, confidence: 0.55 },
  { signalType: 'settlement_conference', pattern: /\bmandatory settlement conference|settlement conference\b/i, confidence: 0.45 },
  { signalType: 'settlement_amount_mention', pattern: /\bsettlement amount|\$\s?\d/i, confidence: 0.75 },
]

const COUNTY_HINTS: Array<[string, RegExp]> = [
  ['Los Angeles', /\blos angeles|\blacourt\b/i],
  ['Orange', /\borange|\boccourts\b/i],
  ['San Diego', /\bsan diego|\bsdcourt\b/i],
  ['Fresno', /\bfresno\b/i],
  ['Alameda', /\balameda\b/i],
  ['Sacramento', /\bsacramento\b/i],
  ['Riverside', /\briverside\b/i],
  ['San Bernardino', /\bsan bernardino|\bsb-court\b/i],
  ['San Mateo', /\bsan mateo\b/i],
  ['Sonoma', /\bsonoma\b/i],
  ['Santa Clara', /\bsanta clara\b/i],
  ['Contra Costa', /\bcontra costa\b/i],
  ['Kern', /\bkern\b/i],
  ['Ventura', /\bventura\b/i],
]

function getArg(name: string) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

function getIntArg(name: string, fallback: number) {
  const value = Number(getArg(name))
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function getListArg(name: string, fallback: string[]) {
  const value = getArg(name)
  if (!value) return fallback
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required in api/.env.`)
  return value
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
}

function stripHtml(value: string) {
  return compactText(decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')))
}

function hashId(parts: string[]) {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

function sourceDomain(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function publicSearchUrl(url: string) {
  const parsed = new URL(url)
  parsed.searchParams.delete('api_key')
  return parsed.toString()
}

function detectSignalType(text: string) {
  return SIGNAL_RULES.find((rule) => rule.pattern.test(text)) || null
}

function detectDocumentKind(url: string, text: string) {
  if (/\.pdf(?:$|\?)/i.test(url)) return 'pdf'
  if (/\btentative ruling|tentative rulings\b/i.test(text)) return 'tentative_ruling'
  if (/\bcivil index|case access|register of actions|case search\b/i.test(text)) return 'case_search'
  if (/\bminute order|order\b/i.test(text)) return 'order'
  return 'web_page'
}

function detectCounty(url: string, text: string) {
  const combined = `${url} ${text}`
  return COUNTY_HINTS.find(([, pattern]) => pattern.test(combined))?.[0] || null
}

function buildSearchUrl(query: string, page: number) {
  const url = new URL(SERPAPI_SEARCH_URL)
  url.searchParams.set('engine', 'google')
  url.searchParams.set('api_key', requireEnv('SERPAPI_API_KEY'))
  url.searchParams.set('q', query)
  url.searchParams.set('num', '10')
  url.searchParams.set('start', String(page * 10))
  return url.toString()
}

function buildBingSearchUrl(query: string, page: number) {
  const url = new URL(BING_SEARCH_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('first', String(page * 10 + 1))
  return url.toString()
}

async function fetchSerpApiResults(query: string, page: number): Promise<SearchResult[]> {
  const searchUrl = buildSearchUrl(query, page)
  const response = await fetch(searchUrl, {
    headers: { 'User-Agent': 'CaseIQ-CA-CourtSettlementDiscovery/0.1 (+research)' },
  })
  const body = (await response.json().catch(async () => ({ error: await response.text() }))) as Record<string, unknown>
  if (!response.ok) throw new Error(`SerpAPI request failed ${response.status}: ${JSON.stringify(body).slice(0, 800)}`)

  const organic = Array.isArray(body.organic_results) ? body.organic_results : []
  return organic
    .map((item, index) => {
      const result = item as Record<string, unknown>
      return {
        title: compactText(String(result.title || '')),
        link: String(result.link || ''),
        snippet: compactText(String(result.snippet || '')),
        position: Number(result.position || index + 1),
        query,
        searchUrl: publicSearchUrl(searchUrl),
      }
    })
    .filter((result) => result.link)
}

async function fetchBingResults(query: string, page: number): Promise<SearchResult[]> {
  const searchUrl = buildBingSearchUrl(query, page)
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CaseIQ-CA-CourtSettlementDiscovery/0.1; +research)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  const html = await response.text()
  if (!response.ok) throw new Error(`Bing request failed ${response.status}: ${html.slice(0, 500)}`)

  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/gi) || []
  return blocks
    .map((block, index) => {
      const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      if (!linkMatch) return null
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      return {
        title: stripHtml(linkMatch[2]),
        link: decodeHtml(linkMatch[1]),
        snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
        position: page * 10 + index + 1,
        query,
        searchUrl,
      }
    })
    .filter((result): result is SearchResult => Boolean(result?.link))
}

async function fetchSearchResults(query: string, page: number, provider: string): Promise<SearchResult[]> {
  if (provider === 'bing') return fetchBingResults(query, page)
  if (provider === 'serpapi') return fetchSerpApiResults(query, page)
  throw new Error(`Unsupported provider "${provider}". Use serpapi or bing.`)
}

function candidateFromResult(result: SearchResult): Candidate | null {
  const text = `${result.title} ${result.snippet} ${result.link}`
  const signal = detectSignalType(text)
  if (!signal) return null

  const domain = sourceDomain(result.link)
  if (!domain) return null

  return {
    candidateId: hashId([result.link, result.query]),
    url: result.link,
    sourceDomain: domain,
    title: result.title,
    snippet: result.snippet,
    state: STATE,
    courtHint: domain,
    countyHint: detectCounty(result.link, text),
    signalType: signal.signalType,
    confidence: signal.confidence,
    documentKind: detectDocumentKind(result.link, text),
    sourceQuery: result.query,
    sourceUrl: result.searchUrl,
    sourceRank: result.position,
    metadata: {
      provider: 'serpapi_google',
      discovered_at: new Date().toISOString(),
    },
  }
}

async function ensureTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`create schema if not exists cap`)
  await prisma.$executeRawUnsafe(`
    create table if not exists cap.ca_court_settlement_candidates (
      candidate_id text primary key,
      url text not null,
      source_domain text not null,
      title text,
      snippet text,
      state text not null default 'CA',
      court_hint text,
      county_hint text,
      signal_type text not null,
      confidence numeric(4,3) not null,
      document_kind text not null,
      source_query text not null,
      source_url text not null,
      source_rank int,
      label_status text not null default 'candidate',
      metadata_json jsonb not null default '{}'::jsonb,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await prisma.$executeRawUnsafe(`create unique index if not exists ca_court_settlement_candidates_url_query_idx on cap.ca_court_settlement_candidates (url, source_query)`)
  await prisma.$executeRawUnsafe(`create index if not exists ca_court_settlement_candidates_type_idx on cap.ca_court_settlement_candidates (signal_type, county_hint)`)
}

async function upsertCandidate(prisma: PrismaClient, candidate: Candidate) {
  await prisma.$executeRawUnsafe(
    `
    insert into cap.ca_court_settlement_candidates (
      candidate_id, url, source_domain, title, snippet, state, court_hint, county_hint,
      signal_type, confidence, document_kind, source_query, source_url, source_rank,
      metadata_json, last_seen_at, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, now(), now())
    on conflict (candidate_id) do update set
      title = excluded.title,
      snippet = excluded.snippet,
      confidence = excluded.confidence,
      document_kind = excluded.document_kind,
      source_url = excluded.source_url,
      source_rank = excluded.source_rank,
      metadata_json = excluded.metadata_json,
      last_seen_at = now(),
      updated_at = now()
  `,
    candidate.candidateId,
    candidate.url,
    candidate.sourceDomain,
    candidate.title,
    candidate.snippet,
    candidate.state,
    candidate.courtHint,
    candidate.countyHint,
    candidate.signalType,
    candidate.confidence,
    candidate.documentKind,
    candidate.sourceQuery,
    candidate.sourceUrl,
    candidate.sourceRank,
    JSON.stringify(candidate.metadata),
  )
}

function buildQueries(domains: string[], seedQueries: string[]) {
  const queries: string[] = []
  for (const domain of domains) {
    for (const query of seedQueries) queries.push(`site:${domain} ${query}`)
  }
  return queries
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const provider = getArg('provider') || 'serpapi'
  const domains = getListArg('domains', COURT_DOMAINS)
  const seedQueries = getListArg('queries', SETTLEMENT_QUERIES)
  const maxPages = getIntArg('pages', 1)
  const maxQueries = getIntArg('max-queries', domains.length * seedQueries.length)
  const queries = buildQueries(domains, seedQueries).slice(0, maxQueries)
  const candidatesById = new Map<string, Candidate>()

  for (const query of queries) {
    for (let page = 0; page < maxPages; page += 1) {
      const results = await fetchSearchResults(query, page, provider)
      for (const result of results) {
        const candidate = candidateFromResult(result)
        if (candidate) candidatesById.set(candidate.candidateId, candidate)
      }
    }
  }

  const candidates = [...candidatesById.values()]
  const byType = candidates.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.signalType] = (acc[candidate.signalType] || 0) + 1
    return acc
  }, {})

  if (dryRun) {
    console.log(JSON.stringify({ provider, queries: queries.length, candidates: candidates.length, byType, sample: candidates.slice(0, 10) }, null, 2))
    return
  }

  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL or DATABASE_URL is required.')
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    await ensureTable(prisma)
    for (const candidate of candidates) await upsertCandidate(prisma, candidate)
    const status = await prisma.$queryRawUnsafe(`
      select signal_type, count(*)::int as rows
      from cap.ca_court_settlement_candidates
      group by signal_type
      order by rows desc
    `)
    console.log(JSON.stringify({ provider, queries: queries.length, candidates: candidates.length, byType, remoteStatus: status }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
