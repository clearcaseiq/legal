/**
 * Read-only audit of `production_attorneys`.
 *
 * Answers the question that decides whether a bulk import is worth running:
 * of the rows we have staged, how many would become attorneys the routing engine
 * can actually match, and where do the rest fall down?
 *
 * Routing needs two things from every record — a county (an attorney with none
 * reads as serving the whole state) and at least one practice area that maps to
 * an incident type (free text like "Personal Injury" matches no case). This
 * script measures both against the real staged data, so problems surface on the
 * rows we already have rather than on a 200,000-row import.
 *
 * This script writes NOTHING. It is safe to run against production.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/audit-staged-attorneys.ts
 *
 * Flags:
 *   --source <name>   Only audit rows from this source.
 *   --status <name>   Only audit rows with this pipeline status.
 *   --top <n>         How many entries to list in each "top offenders" table (default 15).
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'
import { extractFirmDomain, normalizeBarNumber } from '../src/lib/attorney-identity'
import { resolveCaCounty } from '../src/lib/ca-counties'
import { normalizePracticeAreas, parsePracticeAreaText } from '../src/lib/practice-area-normalize'

type Args = { source?: string; status?: string; top: number }

function parseArgs(argv: string[]): Args {
  const args: Args = { top: 15 }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    if (flag === '--source') args.source = next()
    else if (flag === '--status') args.status = next()
    else if (flag === '--top') {
      const value = Number(next())
      if (Number.isFinite(value) && value > 0) args.top = Math.floor(value)
    } else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

function bump(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  n/a'
  return `${((part / whole) * 100).toFixed(1).padStart(5)}%`
}

function row(label: string, count: number, total: number): string {
  return `    ${label.padEnd(28)} ${String(count).padStart(8)}  ${pct(count, total)}`
}

function table(title: string, counter: Map<string, number>, top: number): void {
  if (counter.size === 0) return
  const entries = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])
  console.log(`\n  ${title} (top ${Math.min(top, entries.length)} of ${entries.length}):`)
  for (const [key, count] of entries.slice(0, top)) {
    console.log(`    ${String(count).padStart(8)}  ${key}`)
  }
}

const PAGE_SIZE = 1000

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const where = {
    ...(args.source ? { source: args.source } : {}),
    ...(args.status ? { status: args.status } : {}),
  }

  const total = await prisma.productionAttorney.count({ where })
  if (total === 0) {
    console.log('No staged rows matched. Nothing to audit.')
    console.log('Stage some first, e.g. with scripts/import-ca-bar-roll.ts.')
    await prisma.$disconnect().catch(() => undefined)
    return
  }

  console.log(`Auditing ${total} staged row(s)`)
  if (args.source) console.log(`  source: ${args.source}`)
  if (args.status) console.log(`  status: ${args.status}`)
  console.log('This script does not write to the database.\n')

  const bySourceStatus = new Map<string, number>()
  const unresolvedCities = new Map<string, number>()
  const ambiguousCities = new Map<string, number>()
  const unmatchedLabels = new Map<string, number>()
  const incidentTypeCounts = new Map<string, number>()
  const stateCounts = new Map<string, number>()

  let withBarNumber = 0
  let withFirmName = 0
  let withEmail = 0
  let withWebsite = 0
  let withFirmDomain = 0
  let withPracticeAreaText = 0

  let countyFromSource = 0
  let countyFromCity = 0
  let countyAmbiguous = 0
  let countyUnresolved = 0

  let specialtyMapped = 0
  let specialtyGenericOnly = 0
  let specialtyUnmappable = 0

  let wouldSkipNoName = 0

  let cursor: string | undefined
  let scanned = 0

  // Page by id so a large table does not have to fit in memory.
  for (;;) {
    const page = await prisma.productionAttorney.findMany({
      where,
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        source: true,
        status: true,
        name: true,
        firmName: true,
        email: true,
        phone: true,
        website: true,
        barNumber: true,
        city: true,
        state: true,
        county: true,
        practiceAreas: true,
      },
    })

    if (page.length === 0) break

    for (const record of page) {
      scanned += 1
      bump(bySourceStatus, `${record.source} / ${record.status}`)
      bump(stateCounts, (record.state ?? '(none)').toUpperCase())

      if (!record.name?.trim()) wouldSkipNoName += 1
      if (normalizeBarNumber(record.barNumber)) withBarNumber += 1
      if (record.firmName?.trim()) withFirmName += 1
      if (record.email?.trim()) withEmail += 1
      if (record.website?.trim()) withWebsite += 1
      if (extractFirmDomain(record.website) ?? extractFirmDomain(record.email)) withFirmDomain += 1

      const isCalifornia = String(record.state ?? '').trim().toUpperCase() === 'CA'
      if (isCalifornia) {
        const resolution = resolveCaCounty({ county: record.county, city: record.city })
        if (resolution.via === 'county') countyFromSource += 1
        else if (resolution.via === 'city') countyFromCity += 1
        else if (resolution.via === 'ambiguous') {
          countyAmbiguous += 1
          if (record.city?.trim()) {
            bump(ambiguousCities, `${record.city.trim()} (${resolution.candidates?.join(' / ')})`)
          }
        } else {
          countyUnresolved += 1
          if (record.city?.trim()) bump(unresolvedCities, record.city.trim())
        }
      } else if (record.county?.trim()) {
        countyFromSource += 1
      } else {
        countyUnresolved += 1
      }

      const labels = parsePracticeAreaText(record.practiceAreas)
      if (labels.length > 0) withPracticeAreaText += 1

      const normalized = normalizePracticeAreas(labels)
      if (normalized.incidentTypes.length === 0) {
        specialtyUnmappable += 1
      } else if (normalized.genericOnly) {
        specialtyGenericOnly += 1
      } else {
        specialtyMapped += 1
      }
      for (const incident of normalized.incidentTypes) bump(incidentTypeCounts, incident)
      for (const label of normalized.unmatchedLabels) bump(unmatchedLabels, label)
    }

    cursor = page[page.length - 1].id
    if (page.length < PAGE_SIZE) break
    process.stdout.write(`\r  scanned ${scanned}/${total}...`)
  }

  if (scanned >= PAGE_SIZE) process.stdout.write('\r')

  // A row becomes a routable attorney only if it has a name and at least one
  // mappable practice area. Promotion skips the rest.
  const promotable = scanned - wouldSkipNoName - specialtyUnmappable
  const withoutCounty = countyUnresolved + countyAmbiguous
  const routableWithCounty = Math.max(0, promotable - withoutCounty)

  console.log('='.repeat(64))
  console.log(`Staged rows scanned: ${scanned}\n`)

  table('Rows by source and status', bySourceStatus, args.top)
  table('Rows by state', stateCounts, args.top)

  console.log('\n  Identity keys:')
  console.log(row('has usable bar number', withBarNumber, scanned))
  console.log(row('has firm name', withFirmName, scanned))
  console.log(row('has email', withEmail, scanned))
  console.log(row('has website', withWebsite, scanned))
  console.log(row('firm domain extractable', withFirmDomain, scanned))

  console.log('\n  County resolution (an unresolved county reads as statewide):')
  console.log(row('given by the source', countyFromSource, scanned))
  console.log(row('derived from city', countyFromCity, scanned))
  console.log(row('ambiguous city name', countyAmbiguous, scanned))
  console.log(row('unresolved', countyUnresolved, scanned))

  console.log('\n  Practice-area mapping (unmappable rows are skipped on promote):')
  console.log(row('mapped to a sub-type', specialtyMapped, scanned))
  console.log(row('generic PI only', specialtyGenericOnly, scanned))
  console.log(row('unmappable', specialtyUnmappable, scanned))
  console.log(row('had any practice-area text', withPracticeAreaText, scanned))

  table('Incident types produced', incidentTypeCounts, args.top)
  table('Practice-area labels that mapped to nothing', unmatchedLabels, args.top)
  table('Cities with no county mapping', unresolvedCities, args.top)
  table('Cities whose name spans several counties', ambiguousCities, args.top)

  console.log('\n' + '='.repeat(64))
  console.log('Projected outcome if these rows were promoted today:\n')
  console.log(row('would be promoted', promotable, scanned))
  console.log(row('  ...with a real county', routableWithCounty, scanned))
  console.log(row('  ...as statewide', Math.min(promotable, withoutCounty), scanned))
  console.log(row('skipped: no name', wouldSkipNoName, scanned))
  console.log(row('skipped: no practice area', specialtyUnmappable, scanned))

  if (specialtyUnmappable > 0) {
    console.log(
      `\n  ${specialtyUnmappable} row(s) would be skipped for practice areas. Check the ` +
        'label table above — if a common label is missing, add a pattern to\n' +
        '  api/src/lib/practice-area-normalize.ts and re-run this audit.'
    )
  }
  if (withoutCounty > 0) {
    console.log(
      `\n  ${withoutCounty} row(s) have no county and would read as statewide. Add the\n` +
        '  cities listed above to CURATED_CITY_TO_COUNTY in api/src/lib/ca-counties.ts,\n' +
        '  or hold them back with PROMOTE_REQUIRE_COUNTY=true.'
    )
  }
  console.log('\nPromoted attorneys are created isVerified=false and receive no leads until vetted.')

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
