/**
 * Measure coverage against a hand-collected sample of plaintiff attorneys.
 *
 * Association directories (CAOC, CAALA) may not be copied in bulk, but a person
 * can look up a few dozen members and paste them into a CSV. This script finds
 * each one among the staged bar-roll rows and says where they stand, so the
 * sample gives both a coverage rate and the pipeline step that lost the rest.
 *
 * Run it against the database whose answer you want: production says who is
 * live, the local staging database says why someone was dropped.
 *
 * Input CSV columns: name (required), firm, county. A header row is expected.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/check-coverage-sample.ts sample.csv
 *   node ../node_modules/tsx/dist/cli.mjs scripts/check-coverage-sample.ts sample.csv --out result.csv
 */

import '../src/env'
import { readFileSync, writeFileSync } from 'fs'
import { prisma } from '../src/lib/prisma'

const SOURCE = 'cpra-ca-bar-2026'
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'esq'])

type Outcome =
  | 'on_platform'
  | 'confirmed_not_promoted'
  | 'low_confidence_queued'
  | 'rejected_as_defense'
  | 'site_did_not_confirm'
  | 'no_website'
  | 'not_flagged_pi'
  | 'inactive_or_disciplined'
  | 'ambiguous'
  | 'not_in_bar_data'

type Staged = Awaited<ReturnType<typeof loadCandidates>>[number]

function nameParts(name: string): { first: string; last: string } {
  // Directories list "Last, First Middle"; the bar roll lists "First Middle Last".
  const [left, right] = name.includes(',') ? name.split(',', 2) : [null, name]
  const tokens = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((t) => t && !SUFFIXES.has(t))
  if (left !== null) return { first: tokens(right ?? '')[0] ?? '', last: tokens(left).pop() ?? '' }
  const parts = tokens(right)
  return { first: parts[0] ?? '', last: parts[parts.length - 1] ?? '' }
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows = text.split(/\r?\n/).filter((line) => line.trim())
  const split = (line: string) => [...line.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)]
    .map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim()).slice(0, -1)
  const header = split(rows[0]).map((h) => h.toLowerCase())
  return rows.slice(1).map((line) => Object.fromEntries(split(line).map((v, i) => [header[i], v])))
}

async function loadCandidates(last: string) {
  return prisma.productionAttorney.findMany({
    where: { source: SOURCE, name: { contains: last, mode: 'insensitive' } },
    select: {
      name: true, firmName: true, county: true, status: true, piRelevant: true,
      website: true, licenseStatus: true, discipline: true, promotedAttorneyId: true,
    },
  })
}

function outcomeOf(row: Staged): Outcome {
  if (row.status === 'promoted' || row.promotedAttorneyId) return 'on_platform'
  if (row.status === 'reviewed') return 'confirmed_not_promoted'
  if (row.status === 'reviewed_low_confidence') return 'low_confidence_queued'
  if (row.status === 'rejected') return 'rejected_as_defense'
  const disciplined = (() => { try { return JSON.parse(row.discipline ?? '[]').length > 0 } catch { return false } })()
  // The CPRA file codes active members as "A".
  if (!/^(a|active)\b/i.test(row.licenseStatus ?? '') || disciplined) return 'inactive_or_disciplined'
  if (!row.piRelevant) return 'not_flagged_pi'
  return row.website ? 'site_did_not_confirm' : 'no_website'
}

async function main() {
  const [input, ...rest] = process.argv.slice(2)
  if (!input) throw new Error('Usage: check-coverage-sample.ts <sample.csv> [--out result.csv]')
  const outIndex = rest.indexOf('--out')
  const out = outIndex >= 0 ? rest[outIndex + 1] : null

  const sample = parseCsv(readFileSync(input, 'utf8')).filter((r) => r.name)
  const results: Array<{ name: string; firm: string; county: string; outcome: Outcome; matched: string }> = []

  for (const entry of sample) {
    const { first, last } = nameParts(entry.name)
    const candidates = (last ? await loadCandidates(last) : []).filter((row) => {
      const parts = nameParts(row.name)
      return parts.last === last && (parts.first === first || parts.first[0] === first[0])
    })
    const county = (entry.county ?? '').replace(/\s+county$/i, '').toLowerCase()
    const firm = (entry.firm ?? '').toLowerCase().split(/\W+/).filter((t) => t.length > 3)
    const narrowed = candidates.length > 1
      ? candidates.filter((row) => (county && row.county?.toLowerCase() === county)
        || firm.some((t) => row.firmName?.toLowerCase().includes(t)))
      : candidates
    const exactFirst = narrowed.filter((row) => nameParts(row.name).first === first)
    const pick = exactFirst.length === 1 ? exactFirst : narrowed

    let outcome: Outcome
    if (pick.length === 0) outcome = candidates.length > 1 ? 'ambiguous' : 'not_in_bar_data'
    else if (pick.length > 1) {
      // Several plausible people: count the sample as covered if any is live.
      outcome = pick.some((row) => outcomeOf(row) === 'on_platform') ? 'on_platform' : 'ambiguous'
    } else outcome = outcomeOf(pick[0])

    results.push({
      name: entry.name, firm: entry.firm ?? '', county: entry.county ?? '', outcome,
      matched: pick.map((row) => `${row.name} (${row.firmName ?? 'no firm'}, ${row.county ?? '?'})`).join(' | '),
    })
  }

  const tally = new Map<Outcome, number>()
  for (const r of results) tally.set(r.outcome, (tally.get(r.outcome) ?? 0) + 1)
  const live = tally.get('on_platform') ?? 0
  console.log(`\n  Sample: ${results.length}   On platform: ${live} (${Math.round((100 * live) / Math.max(1, results.length))}%)\n`)
  for (const [outcome, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${outcome.padEnd(26)} ${n}`)
  console.log('')
  for (const r of results.filter((x) => x.outcome !== 'on_platform')) {
    console.log(`  ${r.outcome.padEnd(26)} ${r.name}${r.firm ? ` — ${r.firm}` : ''}  ${r.matched ? `=> ${r.matched}` : ''}`)
  }

  if (out) {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
    writeFileSync(out, ['name,firm,county,outcome,matched', ...results.map((r) =>
      [r.name, r.firm, r.county, r.outcome, r.matched].map(cell).join(','))].join('\n'))
    console.log(`\n  Written: ${out}`)
  }
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
