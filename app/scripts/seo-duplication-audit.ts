/**
 * Measures how much of each SEO landing page is actually written for that page.
 *
 * The crawl reports that ~95% of the corpus shares duplicate H2 headings. That
 * is a symptom rather than the finding: the headings repeat because the
 * sections under them repeat. `SeoLandingPage.tsx` renders five substantial
 * blocks — symptom timeline, severity ladder, treatment progression, settlement
 * drivers, insurance problems — from module-level constants whenever a page has
 * no entry in `topicContentBySlug`, and only 17 slugs have one.
 *
 * So this counts, per page, the characters that exist only on that page against
 * the characters every page renders regardless. The ratio is what decides which
 * pages are worth keeping and strengthening, and which are template output with
 * a place name swapped in.
 *
 * Usage:
 *   npx tsx app/scripts/seo-duplication-audit.ts [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { allLandingPages, type LandingPage } from '../src/data/seoLandingPages'
import { topicContentBySlug } from '../src/data/seoLandingPageTopicContent'
import { cityLocalFacts } from '../src/data/seoCityLocalFacts'
import { landingPageFaqs } from '../src/data/seoLandingPageSchema'

/**
 * Size of the boilerplate every page without `topicContent` renders. Measured
 * from the constants in SeoLandingPage.tsx (symptomTimeline, severityLadder,
 * treatmentProgression, settlementDrivers, insuranceProblems) plus the fixed
 * prose and the eleven static headings that sit above them.
 *
 * Held as a constant because those values are module-private to the component.
 * It is a floor, not an estimate: the real figure is higher once the repeated
 * CTA copy and the cite-embed block are counted.
 */
const SHARED_TEMPLATE_CHARS = 2_940

const len = (value: string | undefined | null) => (value ? value.trim().length : 0)

type Row = {
  slug: string
  category: string
  cluster: string
  locale: string
  hasTopicContent: boolean
  hasCityFacts: boolean
  authoredChars: number
  authoredFaqs: number
  sharedFaqs: number
  sharedChars: number
  uniqueShare: number
}

function measure(page: LandingPage): Row {
  const authoredFaqChars = page.faqs.reduce((sum, faq) => sum + len(faq.q) + len(faq.a), 0)

  // Everything a human wrote for this slug specifically.
  const authoredChars =
    len(page.description) +
    len(page.psychology) +
    len(page.sections.whyItMatters) +
    len(page.sections.howClearCaseHelps) +
    page.sections.whatToTrack.reduce((sum, item) => sum + len(item), 0) +
    authoredFaqChars

  const hasTopicContent = Boolean(topicContentBySlug[page.slug])
  const hasCityFacts = Boolean(cityLocalFacts[page.slug])

  // FAQs the template appends from the shared pools, which land on the page but
  // were not written for it.
  const rendered = landingPageFaqs(page)
  const authoredQuestions = new Set(page.faqs.map((faq) => faq.q))
  const sharedFaqs = rendered.filter((faq) => !authoredQuestions.has(faq.q))
  const sharedFaqChars = sharedFaqs.reduce((sum, faq) => sum + len(faq.q) + len(faq.a), 0)

  // A page with bespoke topic content renders that instead of the constants, so
  // it carries no shared block for those five sections.
  const sharedChars = (hasTopicContent ? 0 : SHARED_TEMPLATE_CHARS) + sharedFaqChars

  return {
    slug: page.slug,
    category: page.category,
    cluster: page.cluster,
    locale: page.locale ?? 'en',
    hasTopicContent,
    hasCityFacts,
    authoredChars,
    authoredFaqs: page.faqs.length,
    sharedFaqs: sharedFaqs.length,
    sharedChars,
    uniqueShare: authoredChars / (authoredChars + sharedChars),
  }
}

const rows = allLandingPages.map(measure).sort((a, b) => b.authoredChars - a.authoredChars)
const english = rows.filter((row) => row.locale === 'en')

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

console.log(`\nLanding pages: ${rows.length}  (English ${english.length})`)
console.log(`With bespoke topic content: ${english.filter((r) => r.hasTopicContent).length}`)
console.log(`With city local facts:      ${english.filter((r) => r.hasCityFacts).length}`)
console.log(
  `\nAuthored characters per English page: median ${median(english.map((r) => r.authoredChars))}, ` +
    `min ${Math.min(...english.map((r) => r.authoredChars))}, max ${Math.max(...english.map((r) => r.authoredChars))}`,
)
console.log(`Median unique share: ${pct(median(english.map((r) => r.uniqueShare)))}`)

for (const [label, test] of [
  ['under 40% unique', (r: Row) => r.uniqueShare < 0.4],
  ['40-60% unique', (r: Row) => r.uniqueShare >= 0.4 && r.uniqueShare < 0.6],
  ['60-75% unique', (r: Row) => r.uniqueShare >= 0.6 && r.uniqueShare < 0.75],
  ['75%+ unique', (r: Row) => r.uniqueShare >= 0.75],
] as Array<[string, (r: Row) => boolean]>) {
  const n = english.filter(test).length
  console.log(`  ${label.padEnd(18)} ${String(n).padStart(4)}  (${pct(n / english.length)})`)
}

// How many pages share a byte-identical authored body? This is the duplicate
// content question the H2 finding is standing in for.
const bodies = new Map<string, string[]>()
for (const page of allLandingPages) {
  if ((page.locale ?? 'en') !== 'en') continue
  const key = `${page.sections.whyItMatters}|${page.sections.howClearCaseHelps}`
  bodies.set(key, [...(bodies.get(key) ?? []), page.slug])
}
const collisions = [...bodies.values()].filter((slugs) => slugs.length > 1)
console.log(
  `\nIdentical authored bodies: ${collisions.length} group(s) covering ${collisions.reduce((n, g) => n + g.length, 0)} pages`,
)
for (const group of collisions.slice(0, 10)) {
  console.log(`  ${group.length}x  ${group.slice(0, 4).join(', ')}${group.length > 4 ? ' …' : ''}`)
}

console.log(`\nStrongest 15 by authored content:`)
for (const row of english.slice(0, 15)) {
  console.log(`  ${String(row.authoredChars).padStart(5)}  ${pct(row.uniqueShare).padStart(6)}  ${row.slug}`)
}
console.log(`\nWeakest 15 by authored content:`)
for (const row of english.slice(-15)) {
  console.log(`  ${String(row.authoredChars).padStart(5)}  ${pct(row.uniqueShare).padStart(6)}  ${row.slug}`)
}

const outDir = process.argv[2] ?? 'seo-sheet-export'
mkdirSync(outDir, { recursive: true })
const header = 'slug,category,cluster,locale,hasTopicContent,hasCityFacts,authoredChars,authoredFaqs,sharedFaqs,sharedChars,uniqueShare\n'
const csv =
  header +
  rows
    .map((r) =>
      [
        r.slug,
        r.category,
        `"${r.cluster.replace(/"/g, '""')}"`,
        r.locale,
        r.hasTopicContent,
        r.hasCityFacts,
        r.authoredChars,
        r.authoredFaqs,
        r.sharedFaqs,
        r.sharedChars,
        r.uniqueShare.toFixed(4),
      ].join(','),
    )
    .join('\n')
const outFile = join(outDir, 'duplication-audit.csv')
writeFileSync(outFile, csv)
console.log(`\nWrote ${outFile} (${rows.length} rows)\n`)
