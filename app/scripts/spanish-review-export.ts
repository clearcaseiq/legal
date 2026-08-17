/**
 * Extracts every machine-authored translated string into reviewable sheets.
 *
 * The Spanish and Chinese pages carry text written by a model, flagged for
 * native review before publishing. That review cannot reasonably happen in the
 * codebase: a reviewer would have to read TSX to find the prose, and corrections
 * would come back as prose in a chat rather than as edits tied to a field. This
 * emits one row per string with the file and field it came from, so a correction
 * can be applied without hunting for where the text lives.
 *
 * Scope is only what was machine-authored. For Spanish that is the eight landing
 * pages, the marketing titles and descriptions, and the literals baked into the
 * template. For Chinese it is just fourteen strings: the titles and descriptions,
 * because the page bodies are the human-translated dictionary. The 4,737 keys in
 * each of es.json and zh.json predate this work and are not included.
 *
 * One file per language, because they go to different reviewers.
 *
 * Usage:
 *   npx tsx app/scripts/spanish-review-export.ts <outDir>
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { landingPagesEs } from '../src/data/seoLandingPagesEs'
import { marketingPagesEs } from '../src/data/marketingPagesEs'
import { marketingPagesZh } from '../src/data/marketingPagesZh'

type Row = {
  page: string
  url: string
  section: string
  field: string
  spanish: string
}

const rows: Row[] = []
const add = (page: string, url: string, section: string, field: string, spanish?: string) => {
  if (spanish && spanish.trim()) rows.push({ page, url, section, field, spanish: spanish.trim() })
}

for (const page of landingPagesEs) {
  const url = `https://www.clearcaseiq.com${page.slug}`
  const name = page.title

  add(name, url, 'Head', 'title', page.title)
  add(name, url, 'Head', 'meta description', page.description)
  add(name, url, 'Header', 'eyebrow', page.eyebrow)
  add(name, url, 'Header', 'call to action', page.cta)
  add(name, url, 'Intro', 'intro paragraph', page.intro)
  add(name, url, 'Why it matters', 'body', page.sections.whyItMatters)

  page.body.forEach((section, i) => {
    add(name, url, `Section ${i + 1}`, 'heading', section.heading)
    add(name, url, `Section ${i + 1}`, 'body', section.body)
    section.bullets?.forEach((bullet, j) => add(name, url, `Section ${i + 1}`, `bullet ${j + 1}`, bullet))
  })

  if (page.timeline) {
    add(name, url, 'Timeline', 'heading', page.timeline.heading)
    add(name, url, 'Timeline', 'intro', page.timeline.intro)
    add(name, url, 'Timeline', 'column 1', page.timeline.columns[0])
    add(name, url, 'Timeline', 'column 2', page.timeline.columns[1])
    page.timeline.rows.forEach(([label, detail], i) => {
      add(name, url, 'Timeline', `row ${i + 1} label`, label)
      add(name, url, 'Timeline', `row ${i + 1} detail`, detail)
    })
  }

  if (page.checklist) {
    add(name, url, 'Checklist', 'heading', page.checklist.heading)
    add(name, url, 'Checklist', 'intro', page.checklist.intro)
    page.checklist.items.forEach((item, i) => add(name, url, 'Checklist', `item ${i + 1}`, item))
  }

  if (page.warning) {
    add(name, url, 'Warning', 'heading', page.warning.heading)
    add(name, url, 'Warning', 'body', page.warning.body)
  }

  page.sections.whatToTrack.forEach((item, i) => add(name, url, 'What to document', `item ${i + 1}`, item))
  add(name, url, 'How ClearCaseIQ helps', 'body', page.sections.howClearCaseHelps)

  page.faqs.forEach((faq, i) => {
    add(name, url, `FAQ ${i + 1}`, 'question', faq.q)
    add(name, url, `FAQ ${i + 1}`, 'answer', faq.a)
  })
}

for (const page of marketingPagesEs) {
  const url = `https://www.clearcaseiq.com${page.path}`
  add(page.path, url, 'Head', 'title', page.title)
  add(page.path, url, 'Head', 'meta description', page.description)
}

/**
 * The Spanish literals in the template itself.
 *
 * Pulled from the source rather than retyped here, so a string edited in the
 * component cannot silently drop out of review. Only strings of two or more
 * words are collected: single words are overwhelmingly Tailwind classes and
 * prop names, which would bury the prose in noise.
 */
const here = fileURLToPath(new URL('.', import.meta.url))
for (const file of ['../src/pages/SeoLandingPageEs.tsx', '../src/pages/TopicsEs.tsx']) {
  const source = readFileSync(join(here, file), 'utf8')
  const seen = new Set<string>()
  for (const m of source.matchAll(/(?:>|["'`])\s*([A-ZÁÉÍÓÚÑ¿¡][^<>{}"'`\n]{6,}?)\s*(?:<|["'`])/g)) {
    const text = m[1].trim()
    if (seen.has(text)) continue
    if (!/[áéíóúñ¿¡]/i.test(text) && !/\b(de|la|el|los|las|que|con|para|una|por|su)\b/i.test(text)) continue
    seen.add(text)
    add(file.split('/').pop()!, '', 'Template literal', 'UI text', text)
  }
}

const csv = (data: Array<Array<string>>) =>
  data.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')

const outDir = process.argv[2]
if (!outDir) {
  console.error('usage: tsx spanish-review-export.ts <outDir>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const headerFor = (language: string, note: string) => [
  [`${language} content for native review`],
  [note],
  ['Put corrections in the "Suggested correction" column. Leave it blank to approve the text as written.'],
  [''],
  ['Page', 'URL', 'Section', 'Field', `${language} text`, 'Suggested correction', 'Reviewer notes'],
]

// Leading BOM. These files are entirely accented Spanish and Chinese, and Excel
// reads a BOM-less CSV as the local 8-bit codepage, which turns every "ñ" into
// mojibake and invites the reviewer to "fix" characters that were never broken.
const write = (name: string, header: string[][], data: Row[]) =>
  writeFileSync(
    join(outDir, name),
    '\uFEFF' + csv([...header, ...data.map((r) => [r.page, r.url, r.section, r.field, r.spanish, '', ''])])
  )

write(
  'spanish-review.csv',
  headerFor('Spanish', 'Written by an AI model and not yet reviewed by a native speaker.'),
  rows
)

const zhRows: Row[] = marketingPagesZh.flatMap((page) => [
  { page: page.path, url: `https://www.clearcaseiq.com${page.path}`, section: 'Head', field: 'title', spanish: page.title },
  {
    page: page.path,
    url: `https://www.clearcaseiq.com${page.path}`,
    section: 'Head',
    field: 'meta description',
    spanish: page.description,
  },
])

write(
  'chinese-review.csv',
  headerFor(
    'Simplified Chinese',
    'Only these search-result titles and descriptions were machine-written. The page bodies are the existing human translation in zh.json and are not under review here.'
  ),
  zhRows
)

const words = rows.reduce((n, r) => n + r.spanish.split(/\s+/).length, 0)
console.log(`spanish-review.csv: ${rows.length} strings (${words} words) from ${landingPagesEs.length} landing`)
console.log(`  pages and ${marketingPagesEs.length} marketing pages`)
console.log(`chinese-review.csv: ${zhRows.length} strings from ${marketingPagesZh.length} marketing pages`)
