/**
 * Stage the California State Bar attorney roll into `production_attorneys`.
 *
 * This is the identity spine: one staging row per active California licensee,
 * keyed on bar number. Nothing here touches the live `Attorney` table — review
 * and promotion stay with `promote-production-attorneys.ts`, so a bad import can
 * be thrown away by deleting staging rows.
 *
 * The roll arrives as a CSV whose exact headers depend on how the Bar fulfils
 * the records request, so column names are configurable rather than hardcoded.
 * `--inspect` prints the headers and a sample row without importing, which is
 * the right first step against a file you have not seen before.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-ca-bar-roll.ts \
 *     --file ./data/ca-bar-roll.csv --inspect
 *
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-ca-bar-roll.ts \
 *     --file ./data/ca-bar-roll.csv --dry-run
 *
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-ca-bar-roll.ts \
 *     --file ./data/ca-bar-roll.csv
 *
 * Flags:
 *   --file <path>     CSV to import (required).
 *   --inspect         Print headers, the detected mapping and 3 sample rows, then exit.
 *   --dry-run         Parse and report without writing.
 *   --limit <n>       Stop after n data rows. Useful for a first pass.
 *   --source <name>   Staging `source` value (default "ca-state-bar").
 *   --map <json>      Column overrides, e.g. '{"barNumber":"Bar #","city":"Town"}'.
 *   --all-statuses    Import every licence status, not just active ones.
 */

import '../src/env'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { prisma } from '../src/lib/prisma'
import { buildAttorneyDedupeHash, normalizeBarNumber } from '../src/lib/attorney-identity'
import { resolveCaCounty } from '../src/lib/ca-counties'
import { normalizePracticeAreas, parsePracticeAreaText } from '../src/lib/practice-area-normalize'

type Args = {
  file: string
  inspect: boolean
  dryRun: boolean
  limit: number | null
  source: string
  map: Record<string, string>
  allStatuses: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    file: '',
    inspect: false,
    dryRun: false,
    limit: null,
    source: 'ca-state-bar',
    map: {},
    allStatuses: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--file':
        args.file = next() ?? ''
        break
      case '--inspect':
        args.inspect = true
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--limit': {
        const value = Number(next())
        args.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : null
        break
      }
      case '--source':
        args.source = next() ?? args.source
        break
      case '--all-statuses':
        args.allStatuses = true
        break
      case '--map': {
        const raw = next() ?? '{}'
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') args.map = parsed as Record<string, string>
        } catch {
          throw new Error(`--map is not valid JSON: ${raw}`)
        }
        break
      }
      default:
        if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }

  if (!args.file) throw new Error('--file <path> is required')
  return args
}

/** Logical field -> candidate header names, matched case- and punctuation-insensitively. */
const FIELD_ALIASES: Record<string, string[]> = {
  barNumber: ['bar number', 'barnumber', 'bar no', 'bar', 'calbar number', 'sbn', 'member number', 'license number', 'licence number'],
  name: ['name', 'full name', 'attorney name', 'member name', 'licensee name'],
  firstName: ['first name', 'firstname', 'given name'],
  middleName: ['middle name', 'middlename', 'middle initial'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  firmName: ['firm', 'firm name', 'organization', 'organisation', 'employer', 'company', 'law firm'],
  email: ['email', 'e mail', 'email address', 'primary email'],
  phone: ['phone', 'telephone', 'phone number', 'primary phone', 'work phone'],
  website: ['website', 'web site', 'url', 'firm website', 'web address'],
  street: ['address', 'address 1', 'address line 1', 'street', 'street address', 'mailing address'],
  city: ['city', 'town', 'address city', 'mailing city'],
  state: ['state', 'address state', 'mailing state', 'st'],
  zip: ['zip', 'zip code', 'zipcode', 'postal code', 'address zip'],
  county: ['county', 'address county', 'mailing county'],
  licenseStatus: ['status', 'license status', 'licence status', 'member status', 'standing', 'present status'],
  admissionDate: ['admission date', 'admitted', 'date admitted', 'admission'],
  practiceAreas: ['practice areas', 'practice area', 'areas of practice', 'specialty', 'specialties', 'section'],
}

function headerKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Map logical field names onto the CSV's actual headers.
 * Explicit `--map` overrides win over alias detection.
 */
function buildColumnMap(
  headers: string[],
  overrides: Record<string, string>
): Record<string, string | null> {
  const byKey = new Map<string, string>()
  for (const header of headers) {
    const key = headerKey(header)
    if (key && !byKey.has(key)) byKey.set(key, header)
  }

  const map: Record<string, string | null> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const override = overrides[field]
    if (override) {
      map[field] = headers.includes(override) ? override : null
      if (!map[field]) {
        throw new Error(`--map points ${field} at "${override}", which is not a column in the file`)
      }
      continue
    }
    map[field] = aliases.map((alias) => byKey.get(alias)).find(Boolean) ?? null
  }
  return map
}

function pick(row: Record<string, string>, column: string | null): string | null {
  if (!column) return null
  const value = row[column]
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Assemble a display name from whichever name columns the file provides. */
function resolveName(row: Record<string, string>, map: Record<string, string | null>): string | null {
  const full = pick(row, map.name)
  if (full) {
    // Rolls often store "Last, First Middle"; flip it for display.
    const comma = full.indexOf(',')
    if (comma > 0) {
      const last = full.slice(0, comma).trim()
      const rest = full.slice(comma + 1).trim()
      if (last && rest) return `${rest} ${last}`
    }
    return full
  }

  const parts = [pick(row, map.firstName), pick(row, map.middleName), pick(row, map.lastName)]
    .filter(Boolean)
    .join(' ')
    .trim()
  return parts.length > 0 ? parts : null
}

/**
 * Licence statuses that mean the attorney may currently practise.
 * Anything else (inactive, suspended, resigned, disbarred, deceased) is skipped
 * unless `--all-statuses` is passed.
 */
const ACTIVE_STATUS = /^(active|active member|admitted|eligible|good standing|active eligible)/i

type Stats = {
  rows: number
  staged: number
  updated: number
  skippedNoBarNumber: number
  skippedNoName: number
  skippedStatus: number
  skippedOutOfState: number
  countyFromSource: number
  countyFromCity: number
  countyAmbiguous: number
  countyUnresolved: number
  withFirm: number
  withEmail: number
  withWebsite: number
  withPracticeArea: number
  duplicateBarNumbers: number
}

function emptyStats(): Stats {
  return {
    rows: 0,
    staged: 0,
    updated: 0,
    skippedNoBarNumber: 0,
    skippedNoName: 0,
    skippedStatus: 0,
    skippedOutOfState: 0,
    countyFromSource: 0,
    countyFromCity: 0,
    countyAmbiguous: 0,
    countyUnresolved: 0,
    withFirm: 0,
    withEmail: 0,
    withWebsite: 0,
    withPracticeArea: 0,
    duplicateBarNumbers: 0,
  }
}

type StagedRow = {
  source: string
  dedupeHash: string
  externalId: string
  barNumber: string
  barState: string
  name: string
  firmName: string | null
  email: string | null
  phone: string | null
  website: string | null
  street: string | null
  city: string | null
  state: string
  zip: string | null
  county: string | null
  countySource: string
  licenseStatus: string | null
  practiceAreas: string | null
  rawPayload: string
}

const BATCH_SIZE = 500

async function flushBatch(batch: StagedRow[], stats: Stats): Promise<void> {
  if (batch.length === 0) return

  // Upsert one at a time inside a transaction: `createMany` cannot update, and a
  // re-import must be idempotent on (source, dedupeHash).
  await prisma.$transaction(
    batch.map((row) =>
      prisma.productionAttorney.upsert({
        where: { source_dedupeHash: { source: row.source, dedupeHash: row.dedupeHash } },
        create: { ...row, status: 'scraped' },
        update: {
          // Refresh what the roll is authoritative for. `status` is left alone
          // so a row a human already reviewed is not knocked back to "scraped".
          name: row.name,
          firmName: row.firmName,
          email: row.email,
          phone: row.phone,
          website: row.website,
          street: row.street,
          city: row.city,
          state: row.state,
          zip: row.zip,
          county: row.county,
          countySource: row.countySource,
          licenseStatus: row.licenseStatus,
          practiceAreas: row.practiceAreas,
          barNumber: row.barNumber,
          barState: row.barState,
          rawPayload: row.rawPayload,
        },
      })
    )
  )

  stats.staged += batch.length
  batch.length = 0
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const parser = createReadStream(args.file).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    })
  )

  let map: Record<string, string | null> | null = null
  const stats = emptyStats()
  const samples: Record<string, unknown>[] = []
  const seenBarNumbers = new Set<string>()
  const batch: StagedRow[] = []
  const unmatchedPracticeAreas = new Map<string, number>()

  for await (const record of parser) {
    const row = record as Record<string, string>

    if (!map) {
      const headers = Object.keys(row)
      map = buildColumnMap(headers, args.map)

      if (args.inspect) {
        console.log(`Columns in ${args.file}:\n`)
        for (const header of headers) console.log(`  ${header}`)
        console.log('\nDetected mapping:\n')
        for (const [field, column] of Object.entries(map)) {
          console.log(`  ${field.padEnd(15)} ${column ?? '(not found)'}`)
        }
      }

      if (!map.barNumber) {
        throw new Error(
          'Could not find a bar-number column. Pass one explicitly, e.g. ' +
            `--map '{"barNumber":"${headers[0]}"}'`
        )
      }
    }

    stats.rows += 1

    if (args.inspect) {
      if (samples.length < 3) samples.push(row)
      if (samples.length >= 3) break
      continue
    }

    const barNumber = normalizeBarNumber(pick(row, map.barNumber))
    if (!barNumber) {
      stats.skippedNoBarNumber += 1
      continue
    }

    if (seenBarNumbers.has(barNumber)) {
      // The roll can list an attorney more than once (multiple addresses). The
      // upsert makes this harmless; count it so the file can be sanity-checked.
      stats.duplicateBarNumbers += 1
    }
    seenBarNumbers.add(barNumber)

    const name = resolveName(row, map)
    if (!name) {
      stats.skippedNoName += 1
      continue
    }

    const licenseStatus = pick(row, map.licenseStatus)
    if (!args.allStatuses && licenseStatus && !ACTIVE_STATUS.test(licenseStatus)) {
      stats.skippedStatus += 1
      continue
    }

    // The roll includes attorneys with out-of-state mailing addresses. They are
    // licensed in California but are not the local-counsel population we route
    // to, so they are staged only with --all-statuses.
    const state = (pick(row, map.state) ?? 'CA').toUpperCase()
    if (!args.allStatuses && state !== 'CA') {
      stats.skippedOutOfState += 1
      continue
    }

    const city = pick(row, map.city)
    const countyResolution = resolveCaCounty({ county: pick(row, map.county), city })
    if (countyResolution.via === 'county') stats.countyFromSource += 1
    else if (countyResolution.via === 'city') stats.countyFromCity += 1
    else if (countyResolution.via === 'ambiguous') stats.countyAmbiguous += 1
    else stats.countyUnresolved += 1

    const firmName = pick(row, map.firmName)
    const email = pick(row, map.email)
    const website = pick(row, map.website)

    if (firmName) stats.withFirm += 1
    if (email) stats.withEmail += 1
    if (website) stats.withWebsite += 1

    const practiceAreaLabels = parsePracticeAreaText(pick(row, map.practiceAreas))
    if (practiceAreaLabels.length > 0) {
      stats.withPracticeArea += 1
      const normalized = normalizePracticeAreas(practiceAreaLabels)
      for (const label of normalized.unmatchedLabels) {
        unmatchedPracticeAreas.set(label, (unmatchedPracticeAreas.get(label) ?? 0) + 1)
      }
    }

    if (!args.dryRun) {
      batch.push({
        source: args.source,
        dedupeHash: buildAttorneyDedupeHash({ barNumber }),
        externalId: barNumber,
        barNumber,
        barState: 'CA',
        name,
        firmName,
        email,
        phone: pick(row, map.phone),
        website,
        street: pick(row, map.street),
        city,
        state,
        zip: pick(row, map.zip),
        county: countyResolution.county,
        countySource: countyResolution.via,
        licenseStatus,
        practiceAreas: practiceAreaLabels.length > 0 ? JSON.stringify(practiceAreaLabels) : null,
        rawPayload: JSON.stringify(row),
      })

      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch, stats)
        process.stdout.write(`\r  staged ${stats.staged}...`)
      }
    }

    if (args.limit && stats.rows >= args.limit) break
  }

  if (args.inspect) {
    console.log('\nSample rows:\n')
    for (const sample of samples) console.log(JSON.stringify(sample, null, 2))
    await prisma.$disconnect().catch(() => undefined)
    return
  }

  await flushBatch(batch, stats)
  if (stats.staged > 0) process.stdout.write('\r')

  const kept =
    stats.rows -
    stats.skippedNoBarNumber -
    stats.skippedNoName -
    stats.skippedStatus -
    stats.skippedOutOfState

  console.log(`\n${args.dryRun ? 'Dry run' : 'Import'} complete for ${args.file}\n`)
  console.log(`  rows read              ${stats.rows}`)
  console.log(`  eligible               ${kept}`)
  if (!args.dryRun) console.log(`  staged (upserted)      ${stats.staged}`)
  console.log(`  unique bar numbers     ${seenBarNumbers.size}`)
  console.log('')
  console.log(`  skipped: no bar number ${stats.skippedNoBarNumber}`)
  console.log(`  skipped: no name       ${stats.skippedNoName}`)
  console.log(`  skipped: not active    ${stats.skippedStatus}`)
  console.log(`  skipped: out of state  ${stats.skippedOutOfState}`)
  console.log(`  duplicate bar numbers  ${stats.duplicateBarNumbers}`)
  console.log('')
  console.log('  County resolution (routing depends on this):')
  console.log(`    from source column   ${stats.countyFromSource}`)
  console.log(`    derived from city    ${stats.countyFromCity}`)
  console.log(`    ambiguous city name  ${stats.countyAmbiguous}`)
  console.log(`    unresolved           ${stats.countyUnresolved}`)
  console.log('')
  console.log('  Coverage of enrichment fields:')
  console.log(`    firm name            ${stats.withFirm}`)
  console.log(`    email                ${stats.withEmail}`)
  console.log(`    website              ${stats.withWebsite}`)
  console.log(`    practice area        ${stats.withPracticeArea}`)

  if (unmatchedPracticeAreas.size > 0) {
    const top = Array.from(unmatchedPracticeAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
    console.log('\n  Practice-area labels that matched no incident type (top 20):')
    for (const [label, count] of top) console.log(`    ${String(count).padStart(6)}  ${label}`)
    console.log('  Add patterns to practice-area-normalize.ts for any that matter.')
  }

  const withoutCounty = stats.countyUnresolved + stats.countyAmbiguous
  if (withoutCounty > 0) {
    console.log(
      `\n  ${withoutCounty} row(s) have no county. Promoting these makes them ` +
        'look statewide, so resolve the cities or promote with PROMOTE_REQUIRE_COUNTY=true.'
    )
  }

  console.log('\nNothing was written to the live Attorney table. Review staging, then run:')
  console.log('  PROMOTE_SOURCE=' + args.source + ' PROMOTE_STATUS=reviewed \\')
  console.log('    node ../node_modules/tsx/dist/cli.mjs scripts/promote-production-attorneys.ts')

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
