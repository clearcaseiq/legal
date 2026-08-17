/**
 * Builds the CSVs behind the "ClearcaseIQ Worksheet" SEO tracking sheet.
 *
 * The sheet's Website Inventory and Indexation audit tabs describe the live
 * site, so they can only be refreshed from a crawl of the live site. This
 * measures two origins with the same code and emits both columns side by side:
 * production as it stands, and a local build as it would stand once deployed.
 * Keeping both is the point. Overwriting the production column with numbers
 * measured on a laptop would record an improvement the live site has not made
 * and destroy the baseline the improvement is measured against.
 *
 * Re-run after deploying with only the production origin to collapse the two
 * columns back into one true reading.
 *
 * Usage:
 *   npx tsx app/scripts/seo-sheet-export.ts <outDir> <productionOrigin> [localOrigin]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { allLandingPages } from '../src/data/seoLandingPages'

type Page = {
  status: number | string
  html: boolean
  title: string | null
  description: string | null
  canonical: string | null
  noindex: boolean
  h1Count: number
  h1Text: string | null
  schemaCount: number
  words: number
}

/**
 * Screaming Frog measures meta descriptions in pixels against a 985px limit,
 * using the real font. This script only has the HTML, and an attempt to estimate
 * glyph widths was abandoned: descriptions here sit in a 148-155 character band,
 * so the answer moved between 0 and everything on plausible width constants,
 * which is a number that looks precise and means nothing.
 *
 * A stated character threshold is reported instead. It is reproducible and close
 * to the same boundary, and the CSV points at the crawler's reading as the
 * authority for that row.
 */
const DESCRIPTION_LONG = 150
const TITLE_LONG = 60
const TITLE_SHORT = 30

function textOf(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
}

function parse(html: string): Omit<Page, 'status' | 'html'> {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return {
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null,
    description: html.match(/<meta name="description"[^>]*content="([^"]*)"/i)?.[1] ?? null,
    canonical: html.match(/rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? null,
    noindex: /<meta name="robots"[^>]*content="[^"]*noindex/i.test(html),
    h1Count: (html.match(/<h1[\s>]/gi) || []).length,
    h1Text: h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : null,
    schemaCount: (html.match(/application\/ld\+json/gi) || []).length,
    words: textOf(html)
      .split(/\s+/)
      .filter((w) => w.length > 1).length,
  }
}

async function crawl(origin: string) {
  const base = origin.replace(/\/+$/, '')
  const pages = new Map<string, Page>()
  const queue = ['/']
  const seen = new Set(['/'])

  while (queue.length) {
    const path = queue.shift()!
    let res: Response
    try {
      res = await fetch(base + path)
    } catch (error) {
      pages.set(path, { status: 'ERR', html: false } as Page)
      continue
    }

    if (!res.headers.get('content-type')?.includes('text/html')) {
      pages.set(path, { status: res.status, html: false } as Page)
      continue
    }

    const html = await res.text()
    pages.set(path, { status: res.status, html: true, ...parse(html) })

    for (const m of html.matchAll(/<a\b[^>]*href="([^"]*)"/gi)) {
      const href = m[1]
      if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue
      let url: URL
      try {
        url = new URL(href, base + path)
      } catch {
        continue
      }
      if (url.origin !== base) continue
      const next = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  const sitemap = await fetch(`${base}/sitemap.xml`)
    .then((r) => (r.ok ? r.text() : ''))
    .then((xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/'))
    .catch(() => [] as string[])

  return { base, pages, sitemap }
}

type Crawl = Awaited<ReturnType<typeof crawl>>

function duplicates(values: Array<string | null>) {
  const counts = new Map<string, number>()
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1)
  // The count a crawler reports is how many URLs share a value with another
  // URL, not how many distinct values are repeated.
  return [...counts.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0)
}

function measure({ base, pages, sitemap }: Crawl) {
  const docs = [...pages.entries()].filter(([, p]) => p.html)
  const indexable = docs.filter(([, p]) => !p.noindex)
  // Compared by path, not by full URL. A canonical tag names the production URL
  // whatever origin served the page, so a local build correctly emits
  // https://www.clearcaseiq.com/... while being crawled on localhost. Comparing
  // full URLs would report every local page as canonicalized elsewhere.
  const selfCanonical = indexable.filter(([path, p]) => {
    if (!p.canonical) return false
    let canonicalPath: string
    try {
      canonicalPath = new URL(p.canonical, base).pathname
    } catch {
      return false
    }
    return canonicalPath.replace(/\/$/, '') === path.replace(/\/$/, '')
  })

  return {
    reachable: pages.size,
    documents: docs.length,
    indexable: indexable.length,
    noindex: docs.length - indexable.length,
    withCanonical: indexable.filter(([, p]) => p.canonical).length,
    selfCanonical: selfCanonical.length,
    canonicalized: indexable.filter(([, p]) => p.canonical).length - selfCanonical.length,
    missingCanonical: indexable.filter(([, p]) => !p.canonical).length,
    titles: indexable.filter(([, p]) => p.title).length,
    duplicateTitles: duplicates(indexable.map(([, p]) => p.title)),
    titlesOver60: indexable.filter(([, p]) => (p.title?.length || 0) > TITLE_LONG).length,
    titlesUnder30: indexable.filter(([, p]) => (p.title?.length || 0) > 0 && p.title!.length < TITLE_SHORT).length,
    // Exact equality, which is what Screaming Frog reports, so this column stays
    // comparable with the baseline already in the sheet. Stripping the
    // "| ClearCaseIQ" suffix first would flag most of the site and mean
    // something different from the number sitting beside it.
    titleSameAsH1: indexable.filter(([, p]) => p.title && p.h1Text && p.title.trim() === p.h1Text.trim()).length,
    descriptions: indexable.filter(([, p]) => p.description).length,
    duplicateDescriptions: duplicates(indexable.map(([, p]) => p.description)),
    descriptionsOverProxy: indexable.filter(([, p]) => (p.description?.length || 0) > DESCRIPTION_LONG).length,
    longestDescription: indexable.reduce((max, [, p]) => Math.max(max, p.description?.length || 0), 0),
    missingH1: indexable.filter(([, p]) => p.h1Count === 0).length,
    multipleH1: indexable.filter(([, p]) => p.h1Count > 1).length,
    missingSchema: indexable.filter(([, p]) => p.schemaCount === 0).length,
    words: indexable.reduce((sum, [, p]) => sum + p.words, 0),
    sitemapUrls: sitemap.length,
    orphaned: sitemap.filter((p) => !pages.has(p)).length,
  }
}

type Measured = ReturnType<typeof measure>

// Leading BOM so Excel reads the Spanish page titles as UTF-8 rather than as the
// local 8-bit codepage. Sheets detects either way; Excel does not.
const csv = (rows: Array<Array<string | number>>) =>
  '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')

function websiteInventory(now: Measured, next: Measured | null, stamp: string) {
  const delta = (a: number, b: number) => (b === a ? 'no change' : b > a ? `+${b - a}` : `${b - a}`)
  const row = (kpi: string, a: number | string, b: number | string, note: string) =>
    next ? [kpi, a, b, typeof a === 'number' && typeof b === 'number' ? delta(a, b) : '', note] : [kpi, a, note]

  const header = next
    ? ['KPI', `Live site (${stamp})`, 'Projected after deploy', 'Change', 'Notes']
    : ['KPI', `Live site (${stamp})`, 'Notes']

  return csv([
    ['Website inventory'],
    header,
    row('URLs reachable by crawling from /', now.reachable, next?.reachable ?? '', 'Follows links only, the way an SEO crawler discovers a site'),
    row('HTML documents', now.documents, next?.documents ?? '', ''),
    row('Indexable', now.indexable, next?.indexable ?? '', 'Excludes pages carrying a noindex tag'),
    row('Noindex', now.noindex, next?.noindex ?? '', 'App routes and embed views, deliberately excluded'),
    [''],
    ['Canonical'],
    row('With canonical tag', now.withCanonical, next?.withCanonical ?? '', ''),
    row('Self-referencing', now.selfCanonical, next?.selfCanonical ?? '', ''),
    row('Canonicalized elsewhere', now.canonicalized, next?.canonicalized ?? '', ''),
    row('Missing canonical', now.missingCanonical, next?.missingCanonical ?? '', ''),
    [''],
    ['Title'],
    row('Present', now.titles, next?.titles ?? '', ''),
    row('Duplicate', now.duplicateTitles, next?.duplicateTitles ?? '', 'URLs sharing a title with another URL'),
    row('Over 60 characters', now.titlesOver60, next?.titlesOver60 ?? '', 'Risks truncation in search results'),
    row('Under 30 characters', now.titlesUnder30, next?.titlesUnder30 ?? '', ''),
    row('Same as H1', now.titleSameAsH1, next?.titleSameAsH1 ?? '', 'Exact match, as Screaming Frog reports it'),
    [''],
    ['Meta description'],
    row('Present', now.descriptions, next?.descriptions ?? '', ''),
    row('Duplicate', now.duplicateDescriptions, next?.duplicateDescriptions ?? '', ''),
    row(
      `Over ${DESCRIPTION_LONG} characters`,
      now.descriptionsOverProxy,
      next?.descriptionsOverProxy ?? '',
      'Stands in for the 985px rule, which needs the real font. Trust the crawler for that row'
    ),
    row('Longest description (characters)', now.longestDescription, next?.longestDescription ?? '', ''),
    [''],
    ['H1'],
    row('Missing', now.missingH1, next?.missingH1 ?? '', ''),
    row('More than one', now.multipleH1, next?.multipleH1 ?? '', ''),
    [''],
    ['Structured data'],
    row('Missing JSON-LD', now.missingSchema, next?.missingSchema ?? '', 'Enable Config > Spider > Extraction > JSON-LD to see this in Screaming Frog'),
    [''],
    ['Content'],
    row('Total words (indexable pages)', now.words, next?.words ?? '', 'Includes shared header and footer text'),
    [''],
    ['Sitemap'],
    row('URLs advertised', now.sitemapUrls, next?.sitemapUrls ?? '', ''),
    row('Orphaned (sitemap-only)', now.orphaned, next?.orphaned ?? '', 'Advertised in the sitemap but unreachable by following links'),
  ])
}

function indexationAudit(now: Crawl, next: Crawl | null, stamp: string) {
  const nowPaths = [...now.pages.keys()].sort()
  const nextPaths = next ? [...next.pages.keys()].sort() : []
  const added = next ? nextPaths.filter((p) => !now.pages.has(p)) : []

  const rows: Array<Array<string | number>> = [
    ['Indexation audit'],
    ['Measured', stamp],
    [''],
    ['Metric', 'Live site', next ? 'Projected after deploy' : ''],
    ['URLs in sitemap', now.sitemap.length, next?.sitemap.length ?? ''],
    ['URLs reachable by crawling', now.pages.size, next?.pages.size ?? ''],
    ['Sitemap URLs unreachable by crawling', now.sitemap.filter((p) => !now.pages.has(p)).length, next ? next.sitemap.filter((p) => !next.pages.has(p)).length : ''],
    [''],
    ['New URLs the deploy would add', added.length],
    [''],
    ['URL', 'Reachable on live site', 'Reachable after deploy'],
  ]

  const union = [...new Set([...nowPaths, ...nextPaths])].sort()
  for (const path of union) {
    rows.push([path, now.pages.has(path) ? 'yes' : 'no', next ? (next.pages.has(path) ? 'yes' : 'no') : ''])
  }
  return csv(rows)
}

/**
 * Intent by page category. The registry records what each page is about, not
 * what a searcher wants, so this mapping is a judgement applied consistently
 * rather than a measurement.
 */
const INTENT: Record<string, string> = {
  Settlement: 'Commercial investigation',
  'Attorney Intent': 'Commercial / transactional',
  Symptoms: 'Informational',
  Treatment: 'Informational',
  Insurance: 'Informational',
  Liability: 'Informational',
  Commercial: 'Commercial investigation',
  'Educational / SEO Moat': 'Informational',
}

function keywordClusters() {
  // Grouped by category, not by the registry's `cluster` field. That field is
  // close to one-per-page, so grouping on it produces 180 groups of one, which
  // is a page list wearing the word "cluster". Category is the level at which
  // pages actually compete for the same intent.
  const byCategory = new Map<string, typeof allLandingPages>()
  for (const page of allLandingPages) {
    const key = `${page.locale === 'es' ? 'Spanish' : 'English'}|${page.category}`
    const list = byCategory.get(key)
    if (list) list.push(page)
    else byCategory.set(key, [page])
  }

  const rows: Array<Array<string | number>> = [
    ['Keyword clusters with intent'],
    ['Generated from the page registry in app/src/data/seoLandingPages.ts. Secondary long-tail'],
    ['variations are keyword research and are not derivable from the codebase: keep the ones'],
    ['already in this tab and add to them.'],
    [''],
    ['Target keyword / page', 'Topic', 'URL', 'Search intent', 'Language'],
  ]

  let n = 0
  for (const [key, pages] of [...byCategory.entries()].sort()) {
    const [language, category] = key.split('|')
    n += 1
    rows.push([''])
    rows.push([`Cluster ${n} - ${category} (${language}, ${pages.length} pages)`])
    for (const page of [...pages].sort((a, b) => a.title.localeCompare(b.title))) {
      rows.push([
        page.title,
        page.cluster,
        `https://www.clearcaseiq.com${page.slug}`,
        INTENT[category] || '',
        language,
      ])
    }
  }
  return csv(rows)
}

const [outDir, productionOrigin, localOrigin] = process.argv.slice(2)
if (!outDir || !productionOrigin) {
  console.error('usage: tsx seo-sheet-export.ts <outDir> <productionOrigin> [localOrigin]')
  process.exit(1)
}

const stamp = new Date().toISOString().slice(0, 10)
mkdirSync(outDir, { recursive: true })

console.log(`Crawling live site ${productionOrigin} ...`)
const live = await crawl(productionOrigin)
console.log(`  ${live.pages.size} URLs reachable, ${live.sitemap.length} in sitemap`)

let projected: Crawl | null = null
if (localOrigin) {
  console.log(`Crawling local build ${localOrigin} ...`)
  projected = await crawl(localOrigin)
  console.log(`  ${projected.pages.size} URLs reachable, ${projected.sitemap.length} in sitemap`)
}

writeFileSync(
  join(outDir, 'website-inventory.csv'),
  websiteInventory(measure(live), projected ? measure(projected) : null, stamp)
)
writeFileSync(join(outDir, 'indexation-audit.csv'), indexationAudit(live, projected, stamp))
writeFileSync(join(outDir, 'keyword-clusters.csv'), keywordClusters())

console.log(`\nWrote 3 CSVs to ${outDir}`)
