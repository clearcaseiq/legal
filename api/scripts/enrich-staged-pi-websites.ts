/**
 * Enrich staged attorneys by scraping firm websites for PI keywords.
 *
 * Many California attorneys don't self-report practice areas to the State Bar,
 * so the CPRA import misses them. This script fetches the homepage of attorneys
 * whose firm name suggests a web presence, checks for PI keywords, and updates
 * the `piRelevant` flag + `practiceAreas` field on the staging row.
 *
 * The script works in two passes:
 *   1. Resolve firm website URLs from firm names (Google search or pattern)
 *   2. Fetch & scan each website for PI keywords
 *
 * Since most staged attorneys don't have a website URL in the bar data, this
 * script constructs candidate URLs from the firm name and verifies them.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/enrich-staged-pi-websites.ts --dry-run --limit 100
 *   node ../node_modules/tsx/dist/cli.mjs scripts/enrich-staged-pi-websites.ts --limit 5000
 *   node ../node_modules/tsx/dist/cli.mjs scripts/enrich-staged-pi-websites.ts
 *
 * The resolver prefers the website already on file (from CPRA / Places /
 * directories) and only guesses the domain from the firm name as a fallback.
 * Once a site is reachable it also crawls a few attorney/team subpages, since
 * bios, headshots and case results almost never live on the homepage.
 *
 * Flags:
 *   --dry-run        Report without writing.
 *   --limit <n>      Process at most n attorneys.
 *   --source <s>     Filter by source (default: cpra-ca-bar-2026).
 *   --concurrency    Max parallel fetches (default: 5).
 *   --skip-known     Skip attorneys already flagged piRelevant (discovery mode, default).
 *   --include-known  Also visit already-PI attorneys (enrich them too).
 *   --pi-only        Enrichment mode: only visit already-PI attorneys.
 *   --with-website   Only visit rows that already have a website (highest yield).
 *
 * Examples:
 *   # Enrich known PI attorneys that already have a website (best first run):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/enrich-staged-pi-websites.ts --pi-only --with-website --dry-run --limit 100
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = {
  dryRun: boolean
  limit: number | null
  source: string
  concurrency: number
  skipKnown: boolean
  piOnly: boolean
  withWebsite: boolean
  timeoutMs: number
  maxSubpages: number
}

// Fetch tuning, set from CLI args in main() and read by the fetch helpers.
const runtimeConfig = { timeoutMs: 8000, maxSubpages: 3 }

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false, limit: null, source: 'cpra-ca-bar-2026', concurrency: 5,
    skipKnown: true, piOnly: false, withWebsite: false,
    timeoutMs: 8000, maxSubpages: 3,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dry-run': args.dryRun = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      case '--source': args.source = next() ?? args.source; break
      case '--concurrency': { const v = Number(next()); args.concurrency = Number.isFinite(v) ? v : 5; break }
      case '--skip-known': args.skipKnown = true; break
      case '--include-known': args.skipKnown = false; break
      // Enrichment mode: only visit attorneys already flagged PI (fill in bio,
      // headshot, languages, results) rather than discovering new PI firms.
      case '--pi-only': args.piOnly = true; args.skipKnown = false; break
      case '--timeout': { const v = Number(next()); args.timeoutMs = Number.isFinite(v) && v > 0 ? Math.floor(v) : 8000; break }
      case '--max-subpages': { const v = Number(next()); args.maxSubpages = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 3; break }
      // Only visit rows that already have a website on file — the highest-yield,
      // zero-guessing subset. Pairs well with --pi-only.
      case '--with-website': args.withWebsite = true; break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

/* ── PI keyword detection ────────────────────────────────────────── */

const PI_KEYWORDS = [
  'personal injury', 'car accident', 'auto accident', 'truck accident',
  'motorcycle accident', 'pedestrian accident', 'bicycle accident',
  'slip and fall', 'premises liability', 'dog bite', 'animal attack',
  'wrongful death', 'medical malpractice', 'birth injury',
  'product liability', 'defective product', 'brain injury',
  'spinal cord injury', 'catastrophic injury', 'nursing home abuse',
  'elder abuse', 'construction accident', 'workplace injury',
  'workers compensation', 'insurance claim', 'uninsured motorist',
  'underinsured', 'bodily injury', 'pain and suffering',
  'no win no fee', 'no recovery no fee', 'free consultation',
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer',
  'tort', 'negligence', 'settlement', 'compensation',
  'rideshare accident', 'uber accident', 'lyft accident',
  'hit and run', 'drunk driving accident', 'dui accident',
  'mass tort', 'class action injury',
]

const DEFENSE_KEYWORDS = [
  'insurance defense', 'defense litigation', 'defend insurers',
  'defense counsel', 'defending', 'defense firm',
]

const STRONG_PI_KEYWORDS = [
  'personal injury', 'car accident', 'auto accident', 'truck accident',
  'motorcycle accident', 'pedestrian accident', 'bicycle accident',
  'slip and fall', 'premises liability', 'dog bite', 'wrongful death',
  'medical malpractice', 'birth injury', 'product liability', 'brain injury',
  'spinal cord injury', 'catastrophic injury', 'nursing home abuse',
  'construction accident', 'workplace injury', 'workers compensation',
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer',
  'bodily injury', 'rideshare accident', 'uber accident', 'mass tort',
]

function detectPiFromText(text: string): { isPi: boolean; isDefense: boolean; matchedKeywords: string[] } {
  const lower = text.toLowerCase()
  const matched = PI_KEYWORDS.filter((kw) => lower.includes(kw))
  const strongMatched = STRONG_PI_KEYWORDS.filter((kw) => lower.includes(kw))
  const defenseMatched = DEFENSE_KEYWORDS.filter((kw) => lower.includes(kw))
  return {
    isPi: strongMatched.length >= 1 && matched.length >= 2,
    isDefense: defenseMatched.length > 0,
    matchedKeywords: matched,
  }
}

/* ── Website URL resolution from firm name ───────────────────────── */

function firmNameToUrl(firmName: string): string | null {
  if (!firmName) return null
  const cleaned = firmName
    .toLowerCase()
    .replace(/\b(law\s+offices?\s+of|the|llp|llc|lp|pc|p\.c\.|l\.l\.p\.|inc|pllc|apc|a\.p\.c\.)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '')
  if (cleaned.length < 3) return null
  return `https://${cleaned}law.com`
}

/**
 * Normalize a website value we already hold (from CPRA / Places / directories)
 * into a fetchable origin. Returns null for social/directory hosts, which are
 * not the firm's own site and shouldn't be scraped as one.
 */
function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url = raw.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '')
  try {
    const u = new URL(url)
    if (/(facebook|linkedin|twitter|x|instagram|youtube|yelp|avvo|justia|findlaw|google)\./i.test(u.hostname)) return null
    return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, ''))
  } catch {
    return null
  }
}

/**
 * Subpages where attorney bios, headshots, languages and case results actually
 * live. The homepage alone rarely carries them, so once a firm site is
 * reachable we pull a few of these too and extract from the combined HTML.
 */
const TEAM_SUBPATHS = [
  '/attorneys', '/our-attorneys', '/attorney-profiles', '/our-team', '/team',
  '/lawyers', '/our-lawyers', '/about', '/about-us', '/results', '/case-results',
  '/verdicts-settlements', '/verdicts-and-settlements',
]

function firmNameVariants(firmName: string): string[] {
  if (!firmName) return []
  const cleaned = firmName
    .toLowerCase()
    .replace(/\b(law\s+offices?\s+of|the|llp|llc|lp|pc|p\.c\.|l\.l\.p\.|inc|pllc|apc|a\.p\.c\.)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  if (cleaned.length < 3) return []

  const slug = cleaned.replace(/\s+/g, '')
  const dashed = cleaned.replace(/\s+/g, '-')

  return [
    `https://${slug}law.com`,
    `https://www.${slug}law.com`,
    `https://${slug}.com`,
    `https://www.${slug}.com`,
    `https://${dashed}.com`,
  ]
}

/* ── Fetch with timeout ──────────────────────────────────────────── */

async function fetchPageText(url: string, timeoutMs = runtimeConfig.timeoutMs): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CaseIQ-PI-Enrichment/0.1)' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null
    const html = await res.text()
    // Strip tags to get plain text for keyword matching
    return html.slice(0, 200000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120000)
}

/**
 * Fetch a firm site starting at `baseUrl`, then a bounded set of attorney/team
 * subpages, and return the concatenated HTML. This is where bios, headshots and
 * results are found — the homepage alone almost never has them.
 *
 * Returns null when the base URL itself is unreachable (so the caller can try
 * the next candidate URL). `maxSubpages` caps how many extra pages we fetch to
 * keep the crawl polite and fast.
 */
async function fetchSiteBundle(
  baseUrl: string,
  attorneyName: string,
  maxSubpages = runtimeConfig.maxSubpages,
): Promise<string | null> {
  const baseHtml = await fetchPageText(baseUrl)
  if (!baseHtml) return null

  let origin: string
  try { origin = new URL(baseUrl).origin } catch { origin = baseUrl.replace(/\/+$/, '') }

  const nameParts = attorneyName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const first = nameParts[0] ?? ''
  const last = nameParts[nameParts.length - 1] ?? ''
  const attorneyPaths = last && first
    ? [`/attorney/${first}-${last}`, `/attorneys/${first}-${last}`, `/team/${first}-${last}`, `/${first}-${last}`]
    : []

  const parts: string[] = [baseHtml]
  let fetched = 0
  for (const path of [...attorneyPaths, ...TEAM_SUBPATHS]) {
    if (fetched >= maxSubpages) break
    const sub = await fetchPageText(origin + path)
    if (sub) { parts.push(sub); fetched += 1 }
  }
  return parts.join('\n').slice(0, 400000)
}

/**
 * Extract professional email addresses from HTML.
 * Looks for mailto: links and email-shaped strings, then filters out
 * personal/free providers and noreply addresses.
 */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'live.com', 'msn.com',
  'ymail.com', 'comcast.net', 'att.net', 'sbcglobal.net', 'verizon.net',
  'me.com', 'mac.com',
])

function extractProfessionalEmails(html: string, firmName: string | null): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const allEmails = new Set<string>()

  // From mailto: links (highest confidence)
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi
  let m: RegExpExecArray | null
  while ((m = mailtoRegex.exec(html)) !== null) allEmails.add(m[1].toLowerCase())

  // From page text
  const text = stripHtml(html)
  while ((m = emailRegex.exec(text)) !== null) allEmails.add(m[0].toLowerCase())

  // Filter: remove free email providers, noreply, and image filenames
  return Array.from(allEmails).filter((email) => {
    const domain = email.split('@')[1]
    if (FREE_EMAIL_DOMAINS.has(domain)) return false
    if (/noreply|no-reply|donotreply|info@|support@|admin@|webmaster@|sales@/i.test(email)) return false
    if (/\.(png|jpg|gif|svg|css|js)$/i.test(email)) return false
    return true
  })
}

/* ── Headshot extraction ─────────────────────────────────────────── */

function extractHeadshot(html: string, url: string): string | null {
  // Look for common attorney headshot patterns in <img> tags
  const imgPatterns = [
    /<img[^>]+(?:class|id)="[^"]*(?:attorney|lawyer|partner|headshot|portrait|profile|team|staff|photo)[^"]*"[^>]*src="([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]*(?:class|id)="[^"]*(?:attorney|lawyer|partner|headshot|portrait|profile|team|staff|photo)[^"]*"/gi,
    /<img[^>]+alt="[^"]*(?:attorney|lawyer|partner|headshot|portrait|photo)[^"]*"[^>]*src="([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]*alt="[^"]*(?:attorney|lawyer|partner|headshot|portrait|photo)[^"]*"/gi,
  ]

  for (const pattern of imgPatterns) {
    const match = pattern.exec(html)
    if (match?.[1]) {
      let src = match[1]
      if (src.startsWith('//')) src = 'https:' + src
      else if (src.startsWith('/')) {
        try { src = new URL(src, url).href } catch { continue }
      }
      if (/\.(jpg|jpeg|png|webp)/i.test(src)) return src
    }
  }
  return null
}

/* ── Bio extraction ──────────────────────────────────────────────── */

function extractBio(text: string, attorneyName: string): string | null {
  const lower = text.toLowerCase()
  const nameParts = attorneyName.toLowerCase().split(/\s+/)
  const lastName = nameParts[nameParts.length - 1]

  // Look for paragraphs near the attorney's name that describe their background
  const bioPatterns = [
    /(?:about|biography|bio|profile|background|meet)\s*[:\-—]?\s*(.{100,800})/i,
    new RegExp(`${lastName}[^.]*(?:has been|has over|is a|practices|represents|handles|specializes|dedicated|experienced|brings)[^.]*\\.(?:[^.]*\\.){0,4}`, 'i'),
    new RegExp(`(?:attorney|lawyer|counsel)\\s+${lastName}[^.]*\\.(?:[^.]*\\.){0,3}`, 'i'),
  ]

  for (const pattern of bioPatterns) {
    const match = pattern.exec(text)
    if (match) {
      const bio = (match[1] ?? match[0]).trim()
      if (bio.length >= 50 && bio.length <= 1000) return bio
    }
  }
  return null
}

/* ── Language extraction ─────────────────────────────────────────── */

const KNOWN_LANGUAGES = [
  'spanish', 'mandarin', 'cantonese', 'chinese', 'korean', 'vietnamese',
  'tagalog', 'filipino', 'armenian', 'farsi', 'persian', 'arabic',
  'hindi', 'urdu', 'punjabi', 'russian', 'japanese', 'french',
  'german', 'portuguese', 'italian', 'polish', 'hebrew', 'thai',
  'cambodian', 'khmer', 'laotian', 'hmong', 'samoan', 'tongan',
  'gujarati', 'bengali', 'tamil', 'telugu', 'turkish', 'indonesian',
  'malay', 'burmese', 'amharic', 'tigrinya', 'somali', 'swahili',
  'haitian creole', 'creole', 'sign language', 'asl',
]

const LANGUAGE_PATTERNS = [
  /(?:languages?\s*(?:spoken|available)?|(?:we\s+)?speaks?|hablamos?|fluent\s+in|bilingual|multilingual)\s*[:\-—]?\s*([^.<\n]{10,200})/gi,
  /(?:se\s+habla\s+español|hablamos\s+español)/gi,
]

function extractLanguages(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()

  // Direct pattern matches
  for (const pattern of LANGUAGE_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(lower)) !== null) {
      const chunk = m[1] ?? m[0]
      for (const lang of KNOWN_LANGUAGES) {
        if (chunk.includes(lang)) found.add(lang)
      }
    }
  }

  // Also scan the full text for "Se Habla Español" style markers
  if (lower.includes('se habla español') || lower.includes('se habla espanol')) found.add('spanish')
  if (lower.includes('hablamos español') || lower.includes('hablamos espanol')) found.add('spanish')

  // Look for language mentions near "speak", "fluent", "bilingual"
  for (const lang of KNOWN_LANGUAGES) {
    if (lower.includes(lang)) {
      const idx = lower.indexOf(lang)
      const nearby = lower.slice(Math.max(0, idx - 80), idx + lang.length + 80)
      if (/speak|fluent|bilingual|language|interpreter|translat/i.test(nearby)) {
        found.add(lang)
      }
    }
  }

  // Normalize
  const normalized: string[] = []
  for (const lang of found) {
    const cap = lang.charAt(0).toUpperCase() + lang.slice(1)
    if (lang === 'asl') normalized.push('ASL')
    else if (lang === 'chinese') { if (!found.has('mandarin') && !found.has('cantonese')) normalized.push('Chinese') }
    else normalized.push(cap)
  }
  return [...new Set(normalized)]
}

/* ── Case results extraction ─────────────────────────────────────── */

function extractCaseResults(text: string): { amount: string; description: string }[] {
  const results: { amount: string; description: string }[] = []

  // Match dollar amounts with context
  const amountPattern = /\$[\d,]+(?:\.\d{1,2})?\s*(?:million|m|billion|b|thousand|k)?\b[^.]*(?:settlement|verdict|recovery|award|judgment|won|recovered|obtained|secured)[^.]*\./gi
  const reversePattern = /(?:settlement|verdict|recovery|award|judgment|won|recovered|obtained|secured)[^.]*\$[\d,]+(?:\.\d{1,2})?\s*(?:million|m|billion|b|thousand|k)?[^.]*/gi

  let m: RegExpExecArray | null
  while ((m = amountPattern.exec(text)) !== null) {
    if (results.length >= 10) break
    const clean = m[0].trim().slice(0, 200)
    if (clean.length > 20) results.push({ amount: extractAmount(clean), description: clean })
  }
  while ((m = reversePattern.exec(text)) !== null) {
    if (results.length >= 10) break
    const clean = m[0].trim().slice(0, 200)
    if (clean.length > 20 && !results.some((r) => r.description === clean)) {
      results.push({ amount: extractAmount(clean), description: clean })
    }
  }

  return results
}

function extractAmount(text: string): string {
  const match = /\$([\d,]+(?:\.\d{1,2})?)\s*(million|m|billion|b|thousand|k)?/i.exec(text)
  if (!match) return ''
  return '$' + match[1] + (match[2] ? ' ' + match[2] : '')
}

/* ── Awards extraction ───────────────────────────────────────────── */

const AWARD_PATTERNS = [
  /super\s+lawyers?/gi,
  /best\s+lawyers?\s+in\s+america/gi,
  /avvo\s+(?:rating|superb|top)/gi,
  /martindale[\s-]+hubbell/gi,
  /rising\s+star/gi,
  /top\s+(?:\d+|ten|hundred|one hundred)\s+(?:attorneys?|lawyers?)/gi,
  /national\s+trial\s+lawyers?/gi,
  /million\s+dollar\s+advocates?\s+forum/gi,
  /multi[\s-]+million\s+dollar\s+advocates/gi,
  /board\s+certified/gi,
  /american\s+association\s+for\s+justice/gi,
  /consumer\s+attorneys?\s+(?:association|of)/gi,
  /trial\s+lawyers?\s+association/gi,
  /lawyer\s+of\s+(?:the\s+)?year/gi,
  /lead\s+counsel\s+rated/gi,
  /peer\s+review\s+rated/gi,
]

function extractAwards(text: string): string[] {
  const awards = new Set<string>()
  for (const pattern of AWARD_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      awards.add(m[0].trim())
    }
  }
  return [...awards]
}

/* ── Free consultation / contingency fee ─────────────────────────── */

function detectFreeConsult(text: string): boolean {
  const lower = text.toLowerCase()
  return /free\s+(?:consultation|case\s+(?:evaluation|review|assessment))/i.test(lower) ||
    /no[\s-]+(?:fee|cost|charge|obligation)\s+(?:consultation|initial)/i.test(lower)
}

function extractContingencyFee(text: string): string | null {
  const match = /(\d{2,3})%?\s*(?:contingency|attorney'?s?\s+fee|no\s+(?:win|recovery),?\s+no\s+fee)/i.exec(text)
  if (match) return match[1] + '%'
  if (/no\s+(?:win|recovery),?\s+no\s+fee/i.test(text)) return 'Contingency'
  return null
}

/* ── Association extraction ──────────────────────────────────────── */

const ASSOCIATION_PATTERNS = [
  /consumer\s+attorneys?\s+association\s+of\s+los\s+angeles/gi,
  /CAALA/g,
  /american\s+association\s+for\s+justice/gi,
  /AAJ/g,
  /american\s+bar\s+association/gi,
  /ABA/g,
  /california\s+lawyers?\s+association/gi,
  /los\s+angeles\s+county\s+bar\s+association/gi,
  /LACBA/g,
  /san\s+francisco\s+(?:trial\s+lawyers?|bar)\s+association/gi,
  /orange\s+county\s+(?:trial\s+lawyers?|bar)\s+association/gi,
  /american\s+board\s+of\s+trial\s+advocates/gi,
  /ABOTA/g,
  /california\s+trial\s+lawyers?\s+association/gi,
  /national\s+trial\s+lawyers/gi,
]

function extractAssociations(text: string): string[] {
  const assocs = new Set<string>()
  for (const pattern of ASSOCIATION_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      assocs.add(m[0].trim())
    }
  }
  return [...assocs]
}

/* ── Social links extraction ─────────────────────────────────────── */

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {}
  const hrefPattern = /href="(https?:\/\/(?:www\.)?(?:linkedin|facebook|twitter|x|instagram|youtube|avvo|justia|findlaw|yelp)[^"]*)"[^>]*/gi
  let m: RegExpExecArray | null
  while ((m = hrefPattern.exec(html)) !== null) {
    const url = m[1]
    if (url.includes('linkedin.com')) links.linkedin = url
    else if (url.includes('facebook.com')) links.facebook = url
    else if (url.includes('twitter.com') || url.includes('x.com')) links.twitter = url
    else if (url.includes('instagram.com')) links.instagram = url
    else if (url.includes('youtube.com')) links.youtube = url
    else if (url.includes('avvo.com')) links.avvo = url
    else if (url.includes('yelp.com')) links.yelp = url
  }
  return links
}

/* ── Batch processing with concurrency ───────────────────────────── */

async function processInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

/* ── Main ────────────────────────────────────────────────────────── */

const PAGE_SIZE = 200

async function main() {
  const args = parseArgs(process.argv.slice(2))
  runtimeConfig.timeoutMs = args.timeoutMs
  runtimeConfig.maxSubpages = args.maxSubpages

  console.log('\nEnriching staged attorneys via website scraping')
  if (args.dryRun) console.log('  DRY RUN — nothing written')
  if (args.limit) console.log(`  Limit: ${args.limit}`)
  console.log(`  Source: ${args.source}`)
  console.log(`  Concurrency: ${args.concurrency}`)
  console.log(`  Timeout: ${args.timeoutMs}ms | Max subpages: ${args.maxSubpages}`)
  console.log()

  const stats = {
    scanned: 0,
    withFirm: 0,
    urlsAttempted: 0,
    urlsReachable: 0,
    newPiDetected: 0,
    defenseDetected: 0,
    emailsFound: 0,
    headshotsFound: 0,
    biosFound: 0,
    languagesFound: 0,
    caseResultsFound: 0,
    awardsFound: 0,
    alreadyPi: 0,
    noFirm: 0,
    noUrl: 0,
    updated: 0,
  }

  let cursor: string | undefined

  outer:
  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: {
        source: args.source,
        ...(args.piOnly ? { piRelevant: true } : args.skipKnown ? { piRelevant: false } : {}),
        ...(args.withWebsite ? { website: { not: null } } : {}),
      },
      select: {
        id: true,
        name: true,
        firmName: true,
        city: true,
        barNumber: true,
        piRelevant: true,
        practiceAreas: true,
        website: true,
      },
    })
    if (batch.length === 0) break

    cursor = batch[batch.length - 1].id

    const toFetch: { attorney: typeof batch[0]; urls: string[] }[] = []

    for (const atty of batch) {
      stats.scanned += 1
      // In discovery mode we skip rows already flagged PI. In enrichment mode
      // (--pi-only / --include-known) we process them to fill in missing fields.
      if (atty.piRelevant && args.skipKnown && !args.piOnly) { stats.alreadyPi += 1; continue }

      // Prefer the website we already hold (from CPRA / Places / directories);
      // only guess the domain from the firm name when we have nothing on file.
      const known = normalizeWebsite(atty.website)
      const guessed = atty.firmName ? firmNameVariants(atty.firmName) : []
      const urls = [...new Set([...(known ? [known] : []), ...guessed])]

      if (atty.firmName) stats.withFirm += 1
      else if (!known) { stats.noFirm += 1 }

      if (urls.length === 0) { stats.noUrl += 1; continue }

      toFetch.push({ attorney: atty, urls })

      if (args.limit && stats.scanned >= args.limit) break
    }

    await processInParallel(toFetch, args.concurrency, async ({ attorney, urls }) => {
      for (const url of urls) {
        stats.urlsAttempted += 1
        const html = await fetchSiteBundle(url, attorney.name)
        if (!html) continue

        stats.urlsReachable += 1
        const text = stripHtml(html)
        const { isPi, isDefense, matchedKeywords } = detectPiFromText(text)
        const professionalEmails = extractProfessionalEmails(html, attorney.firmName)

        // Extract all enrichment data
        const headshot = extractHeadshot(html, url)
        const bio = extractBio(text, attorney.name)
        const languages = extractLanguages(text)
        const caseResults = extractCaseResults(text)
        const awards = extractAwards(text)
        const freeConsult = detectFreeConsult(text)
        const contingencyFee = extractContingencyFee(text)
        const associations = extractAssociations(text)
        const socialLinks = extractSocialLinks(html)

        if (isDefense) {
          stats.defenseDetected += 1
          console.log(`  DEFENSE: ${attorney.name} (${attorney.firmName}) — ${url}`)
        }

        const hasNewEmail = professionalEmails.length > 0
        if (hasNewEmail) stats.emailsFound += 1
        if (headshot) stats.headshotsFound += 1
        if (bio) stats.biosFound += 1
        if (languages.length > 0) stats.languagesFound += 1
        if (caseResults.length > 0) stats.caseResultsFound += 1
        if (awards.length > 0) stats.awardsFound += 1

        const hasAnyData = isPi || hasNewEmail || headshot || bio || languages.length > 0 ||
          caseResults.length > 0 || awards.length > 0 || freeConsult ||
          contingencyFee || associations.length > 0 || Object.keys(socialLinks).length > 0

        if (hasAnyData) {
          if (isPi && !isDefense) {
            stats.newPiDetected += 1
            console.log(`  PI:       ${attorney.name} — ${matchedKeywords.slice(0, 4).join(', ')}`)
          }
          if (hasNewEmail) console.log(`  EMAIL:    ${attorney.name} — ${professionalEmails[0]}`)
          if (languages.length > 0) console.log(`  LANG:     ${attorney.name} — ${languages.join(', ')}`)
          if (caseResults.length > 0) console.log(`  RESULTS:  ${attorney.name} — ${caseResults.length} case result(s)`)
          if (headshot) console.log(`  PHOTO:    ${attorney.name}`)

          if (!args.dryRun) {
            const existingAreas: string[] = attorney.practiceAreas ? JSON.parse(attorney.practiceAreas) : []
            const enrichedAreas = isPi ? [...new Set([...existingAreas, ...matchedKeywords.slice(0, 5)])] : existingAreas

            const updateData: Record<string, unknown> = { website: url }
            if (isPi && !isDefense) {
              updateData.piRelevant = true
              updateData.practiceAreas = JSON.stringify(enrichedAreas)
            }
            // Persist defense classification so the cleanup sweep can drop these
            // from the routable pool without re-fetching the site. A defense firm
            // is never a plaintiff-side PI referral target.
            if (isDefense) {
              updateData.piRelevant = false
              updateData.status = 'rejected'
            }
            if (hasNewEmail) updateData.email = professionalEmails[0]
            if (headshot) updateData.headshotUrl = headshot
            if (bio) updateData.bio = bio
            if (languages.length > 0) updateData.languages = JSON.stringify(languages)
            if (caseResults.length > 0) updateData.caseResults = JSON.stringify(caseResults)
            if (awards.length > 0) updateData.awards = JSON.stringify(awards)
            if (freeConsult) updateData.freeConsult = true
            if (contingencyFee) updateData.contingencyFee = contingencyFee
            if (associations.length > 0) updateData.associations = JSON.stringify(associations)
            if (Object.keys(socialLinks).length > 0) updateData.socialLinks = JSON.stringify(socialLinks)

            await prisma.productionAttorney.update({
              where: { id: attorney.id },
              data: updateData,
            })
            stats.updated += 1
          }
        }

        break // Stop trying URLs once we got a reachable one
      }
    })

    if (args.limit && stats.scanned >= args.limit) break
  }

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`${args.dryRun ? 'DRY RUN' : 'ENRICHMENT'} COMPLETE`)
  console.log(`${'═'.repeat(50)}\n`)

  console.log(`  Scanned                  ${stats.scanned}`)
  console.log(`  Already PI               ${stats.alreadyPi}`)
  console.log(`  With firm name           ${stats.withFirm}`)
  console.log(`  No firm name             ${stats.noFirm}`)
  console.log(`  No URL derivable         ${stats.noUrl}`)
  console.log()
  console.log(`  URLs attempted           ${stats.urlsAttempted}`)
  console.log(`  URLs reachable           ${stats.urlsReachable}`)
  console.log()
  console.log('  Detections:')
  console.log(`    NEW PI attorneys       ${stats.newPiDetected}`)
  console.log(`    Defense firms          ${stats.defenseDetected}`)
  console.log(`    Professional emails    ${stats.emailsFound}`)
  console.log(`    Headshots              ${stats.headshotsFound}`)
  console.log(`    Bios                   ${stats.biosFound}`)
  console.log(`    Languages              ${stats.languagesFound}`)
  console.log(`    Case results           ${stats.caseResultsFound}`)
  console.log(`    Awards                 ${stats.awardsFound}`)
  if (!args.dryRun) console.log(`\n  Rows updated             ${stats.updated}`)

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
