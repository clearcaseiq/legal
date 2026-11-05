/**
 * Second-pass review of staged attorneys the website scan left unconfirmed.
 *
 * `enrich-staged-pi-websites.ts --mark-reviewed` only confirms an attorney when
 * the firm site reads as personal injury *and* carries plaintiff fee or intake
 * language. That misses two kinds of real plaintiff firms: sites that describe
 * their injury practice without saying "free consultation" or "contingency",
 * and sites that only render in a browser, which the scan never read at all.
 *
 * This pass works per firm domain and accepts a firm when the evidence agrees:
 *   - Google Places surfaced the firm for a personal-injury search (independent
 *     of the site), unless --no-places-gate;
 *   - its pages name injury work (two or more strong PI terms), or carry
 *     plaintiff fee language outright;
 *   - nothing on them reads as defense or business-side;
 *   - it is not a large firm (more than --max-firm-size staged attorneys).
 * With --headless, a site whose plain fetch fails or returns a near-empty
 * script shell is rendered in Chromium before it is judged.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/review-unconfirmed-pi.ts --county Fresno --headless --out review.csv
 *   node ../node_modules/tsx/dist/cli.mjs scripts/review-unconfirmed-pi.ts --headless --apply --out review.csv
 *
 * Flags:
 *   --county <name>        Limit to a county. Repeatable.
 *   --headless             Render unreachable or script-only sites in Chromium.
 *   --no-places-gate       Also review firms Google Places never surfaced.
 *   --max-firm-size <n>    Skip firms with more staged attorneys than this (default 75).
 *   --concurrency <n>      Firms reviewed in parallel (default 10).
 *   --limit <n>            Review at most n firms.
 *   --apply                Mark accepted attorneys reviewed. Without it, report only.
 *   --apply-report <csv>   Mark reviewed the firms a previous run's report accepted, without re-reading sites.
 *   --out <csv>            One row per firm with its evidence and decision.
 */

import '../src/env'
import { readFileSync, writeFileSync } from 'fs'
import type { Browser } from 'playwright'
import { prisma } from '../src/lib/prisma'
import { detectPiFromText, stripHtml, type PiSiteSignals } from '../src/lib/pi-site-signals'

const SOURCE = 'cpra-ca-bar-2026'
const SUBPATHS = ['/practice-areas', '/personal-injury', '/areas-of-practice', '/about', '/about-us']
const MAX_SUBPAGES = 3
/** Below this much visible text a page is a script shell, not content. */
const MIN_TEXT = 800
/**
 * Largest firm accepted on Places + injury terms without plaintiff fee language.
 * Past this size, defense and business firms that list injury work start to
 * outnumber plaintiff shops that never mention fees.
 */
const MAX_FIRM_WITHOUT_FEE_LANGUAGE = 5
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

type Args = {
  counties: string[]
  headless: boolean
  placesGate: boolean
  maxFirmSize: number
  concurrency: number
  limit: number | null
  apply: boolean
  applyReport: string | null
  out: string | null
}

type Decision =
  | 'accept_plaintiff_language'
  | 'accept_places_and_site'
  | 'no_fee_language'
  | 'defense'
  | 'business_side'
  | 'big_firm'
  | 'not_pi'
  | 'unreachable'

type FirmResult = {
  domain: string
  firmName: string
  attorneyIds: string[]
  stagedAtFirm: number
  placesLocations: number
  rendered: boolean
  decision: Decision
  signals: PiSiteSignals | null
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    counties: [], headless: false, placesGate: true, maxFirmSize: 75,
    concurrency: 10, limit: null, apply: false, applyReport: null, out: null,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    const positive = (raw: string | undefined) => {
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} expects a positive number`)
      return Math.floor(n)
    }
    switch (flag) {
      case '--county': args.counties.push((next() ?? '').trim()); break
      case '--headless': args.headless = true; break
      case '--no-places-gate': args.placesGate = false; break
      case '--max-firm-size': args.maxFirmSize = positive(next()); break
      case '--concurrency': args.concurrency = positive(next()); break
      case '--limit': args.limit = positive(next()); break
      case '--apply': args.apply = true; break
      case '--apply-report': args.applyReport = next() ?? null; break
      case '--out': args.out = next() ?? null; break
      default: throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

/** Firm name with punctuation and legal-form suffixes removed, so "Smith & Co, LLP" and "Smith & Co" count together. */
function firmKey(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(a )?(professional )?(law )?corporation\b|\b(llp|llc|apc|plc|pc|inc|ltd|aplc|pllc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function domainOf(url: string | null | undefined): string {
  try { return new URL(url ?? '').hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null
    return (await res.text()).slice(0, 200000)
  } catch {
    return null
  }
}

async function renderHtml(browser: Browser, url: string): Promise<string | null> {
  const page = await browser.newPage({ userAgent: USER_AGENT })
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    if (!res || res.status() >= 400) return null
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    return (await page.content()).slice(0, 200000)
  } catch {
    return null
  } finally {
    await page.close().catch(() => {})
  }
}

/** Homepage plus a few practice/about pages, as visible text. */
async function readSite(
  website: string,
  browser: Browser | null,
): Promise<{ text: string | null; rendered: boolean }> {
  let origin: string
  try { origin = new URL(website).origin } catch { return { text: null, rendered: false } }

  const collect = async (load: (url: string) => Promise<string | null>) => {
    const home = await load(website)
    if (!home) return null
    const parts = [stripHtml(home)]
    for (const path of SUBPATHS) {
      if (parts.length > MAX_SUBPAGES) break
      const html = await load(origin + path)
      if (html) parts.push(stripHtml(html))
    }
    return parts.join(' ')
  }

  const plain = await collect(fetchHtml)
  if (plain && plain.length >= MIN_TEXT) return { text: plain, rendered: false }
  if (!browser) return { text: plain, rendered: false }
  const rendered = await collect((url) => renderHtml(browser, url))
  if (rendered && rendered.length > (plain?.length ?? 0)) return { text: rendered, rendered: true }
  return { text: plain, rendered: false }
}

function decide(
  signals: PiSiteSignals | null,
  hasPlaces: boolean,
  placesGate: boolean,
  stagedAtFirm: number,
): Decision {
  if (!signals) return 'unreachable'
  if (signals.isDefense) return 'defense'
  // "Contingency" alone also turns up on business sites ("contingency planning"),
  // so here it needs company: some other fee or intake phrase.
  const plaintiff = signals.plaintiffKeywords.some((kw) => kw !== 'contingency')
  if (signals.isPi && plaintiff) return 'accept_plaintiff_language'
  if (signals.isBusinessSide) return 'business_side'
  if (signals.strongKeywords.length >= 2 && (hasPlaces || !placesGate)) {
    return stagedAtFirm <= MAX_FIRM_WITHOUT_FEE_LANGUAGE ? 'accept_places_and_site' : 'no_fee_language'
  }
  return 'not_pi'
}

async function inParallel<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await work(items[next++])
  }))
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

/**
 * Mark attorneys reviewed and add the firm's injury terms to their practice
 * areas, as the website scan does. Without them a row whose bar record says only
 * "Litigation" maps to no incident type, and promotion skips it.
 */
async function markReviewed(ids: string[], keywords: string[]) {
  const rows = await prisma.productionAttorney.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, practiceAreas: true },
  })
  for (const row of rows) {
    let existing: string[] = []
    try { existing = JSON.parse(row.practiceAreas ?? '[]') } catch { /* rewritten below */ }
    await prisma.productionAttorney.update({
      where: { id: row.id },
      data: {
        practiceAreas: JSON.stringify([...new Set([...existing, ...keywords.slice(0, 5)])]),
        ...(row.status === 'scraped' ? { status: 'reviewed' } : {}),
      },
    })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const countyFilter = args.counties.length
    ? { OR: args.counties.map((c) => ({ county: { startsWith: c, mode: 'insensitive' as const } })) }
    : { county: { not: null } }

  // Re-applying a report also reaches rows it already marked, so their practice areas can be filled in.
  const statuses = args.applyReport ? ['scraped', 'reviewed'] : ['scraped']
  const candidates = await prisma.productionAttorney.findMany({
    where: { source: SOURCE, status: { in: statuses }, piRelevant: true, website: { not: null }, ...countyFilter },
    select: { id: true, firmName: true, website: true },
  })

  const placesByDomain = new Map<string, number>()
  for (const loc of await prisma.discoveredFirmLocation.findMany({
    where: { websiteDomain: { not: null } },
    select: { websiteDomain: true },
  })) {
    const domain = loc.websiteDomain!.toLowerCase().replace(/^www\./, '')
    placesByDomain.set(domain, (placesByDomain.get(domain) ?? 0) + 1)
  }

  const firms = new Map<string, { website: string; firmName: string; attorneyIds: string[] }>()
  for (const row of candidates) {
    const domain = domainOf(row.website)
    if (!domain) continue
    if (args.placesGate && !placesByDomain.has(domain)) continue
    const firm = firms.get(domain) ?? { website: row.website!, firmName: row.firmName ?? '', attorneyIds: [] }
    firm.attorneyIds.push(row.id)
    firms.set(domain, firm)
  }

  const stagedByDomain = new Map<string, number>()
  for (const row of await prisma.productionAttorney.findMany({
    where: { source: SOURCE, website: { not: null } },
    select: { website: true },
  })) {
    const domain = domainOf(row.website)
    if (firms.has(domain)) stagedByDomain.set(domain, (stagedByDomain.get(domain) ?? 0) + 1)
  }
  // Most attorneys at a large firm have no website on file, so the domain count
  // alone makes a 300-lawyer firm look like a two-person shop.
  const wantedKeys = new Set([...firms.values()].map((f) => firmKey(f.firmName)).filter(Boolean))
  const stagedByFirmKey = new Map<string, number>()
  for (const group of await prisma.productionAttorney.groupBy({
    by: ['firmName'],
    where: { source: SOURCE, firmName: { not: null } },
    _count: true,
  })) {
    const key = firmKey(group.firmName)
    if (wantedKeys.has(key)) stagedByFirmKey.set(key, (stagedByFirmKey.get(key) ?? 0) + group._count)
  }

  if (args.applyReport) {
    const [header, ...lines] = readFileSync(args.applyReport, 'utf8').split('\n').filter(Boolean)
    const cols = header.split(',')
    const at = (name: string) => cols.indexOf(name)
    const cells = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'))
    // Re-applies the firm-size rule, so a report written before it changed is read the same way.
    const accepted = (c: string[]) => c[at('decision')] === 'accept_plaintiff_language'
      || (c[at('decision')] === 'accept_places_and_site' && Number(c[at('staged_at_firm')]) <= MAX_FIRM_WITHOUT_FEE_LANGUAGE)
    const keywordsByDomain = new Map(lines.map(cells).filter(accepted)
      .map((c) => [c[at('domain')], c[at('strong_pi')].split('; ').filter(Boolean)] as const))
    let marked = 0
    for (const [domain, firm] of firms) {
      const keywords = keywordsByDomain.get(domain)
      if (!keywords) continue
      await markReviewed(firm.attorneyIds, keywords)
      marked += firm.attorneyIds.length
    }
    console.log(`  Marked reviewed: ${marked} attorneys at ${keywordsByDomain.size} accepted firms from ${args.applyReport}`)
    await prisma.$disconnect()
    return
  }

  let queue = [...firms.entries()]
  if (args.limit) queue = queue.slice(0, args.limit)
  console.log(`  Unconfirmed attorneys: ${candidates.length}`)
  console.log(`  Firms to review:       ${queue.length}${args.placesGate ? ' (surfaced by Google Places)' : ''}`)

  let browser: Browser | null = null
  if (args.headless) {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
  }

  const results: FirmResult[] = []
  let done = 0
  await inParallel(queue, args.concurrency, async ([domain, firm]) => {
    const stagedAtFirm = Math.max(
      stagedByDomain.get(domain) ?? firm.attorneyIds.length,
      stagedByFirmKey.get(firmKey(firm.firmName)) ?? 0,
    )
    const base = {
      domain, firmName: firm.firmName, attorneyIds: firm.attorneyIds, stagedAtFirm,
      placesLocations: placesByDomain.get(domain) ?? 0,
    }
    if (stagedAtFirm > args.maxFirmSize) {
      results.push({ ...base, rendered: false, decision: 'big_firm', signals: null })
    } else {
      const { text, rendered } = await readSite(firm.website, browser)
      const signals = text ? detectPiFromText(text) : null
      const decision = decide(signals, base.placesLocations > 0, args.placesGate, stagedAtFirm)
      results.push({ ...base, rendered, decision, signals })
    }
    done += 1
    if (done % 100 === 0) console.log(`    ${done}/${queue.length} firms`)
  })
  await browser?.close()

  const accepted = results.filter((r) => r.decision.startsWith('accept_'))
  const acceptedIds = accepted.flatMap((r) => r.attorneyIds)
  if (args.apply) {
    for (const firm of accepted) await markReviewed(firm.attorneyIds, firm.signals?.strongKeywords ?? [])
  }

  if (args.out) {
    const header = ['domain', 'firm', 'decision', 'attorneys', 'staged_at_firm', 'places_locations', 'rendered', 'strong_pi', 'plaintiff', 'defense', 'business_side']
    const lines = results.map((r) => [
      r.domain, r.firmName, r.decision, r.attorneyIds.length, r.stagedAtFirm, r.placesLocations, r.rendered,
      r.signals?.strongKeywords.join('; '), r.signals?.plaintiffKeywords.join('; '), r.signals?.defenseKeywords.join('; '),
      r.signals?.businessKeywords.join('; '),
    ].map(csvCell).join(','))
    writeFileSync(args.out, [header.join(','), ...lines].join('\n'))
  }

  const count = (d: Decision) => results.filter((r) => r.decision === d)
  const attorneys = (list: FirmResult[]) => list.reduce((n, r) => n + r.attorneyIds.length, 0)
  console.log('\n════════════════════════════════════════════════════════')
  for (const d of ['accept_plaintiff_language', 'accept_places_and_site', 'no_fee_language', 'defense', 'business_side', 'big_firm', 'not_pi', 'unreachable'] as Decision[]) {
    const list = count(d)
    console.log(`  ${d.padEnd(28)} ${String(list.length).padStart(5)} firms ${String(attorneys(list)).padStart(6)} attorneys`)
  }
  console.log(`  Rendered in Chromium         ${String(results.filter((r) => r.rendered).length).padStart(5)} firms`)
  console.log(`\n  ${args.apply ? 'Marked reviewed' : 'Would mark reviewed'}: ${acceptedIds.length} attorneys at ${accepted.length} firms`)
  if (args.out) console.log(`  Report: ${args.out}`)
  console.log('════════════════════════════════════════════════════════')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
