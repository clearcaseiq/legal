/**
 * Find bar-roll attorneys by reading the attorney pages of Places-discovered firms.
 *
 * `link-discovered-firms.ts` joins a Google Places firm to bar-roll attorneys by
 * firm name or website domain. Many firms fail both joins: the bar roll carries
 * an old firm name, or a personal email instead of the firm's domain. Their
 * attorneys are still on the bar roll, just not connected to the site.
 *
 * This script reads each unlinked firm's homepage plus its attorney/team pages,
 * and looks up every person-shaped name on them against active, undisciplined
 * attorneys in the same county. A match gives that attorney the firm's website
 * and the PI flag (the firm surfaced under a PI search), after which the usual
 * enrich -> verify -> promote pipeline decides whether they are plaintiff-side.
 *
 * Only pages that list a firm's own people are read. Blogs, news and case
 * results name opposing counsel, judges and co-counsel, so they are skipped.
 * A name shared by several attorneys in the county counts only when the
 * attorney's firm name or email domain also points at this firm.
 *
 * Read-only unless --apply. Every match is written to a CSV for review.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/match-firm-site-attorneys.ts --county "Los Angeles" --out ../la-site-matches.csv
 *   node ../node_modules/tsx/dist/cli.mjs scripts/match-firm-site-attorneys.ts --county "Los Angeles" --apply
 *
 * Flags:
 *   --county <name>    Places county to work through (required). Repeatable.
 *   --apply            Write website + piRelevant to matched staging rows.
 *   --limit <n>        Only read the first n firm sites (testing).
 *   --concurrency <n>  Parallel site fetches (default 15).
 *   --timeout <ms>     Per-request timeout (default 10000).
 *   --max-pages <n>    Attorney/team pages fetched per firm (default 6).
 *   --out <path>       CSV report path (default ./firm-site-matches.csv).
 */

import fs from 'node:fs'
import path from 'node:path'
import '../src/env'
import { prisma } from '../src/lib/prisma'

const SOURCE = 'cpra-ca-bar-2026'

type Args = {
  counties: string[]
  apply: boolean
  limit: number | null
  concurrency: number
  timeoutMs: number
  maxPages: number
  out: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    counties: [], apply: false, limit: null, concurrency: 15, timeoutMs: 10_000, maxPages: 6,
    out: path.resolve('firm-site-matches.csv'),
  }
  const positiveInt = (raw: string | undefined, flag: string) => {
    const v = Number(raw)
    if (!Number.isFinite(v) || v <= 0) throw new Error(`${flag} expects a positive number`)
    return Math.floor(v)
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--county': { const v = (next() ?? '').trim(); if (!v) throw new Error('--county expects a name'); args.counties.push(v); break }
      case '--apply': args.apply = true; break
      case '--limit': args.limit = positiveInt(next(), flag); break
      case '--concurrency': args.concurrency = positiveInt(next(), flag); break
      case '--timeout': args.timeoutMs = positiveInt(next(), flag); break
      case '--max-pages': args.maxPages = positiveInt(next(), flag); break
      case '--out': args.out = path.resolve(next() ?? args.out); break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  if (args.counties.length === 0) throw new Error('--county is required')
  return args
}

/* ── Names ───────────────────────────────────────────────────────── */

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'esq'])

/**
 * "First Last" key for a full name: lowercase letters only, middle names and
 * initials dropped. Bar names arrive as "Taylor M. Giordullo"; sites write the
 * same person as "Taylor Giordullo" or "Taylor M. Giordullo, Esq.".
 */
export function nameKey(full: string): string | null {
  const words = full
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w && !SUFFIXES.has(w))
  if (words.length < 2) return null
  const first = words[0]
  const last = words[words.length - 1]
  if (first.length < 2 || last.length < 2) return null
  return `${first} ${last}`
}

/**
 * Person-shaped runs of 2-4 capitalised words ("Jane Q. Doe", "Mary-Ann O'Neil")
 * from page text, reduced to their name keys.
 */
export function candidateNameKeys(text: string): Set<string> {
  const keys = new Set<string>()
  const word = "[A-Z][a-zA-Z'\\u00C0-\\u017F-]+"
  const initial = '[A-Z]\\.?'
  const re = new RegExp(`\\b(${word})(?:\\s+(?:${initial}|${word})){0,2}\\s+(${word})\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const key = nameKey(m[0])
    if (key) keys.add(key)
    // Also try the run without its last word, so "Jane Doe Partner" yields "jane doe".
    const parts = m[0].split(/\s+/)
    if (parts.length >= 3) {
      const shorter = nameKey(parts.slice(0, -1).join(' '))
      if (shorter) keys.add(shorter)
    }
    re.lastIndex = m.index + m[1].length
  }
  return keys
}

/* ── Fetching ────────────────────────────────────────────────────── */

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchHtml(url: string, timeoutMs: number): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: BROWSER_HEADERS, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null
    return { html: (await res.text()).slice(0, 600_000), finalUrl: res.url || url }
  } catch {
    return null
  }
}

function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/a|\/span|\/td)[^>]*>/gi, ' \n ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#039;|&rsquo;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
}

/** Paths that list a firm's own people. */
const PEOPLE_LINK = /(attorney|lawyer|our-team|team|people|staff|professionals|partners|about|our-firm|who-we-are|bio)/i
/** Paths that name other people: opposing counsel, judges, co-counsel, authors. */
const SKIP_LINK = /(blog|news|article|post|press|media|result|verdict|settlement|case-stud|testimonial|review|faq|resource|event|career|job|\/category\/|\/tag\/|\/page\/\d)/i
const DEFAULT_PEOPLE_PATHS = ['/attorneys', '/our-attorneys', '/our-team', '/team', '/lawyers', '/about', '/about-us']

function peopleLinks(html: string, origin: string): string[] {
  const out = new Set<string>()
  const re = /href=["']([^"'#]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let url: URL
    try { url = new URL(m[1], origin) } catch { continue }
    if (url.origin !== origin) continue
    const p = url.pathname.toLowerCase()
    if (p === '/' || !PEOPLE_LINK.test(p) || SKIP_LINK.test(p)) continue
    out.add(url.origin + url.pathname.replace(/\/+$/, ''))
  }
  return [...out]
}

/* ── Main ────────────────────────────────────────────────────────── */

type BarRow = {
  id: string
  name: string
  firmName: string | null
  email: string | null
  website: string | null
  county: string | null
}

type Firm = { domain: string; website: string; name: string; county: string }

type Match = { firm: Firm; row: BarRow; how: 'unique-name' | 'firm-confirmed'; page: string }

function domainOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase()
  } catch { return '' }
}

const FIRM_STOPWORDS = new Set(['law', 'laws', 'firm', 'group', 'office', 'offices', 'the', 'and', 'of', 'llp', 'llc', 'apc', 'pc', 'inc', 'attorneys', 'attorney', 'lawyers', 'lawyer', 'injury', 'personal', 'accident', 'legal', 'associates', 'partners', 'professional', 'corporation', 'a'])
const firmWords = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !FIRM_STOPWORDS.has(w))

/** Whether a bar row's own firm name or email domain points at this firm. */
function rowPointsAtFirm(row: BarRow, firm: Firm): boolean {
  const emailDomain = (row.email ?? '').split('@')[1]?.toLowerCase() ?? ''
  if (emailDomain && (emailDomain === firm.domain || emailDomain.endsWith(`.${firm.domain}`))) return true
  const domainLetters = firm.domain.replace(/[^a-z]/g, '')
  const words = firmWords(row.firmName)
  if (words.some((w) => w.length >= 4 && domainLetters.includes(w))) return true
  const placeWords = new Set(firmWords(firm.name))
  return words.filter((w) => placeWords.has(w)).length >= 1 && words.length > 0
}

const PERSONAL_EMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|me|mac|live|msn|comcast|att|sbcglobal|verizon|cox|earthlink|protonmail|ymail)\./i

/**
 * A name match with no firm evidence is only trusted for someone the bar roll
 * does not place elsewhere. Firm pages name opposing counsel, prosecutors and
 * referral partners, and those people carry their own employer on the roll.
 */
function hasNoOtherEmployer(row: BarRow, firm: Firm): boolean {
  if ((row.firmName ?? '').trim()) return false
  const email = (row.email ?? '').toLowerCase()
  if (!email || PERSONAL_EMAIL.test(email)) return true
  const domain = email.split('@')[1] ?? ''
  return domain === firm.domain || domain.endsWith(`.${firm.domain}`)
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let index = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) await fn(items[index++])
  }))
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('\nMatch firm-site attorneys to the bar roll')
  console.log(`  Counties: ${args.counties.join(', ')}`)
  console.log(`  Mode: ${args.apply ? 'APPLY (writes to production_attorneys)' : 'report only'}\n`)

  const linkedDomains = new Set(
    (await prisma.productionAttorney.findMany({
      where: { source: SOURCE, website: { not: null } },
      select: { website: true },
    })).map((r) => domainOf(r.website)).filter(Boolean),
  )

  const firms: Firm[] = []
  const seen = new Set<string>()
  for (const county of args.counties) {
    const places = await prisma.discoveredFirmLocation.findMany({
      where: { cachedCounty: { startsWith: county, mode: 'insensitive' }, websiteDomain: { not: null } },
      select: { websiteDomain: true, cachedWebsiteUri: true, cachedName: true },
    })
    for (const p of places) {
      const domain = (p.websiteDomain ?? '').toLowerCase().replace(/^www\./, '')
      if (!domain || seen.has(domain) || linkedDomains.has(domain)) continue
      seen.add(domain)
      firms.push({ domain, website: p.cachedWebsiteUri || `https://${domain}`, name: p.cachedName ?? '', county })
    }
  }
  const work = args.limit ? firms.slice(0, args.limit) : firms
  console.log(`  Unlinked Places firm sites: ${firms.length.toLocaleString()}${args.limit ? ` (reading ${work.length})` : ''}`)

  // Index active, undisciplined bar attorneys in these counties by "first last".
  const index = new Map<string, BarRow[]>()
  for (const county of args.counties) {
    const rows = await prisma.productionAttorney.findMany({
      where: {
        source: SOURCE,
        status: { not: 'rejected' },
        county: { startsWith: county, mode: 'insensitive' },
        OR: [{ discipline: null }, { discipline: '' }, { discipline: '[]' }],
      },
      select: { id: true, name: true, firmName: true, email: true, website: true, county: true },
    })
    for (const row of rows) {
      const key = nameKey(row.name)
      if (!key) continue
      const list = index.get(key) ?? []
      list.push(row)
      index.set(key, list)
    }
  }
  console.log(`  Bar attorneys indexed: ${[...index.values()].reduce((n, l) => n + l.length, 0).toLocaleString()}\n`)

  const matches: Match[] = []
  const stats = { reachable: 0, unreachable: 0, pagesRead: 0, firmsWithMatches: 0, ambiguousSkipped: 0, otherSiteSkipped: 0 }
  let done = 0
  const started = Date.now()

  await runPool(work, args.concurrency, async (firm) => {
    const home = await fetchHtml(firm.website, args.timeoutMs)
      ?? (firm.website.includes('://www.') ? null : await fetchHtml(`https://www.${firm.domain}`, args.timeoutMs))
    done += 1
    if (done % 100 === 0) console.log(`    ${done}/${work.length} sites (${Math.round((Date.now() - started) / 1000)}s)`)
    if (!home) { stats.unreachable += 1; return }
    stats.reachable += 1

    let origin: string
    try { origin = new URL(home.finalUrl).origin } catch { return }
    const links = [...new Set([...peopleLinks(home.html, origin), ...DEFAULT_PEOPLE_PATHS.map((p) => origin + p)])]
    const pages: { url: string; text: string }[] = [{ url: home.finalUrl, text: pageText(home.html) }]
    for (const link of links) {
      if (pages.length > args.maxPages) break
      const page = await fetchHtml(link, args.timeoutMs)
      if (page && !pages.some((p) => p.url === page.finalUrl)) pages.push({ url: page.finalUrl, text: pageText(page.html) })
    }
    stats.pagesRead += pages.length

    const found = new Map<string, Match>()
    for (const page of pages) {
      for (const key of candidateNameKeys(page.text)) {
        const rows = index.get(key)
        if (!rows) continue
        const confirmed = rows.filter((r) => rowPointsAtFirm(r, firm))
        let row: BarRow | undefined
        let how: Match['how']
        if (confirmed.length === 1) { row = confirmed[0]; how = 'firm-confirmed' }
        else if (rows.length === 1 && hasNoOtherEmployer(rows[0], firm)) { row = rows[0]; how = 'unique-name' }
        else { stats.ambiguousSkipped += 1; continue }
        // Already tied to a different firm's site: that link came from stronger evidence.
        const current = domainOf(row.website)
        if (current && current !== firm.domain) { stats.otherSiteSkipped += 1; continue }
        if (!found.has(row.id)) found.set(row.id, { firm, row, how: how!, page: page.url })
      }
    }
    if (found.size > 0) stats.firmsWithMatches += 1
    matches.push(...found.values())
  })

  const lines = [['firm_domain', 'firm_name', 'county', 'attorney', 'bar_firm_name', 'bar_email', 'how', 'page', 'row_id'].join(',')]
  for (const m of matches) {
    lines.push([m.firm.domain, m.firm.name, m.firm.county, m.row.name, m.row.firmName, m.row.email, m.how, m.page, m.row.id].map(csvCell).join(','))
  }
  fs.writeFileSync(args.out, lines.join('\n'), 'utf8')

  console.log(`\n${'═'.repeat(56)}`)
  console.log(`  Firm sites read                    ${stats.reachable.toLocaleString()}  (unreachable ${stats.unreachable.toLocaleString()})`)
  console.log(`  Pages read                         ${stats.pagesRead.toLocaleString()}`)
  console.log(`  Firms with matched attorneys       ${stats.firmsWithMatches.toLocaleString()}`)
  console.log(`  Attorneys matched                  ${matches.length.toLocaleString()}`)
  console.log(`    confirmed by firm name/email     ${matches.filter((m) => m.how === 'firm-confirmed').length.toLocaleString()}`)
  console.log(`    unique name in county            ${matches.filter((m) => m.how === 'unique-name').length.toLocaleString()}`)
  console.log(`  Skipped: name shared, unconfirmed  ${stats.ambiguousSkipped.toLocaleString()}`)
  console.log(`  Skipped: tied to another firm site ${stats.otherSiteSkipped.toLocaleString()}`)
  console.log(`  Report: ${args.out}`)
  console.log(`${'═'.repeat(56)}\n`)

  if (args.apply) {
    let written = 0
    for (const m of matches) {
      await prisma.productionAttorney.update({
        where: { id: m.row.id },
        data: { website: `https://${m.firm.domain}`, piRelevant: true },
      })
      written += 1
    }
    console.log(`  Wrote ${written.toLocaleString()} attorneys.\n`)
  }

  await prisma.$disconnect()
}

if (process.argv[1] && /match-firm-site-attorneys/.test(process.argv[1])) {
  main()
    .then(() => process.exit(0))
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
}
