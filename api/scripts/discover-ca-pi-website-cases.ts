import { createHash } from 'crypto'
import { resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type Candidate = {
  url: string
  sourceDomain: string
  sourceName: string
  state: 'CA'
  pageTitle: string | null
  caseTypeHint: string | null
  outcomeKind: string | null
  settlementAmountText: string | null
  verdictAmountText: string | null
  liabilityPercentText: string | null
  incidentLocationHint: string | null
  practiceAreaHint: string | null
  publishedDateHint: string | null
  extractedSummary: string | null
  rawTextExcerpt: string
  evidenceJson: Record<string, unknown>
}

type CrawlPage = {
  url: string
  depth: number
}

const USER_AGENT = 'CaseIQ-PI-ResearchBot/0.1 (+research; contact=admin@caseiq.local)'
const DEFAULT_SEED_URLS = [
  'https://www.bisnarlaw.com/case-results/',
  'https://www.calljacob.com/case-results/',
  'https://www.thebarnesfirm.com/case-results/',
  'https://www.millerandzois.com/results/',
  'https://www.wilshirelawfirm.com/results/',
  'https://www.ariolaw.com/results/',
  'https://www.sallymorinlaw.com/case-results/',
  'https://www.kuvaralawfirm.com/case-results/',
  'https://www.berginjurylawyers.com/case-results/',
  'https://www.cartwrightlaw.com/case-results/',
]

const CASE_RESULT_URL_RE = /\b(case-results?|results?|verdicts?|settlements?|success-stor(?:y|ies)|recover(?:y|ies)|testimonial)\b/i
const CASE_RESULT_TEXT_RE = /\b(verdict|settlement|settled|recovered|recovery|award(?:ed)?|obtained|secured|case result)\b/i
const MONEY_RE = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d+)?\s?(?:million|billion|k)\b/gi
const LIABILITY_RE = /\b(?:liability|fault|responsib(?:le|ility)|comparative fault)[^.\n]{0,80}?(\d{1,3})\s?%|\b(\d{1,3})\s?%\s?(?:liable|at fault|fault|responsib(?:le|ility))\b/gi
const DATE_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b|\b20\d{2}\b/

const CASE_TYPE_RULES: Array<[string, RegExp]> = [
  ['auto_pi', /\b(car|auto|vehicle|truck|motorcycle|rideshare|uber|lyft|collision|crash|rear[-\s]?end)\b/i],
  ['premises', /\b(premises|slip|trip|fall|sidewalk|store|restaurant|stairs|stairway|unsafe property)\b/i],
  ['workplace_injury', /\b(workplace|construction|job site|industrial|worker|employee|scaffold|forklift)\b/i],
  ['med_mal', /\b(medical malpractice|doctor|hospital|nurse|surgery|diagnosis|treatment)\b/i],
  ['product_liability', /\b(product liability|defective product|defect|failure to warn|manufacturer)\b/i],
  ['wrongful_death', /\b(wrongful death|fatal|death|died|killed|decedent|surviv(?:or|al))\b/i],
  ['dog_bite', /\b(dog bite|animal attack)\b/i],
  ['other_pi', /\b(personal injury|catastrophic injury|brain injury|spinal cord|burn injury)\b/i],
]

const PRACTICE_AREA_RULES: Array<[string, RegExp]> = [
  ['personal_injury', /\bpersonal injury\b/i],
  ['car_accident', /\b(car|auto|vehicle) accident\b/i],
  ['truck_accident', /\btruck accident\b/i],
  ['motorcycle_accident', /\bmotorcycle accident\b/i],
  ['premises_liability', /\bpremises liability|slip and fall\b/i],
  ['wrongful_death', /\bwrongful death\b/i],
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

function getNonNegativeIntArg(name: string, fallback: number) {
  const value = Number(getArg(name))
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
}

function getListArg(name: string) {
  const value = getArg(name)
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeUrl(rawUrl: string, baseUrl?: string) {
  try {
    const url = new URL(rawUrl, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.hash = ''
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return null
  }
}

function rootUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  return `${url.protocol}//${url.host}`
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripHtml(html: string) {
  return compactText(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
  )
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? compactText(stripHtml(match[1])).slice(0, 240) : null
}

function extractLinks(html: string, baseUrl: string, sourceHost: string) {
  const links = new Set<string>()
  const linkRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
  for (const match of html.matchAll(linkRe)) {
    const href = match[1]
    const normalized = normalizeUrl(href, baseUrl)
    if (!normalized) continue
    const url = new URL(normalized)
    if (url.host !== sourceHost) continue
    if (/\.(?:pdf|jpg|jpeg|png|gif|webp|zip|docx?|xlsx?)$/i.test(url.pathname)) continue
    links.add(normalized)
  }
  return [...links]
}

function firstMatchText(pattern: RegExp, text: string) {
  const match = text.match(pattern)
  return match ? match[0] : null
}

function collectMoney(text: string) {
  return [...new Set([...text.matchAll(MONEY_RE)].map((match) => compactText(match[0])))]
}

function collectLiability(text: string) {
  return [...new Set([...text.matchAll(LIABILITY_RE)].map((match) => compactText(match[0])))]
}

function pickRule(rules: Array<[string, RegExp]>, text: string) {
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || null
}

function inferOutcomeKind(text: string) {
  if (/\bverdict|jury award|judgment\b/i.test(text)) return 'verdict'
  if (/\bsettlement|settled\b/i.test(text)) return 'settlement'
  if (/\brecovered|recovery|obtained|secured\b/i.test(text)) return 'recovery'
  return null
}

function findCaliforniaHint(text: string) {
  const match = text.match(
    /\b(Los Angeles|San Diego|San Francisco|San Jose|Sacramento|Oakland|Fresno|Long Beach|Orange County|Riverside|San Bernardino|Santa Ana|Irvine|California|CA)\b/i,
  )
  return match ? match[0] : null
}

function isCandidatePage(url: string, text: string) {
  const money = collectMoney(text)
  if (money.length === 0) return false

  const path = new URL(url).pathname
  const urlLooksLikeResult = CASE_RESULT_URL_RE.test(url)
  if (/^\/?$/.test(path) && !urlLooksLikeResult) return false
  if (/\bpractice-areas?\b/i.test(path) && !urlLooksLikeResult) return false
  if (/\/personal-injury(?:\/[^/]+)?$/i.test(path) && !urlLooksLikeResult) return false

  const resultSignals = text.match(new RegExp(CASE_RESULT_TEXT_RE.source, 'gi')) || []
  return urlLooksLikeResult || resultSignals.length >= 2
}

function buildCandidate(url: string, html: string, sourceName: string): Candidate | null {
  const text = stripHtml(html)
  if (!isCandidatePage(url, text)) return null

  const money = collectMoney(text)
  const liability = collectLiability(text)
  const title = extractTitle(html)
  const outcomeKind = inferOutcomeKind(text)
  const caseTypeHint = pickRule(CASE_TYPE_RULES, `${url} ${title || ''} ${text}`)
  const practiceAreaHint = pickRule(PRACTICE_AREA_RULES, `${url} ${title || ''} ${text}`)

  return {
    url,
    sourceDomain: new URL(url).hostname,
    sourceName,
    state: 'CA',
    pageTitle: title,
    caseTypeHint,
    outcomeKind,
    settlementAmountText: /\bsettlement|settled|recovered|recovery|obtained|secured\b/i.test(text) ? money[0] || null : null,
    verdictAmountText: /\bverdict|jury award|judgment\b/i.test(text) ? money[0] || null : null,
    liabilityPercentText: liability[0] || null,
    incidentLocationHint: findCaliforniaHint(text),
    practiceAreaHint,
    publishedDateHint: firstMatchText(DATE_RE, text),
    extractedSummary: text.slice(0, 1200),
    rawTextExcerpt: text.slice(0, 6000),
    evidenceJson: {
      money_mentions: money.slice(0, 12),
      liability_mentions: liability.slice(0, 8),
      sha256: createHash('sha256').update(text).digest('hex'),
      text_char_count: text.length,
    },
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) throw new Error(`Skipped non-html content-type ${contentType}`)
  return response.text()
}

async function loadRobotsDisallows(siteRoot: string) {
  try {
    const robots = await fetch(`${siteRoot}/robots.txt`, {
      headers: { 'user-agent': USER_AGENT },
    })
    if (!robots.ok) return []
    const text = await robots.text()
    const disallows: string[] = []
    let applies = false
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*/, '').trim()
      const userAgent = line.match(/^user-agent:\s*(.+)$/i)
      if (userAgent) {
        const value = userAgent[1].trim()
        applies = value === '*' || /CaseIQ/i.test(value)
        continue
      }
      const disallow = line.match(/^disallow:\s*(.*)$/i)
      if (applies && disallow) {
        const path = disallow[1].trim()
        if (path && path !== '/') disallows.push(path)
      }
    }
    return disallows
  } catch {
    return []
  }
}

function isAllowedByRobots(url: string, disallows: string[]) {
  const path = new URL(url).pathname
  return !disallows.some((disallow) => path.startsWith(disallow))
}

async function ensureTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('create schema if not exists cap')
  await prisma.$executeRawUnsafe(`
    create table if not exists cap.pi_website_case_candidates (
      url text primary key,
      source_domain text not null,
      source_name text not null,
      state text not null,
      page_title text,
      case_type_hint text,
      outcome_kind text,
      settlement_amount_text text,
      verdict_amount_text text,
      liability_percent_text text,
      incident_location_hint text,
      practice_area_hint text,
      published_date_hint text,
      extracted_summary text,
      raw_text_excerpt text not null,
      evidence_json jsonb not null default '{}'::jsonb,
      label_status text not null default 'candidate',
      discovered_at timestamptz not null default now(),
      fetched_at timestamptz not null default now()
    )
  `)
  await prisma.$executeRawUnsafe(
    'create index if not exists pi_website_case_candidates_source_domain_idx on cap.pi_website_case_candidates (source_domain)',
  )
  await prisma.$executeRawUnsafe(
    'create index if not exists pi_website_case_candidates_label_status_idx on cap.pi_website_case_candidates (label_status)',
  )
}

async function upsertCandidate(prisma: PrismaClient, candidate: Candidate) {
  await prisma.$executeRawUnsafe(
    `
    insert into cap.pi_website_case_candidates (
      url, source_domain, source_name, state, page_title, case_type_hint, outcome_kind,
      settlement_amount_text, verdict_amount_text, liability_percent_text,
      incident_location_hint, practice_area_hint, published_date_hint,
      extracted_summary, raw_text_excerpt, evidence_json, label_status, fetched_at
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,'candidate',now())
    on conflict (url) do update set
      source_domain=excluded.source_domain,
      source_name=excluded.source_name,
      state=excluded.state,
      page_title=excluded.page_title,
      case_type_hint=excluded.case_type_hint,
      outcome_kind=excluded.outcome_kind,
      settlement_amount_text=excluded.settlement_amount_text,
      verdict_amount_text=excluded.verdict_amount_text,
      liability_percent_text=excluded.liability_percent_text,
      incident_location_hint=excluded.incident_location_hint,
      practice_area_hint=excluded.practice_area_hint,
      published_date_hint=excluded.published_date_hint,
      extracted_summary=excluded.extracted_summary,
      raw_text_excerpt=excluded.raw_text_excerpt,
      evidence_json=excluded.evidence_json,
      fetched_at=now()
  `,
    candidate.url,
    candidate.sourceDomain,
    candidate.sourceName,
    candidate.state,
    candidate.pageTitle,
    candidate.caseTypeHint,
    candidate.outcomeKind,
    candidate.settlementAmountText,
    candidate.verdictAmountText,
    candidate.liabilityPercentText,
    candidate.incidentLocationHint,
    candidate.practiceAreaHint,
    candidate.publishedDateHint,
    candidate.extractedSummary,
    candidate.rawTextExcerpt,
    JSON.stringify(candidate.evidenceJson),
  )
}

async function loadLawFirmSeedUrls(prisma: PrismaClient, options: { state: string; limit: number; offset: number }) {
  const rows = await prisma.$queryRawUnsafe<Array<{ website: string | null }>>(
    `
    select website
    from public.law_firms
    where state = $1
      and status = 'discovered'
      and website is not null
    order by source_rank nulls last, last_seen_at desc nulls last, website_domain asc
    limit $2 offset $3
  `,
    options.state,
    options.limit,
    options.offset,
  )

  return rows
    .map((row) => row.website)
    .filter((website): website is string => Boolean(website))
    .map((website) => normalizeUrl(website))
    .filter((website): website is string => Boolean(website))
}

async function crawlSeed(
  prisma: PrismaClient,
  seedUrl: string,
  options: { maxPagesPerSite: number; maxDepth: number; delayMs: number; dryRun: boolean },
) {
  const normalizedSeed = normalizeUrl(seedUrl)
  if (!normalizedSeed) return { seedUrl, visited: 0, candidates: 0, errors: [`Invalid URL: ${seedUrl}`] }

  const sourceRoot = rootUrl(normalizedSeed)
  const sourceHost = new URL(normalizedSeed).host
  const sourceName = new URL(normalizedSeed).hostname.replace(/^www\./, '')
  const robotsDisallows = await loadRobotsDisallows(sourceRoot)
  const queue: CrawlPage[] = [{ url: normalizedSeed, depth: 0 }]
  const seen = new Set<string>()
  const errors: string[] = []
  let candidates = 0

  while (queue.length > 0 && seen.size < options.maxPagesPerSite) {
    const page = queue.shift()
    if (!page || seen.has(page.url)) continue
    seen.add(page.url)

    if (!isAllowedByRobots(page.url, robotsDisallows)) continue

    try {
      const html = await fetchText(page.url)
      const candidate = buildCandidate(page.url, html, sourceName)
      if (candidate) {
        candidates += 1
        if (options.dryRun) {
          console.log(JSON.stringify({ dryRun: true, candidate: { url: candidate.url, title: candidate.pageTitle, amount: candidate.settlementAmountText || candidate.verdictAmountText, caseTypeHint: candidate.caseTypeHint } }))
        } else {
          await upsertCandidate(prisma, candidate)
        }
      }

      if (page.depth < options.maxDepth) {
        for (const link of extractLinks(html, page.url, sourceHost)) {
          if (seen.has(link)) continue
          if (CASE_RESULT_URL_RE.test(link) || page.depth === 0) {
            queue.push({ url: link, depth: page.depth + 1 })
          }
        }
      }
    } catch (error) {
      errors.push(`${page.url}: ${error instanceof Error ? error.message : String(error)}`)
    }

    await sleep(options.delayMs)
  }

  return { seedUrl: normalizedSeed, visited: seen.size, candidates, errors: errors.slice(0, 20) }
}

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL or DATABASE_URL is required')

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  const dryRun = !process.argv.includes('--write')
  const fromLawFirms = process.argv.includes('--from-law-firms')
  const state = getArg('state') || 'CA'
  const seedOffset = getNonNegativeIntArg('seed-offset', 0)
  const maxSites = getIntArg('max-sites', fromLawFirms ? 100 : DEFAULT_SEED_URLS.length)
  const seedUrls = fromLawFirms
    ? [...(await loadLawFirmSeedUrls(prisma, { state, limit: maxSites, offset: seedOffset })), ...getListArg('seed-url')]
    : [...DEFAULT_SEED_URLS, ...getListArg('seed-url')]
  const maxPagesPerSite = getIntArg('max-pages-per-site', 40)
  const maxDepth = getIntArg('max-depth', 2)
  const delayMs = getIntArg('delay-ms', 1500)

  try {
    if (!dryRun) await ensureTable(prisma)

    const results = []
    for (const seedUrl of seedUrls.slice(0, maxSites)) {
      const result = await crawlSeed(prisma, seedUrl, { maxPagesPerSite, maxDepth, delayMs, dryRun })
      results.push(result)
      console.log(JSON.stringify({ progress: result }))
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          state,
          from_law_firms: fromLawFirms,
          seed_offset: seedOffset,
          seeds: results.length,
          visited: results.reduce((sum, result) => sum + result.visited, 0),
          candidates: results.reduce((sum, result) => sum + result.candidates, 0),
          errors: results.flatMap((result) => result.errors).slice(0, 50),
        },
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
