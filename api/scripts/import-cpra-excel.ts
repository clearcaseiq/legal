/**
 * Import California State Bar attorney data from CPRA Excel files into
 * the `production_attorneys` staging table.
 *
 * The CPRA response comes as five separate `.xlsx` files:
 *   1. all_attys_2026-7.xlsx        — Main attorney roster
 *   2. atty_practicearea_2026-7.xlsx — Practice areas per attorney
 *   3. atty_specialties_2026-7.xlsx  — Board-certified specialties
 *   4. cla_sections_2026-7.xlsx      — CLA section memberships
 *   5. discipline_2026-7.xlsx        — Disciplinary history
 *
 * The script joins the four side-tables onto the main roster by
 * license/bar number, then upserts into `production_attorneys` keyed on
 * (source, dedupeHash). Practice areas, specialties, CLA sections, and
 * discipline records are stored as JSON arrays in their respective columns.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-cpra-excel.ts \
 *     --dir "C:\Business\ClearCaseIQ Inc\Legal\Attoney Data" --inspect
 *
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-cpra-excel.ts \
 *     --dir "C:\Business\ClearCaseIQ Inc\Legal\Attoney Data" --dry-run
 *
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-cpra-excel.ts \
 *     --dir "C:\Business\ClearCaseIQ Inc\Legal\Attoney Data"
 *
 * Flags:
 *   --dir <path>        Directory containing the 5 xlsx files (required).
 *   --inspect           Print headers, sample rows, and stats then exit.
 *   --dry-run           Parse and report without writing to DB.
 *   --limit <n>         Stop after n attorney rows. Useful for a first pass.
 *   --source <name>     Source label (default "cpra-ca-bar-2026").
 *   --all-statuses      Import every licence status, not just active ones.
 *   --pi-only           Only import attorneys whose practice areas or
 *                        specialties indicate personal injury.
 */

import '../src/env'
import { join } from 'path'
import { existsSync } from 'fs'
import * as XLSX from 'xlsx'
import { prisma } from '../src/lib/prisma'
import { buildAttorneyDedupeHash, normalizeBarNumber } from '../src/lib/attorney-identity'
import { resolveCaCounty } from '../src/lib/ca-counties'

/* ── CLI Arg Parsing ─────────────────────────────────────────────── */

type Args = {
  dir: string
  inspect: boolean
  dryRun: boolean
  limit: number | null
  source: string
  allStatuses: boolean
  piOnly: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dir: '',
    inspect: false,
    dryRun: false,
    limit: null,
    source: 'cpra-ca-bar-2026',
    allStatuses: false,
    piOnly: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dir':
        args.dir = next() ?? ''
        break
      case '--inspect':
        args.inspect = true
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--limit': {
        const v = Number(next())
        args.limit = Number.isFinite(v) && v > 0 ? Math.floor(v) : null
        break
      }
      case '--source':
        args.source = next() ?? args.source
        break
      case '--all-statuses':
        args.allStatuses = true
        break
      case '--pi-only':
        args.piOnly = true
        break
      default:
        if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }

  if (!args.dir) throw new Error('--dir <path> is required')
  return args
}

/* ── Excel File Reading ──────────────────────────────────────────── */

function findFile(dir: string, pattern: RegExp): string | null {
  const files = require('fs').readdirSync(dir) as string[]
  return files.find((f: string) => pattern.test(f)) ?? null
}

function readExcel(filePath: string): Record<string, string>[] {
  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  return XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], { defval: '' })
}

/**
 * Normalise a column header so different spacings/casings match the same key.
 */
function hk(v: string): string {
  return String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
}

/* ── Practice-area PI relevance ──────────────────────────────────── */

const PI_PRACTICE_KEYWORDS = [
  'personal injury',
  'tort',
  'insurance',
  'medical malpractice',
  'product liability',
  'wrongful death',
  'negligence',
  'automobile',
  'motor vehicle',
  'workers compensation',
  'worker',
  'premises liability',
  'slip and fall',
  'accident',
  'catastrophic',
  'brain injury',
  'spinal',
  'dog bite',
  'animal',
  'aviation',
  'maritime',
  'nursing home',
  'elder abuse',
  'construction',
  'defect',
  'injury',
  'trial',
  'litigation',
  'plaintiff',
]

const PI_SPECIALTY_KEYWORDS = [
  'legal malpractice',
  'appellate',
  'workers compensation',
  'worker',
]

function isPiRelevant(practiceAreas: string[], specialties: string[]): boolean {
  const allText = [...practiceAreas, ...specialties].map((s) => s.toLowerCase()).join(' ')
  return PI_PRACTICE_KEYWORDS.some((kw) => allText.includes(kw))
}

/* ── Licence status filter ───────────────────────────────────────── */

const ACTIVE_STATUS = /^(a|active|active member|admitted|eligible|good standing)/i

/* ── Main import logic ───────────────────────────────────────────── */

type Stats = {
  totalAttorneys: number
  eligible: number
  staged: number
  skippedNoBarNumber: number
  skippedNoName: number
  skippedStatus: number
  skippedNotPi: number
  withPracticeArea: number
  withSpecialty: number
  withClaSection: number
  withDiscipline: number
  withEmail: number
  withFirm: number
  withPhone: number
  piRelevantCount: number
  countyFromSource: number
  countyFromCity: number
  countyUnresolved: number
}

function emptyStats(): Stats {
  return {
    totalAttorneys: 0, eligible: 0, staged: 0,
    skippedNoBarNumber: 0, skippedNoName: 0, skippedStatus: 0, skippedNotPi: 0,
    withPracticeArea: 0, withSpecialty: 0, withClaSection: 0, withDiscipline: 0,
    withEmail: 0, withFirm: 0, withPhone: 0, piRelevantCount: 0,
    countyFromSource: 0, countyFromCity: 0, countyUnresolved: 0,
  }
}

const BATCH_SIZE = 200

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dir = args.dir

  // ── Locate files ──────────────────────────────────────────
  const mainFile = findFile(dir, /all_att/i)
  const paFile = findFile(dir, /practicearea/i)
  const specFile = findFile(dir, /specialt/i)
  const claFile = findFile(dir, /cla_section/i)
  const discFile = findFile(dir, /discipline/i)

  if (!mainFile) throw new Error(`Could not find main attorney file (all_attys*.xlsx) in ${dir}`)

  console.log('Files found:')
  console.log(`  Main roster:    ${mainFile}`)
  console.log(`  Practice areas: ${paFile ?? '(not found)'}`)
  console.log(`  Specialties:    ${specFile ?? '(not found)'}`)
  console.log(`  CLA sections:   ${claFile ?? '(not found)'}`)
  console.log(`  Discipline:     ${discFile ?? '(not found)'}`)
  console.log()

  // ── Read main roster ──────────────────────────────────────
  console.log('Reading main roster...')
  const mainRows = readExcel(join(dir, mainFile))
  console.log(`  ${mainRows.length} rows`)

  if (args.inspect && mainRows.length > 0) {
    const headers = Object.keys(mainRows[0])
    console.log(`\nMain file columns (${headers.length}):`)
    for (const h of headers) console.log(`  ${h}`)
    console.log('\nSample rows:')
    for (const row of mainRows.slice(0, 3)) console.log(JSON.stringify(row, null, 2))
  }

  // ── Build side-table lookups (bar number -> array of entries) ──
  const practiceAreaMap = new Map<string, string[]>()
  if (paFile) {
    console.log('Reading practice areas...')
    const paRows = readExcel(join(dir, paFile))
    console.log(`  ${paRows.length} rows`)
    if (args.inspect && paRows.length > 0) {
      console.log(`  Columns: ${Object.keys(paRows[0]).join(', ')}`)
      console.log(`  Sample: ${JSON.stringify(paRows[0])}`)
    }
    for (const row of paRows) {
      const headers = Object.keys(row)
      const barCol = headers.find((h) => /lic|bar|number/i.test(h)) ?? headers[0]
      const areaCol = headers.find((h) => /area|practice|description/i.test(h)) ?? headers[1]
      const bn = normalizeBarNumber(row[barCol])
      const area = String(row[areaCol] ?? '').trim()
      if (bn && area) {
        const existing = practiceAreaMap.get(bn) ?? []
        existing.push(area)
        practiceAreaMap.set(bn, existing)
      }
    }
    console.log(`  Mapped ${practiceAreaMap.size} unique attorneys with practice areas`)
  }

  const specialtyMap = new Map<string, string[]>()
  if (specFile) {
    console.log('Reading specialties...')
    const specRows = readExcel(join(dir, specFile))
    console.log(`  ${specRows.length} rows`)
    if (args.inspect && specRows.length > 0) {
      console.log(`  Columns: ${Object.keys(specRows[0]).join(', ')}`)
      console.log(`  Sample: ${JSON.stringify(specRows[0])}`)
    }
    for (const row of specRows) {
      const headers = Object.keys(row)
      const barCol = headers.find((h) => /lic|bar|number/i.test(h)) ?? headers[0]
      const specCol = headers.find((h) => /specialty|special|description|cert/i.test(h)) ?? headers[1]
      const bn = normalizeBarNumber(row[barCol])
      const spec = String(row[specCol] ?? '').trim()
      if (bn && spec) {
        const existing = specialtyMap.get(bn) ?? []
        existing.push(spec)
        specialtyMap.set(bn, existing)
      }
    }
    console.log(`  Mapped ${specialtyMap.size} unique attorneys with specialties`)
  }

  const claSectionMap = new Map<string, string[]>()
  if (claFile) {
    console.log('Reading CLA sections...')
    const claRows = readExcel(join(dir, claFile))
    console.log(`  ${claRows.length} rows`)
    if (args.inspect && claRows.length > 0) {
      console.log(`  Columns: ${Object.keys(claRows[0]).join(', ')}`)
      console.log(`  Sample: ${JSON.stringify(claRows[0])}`)
    }
    for (const row of claRows) {
      const headers = Object.keys(row)
      const barCol = headers.find((h) => /lic|bar|number/i.test(h)) ?? headers[0]
      const secCol = headers.find((h) => /section|description|name/i.test(h)) ?? headers[1]
      const bn = normalizeBarNumber(row[barCol])
      const sec = String(row[secCol] ?? '').trim()
      if (bn && sec) {
        const existing = claSectionMap.get(bn) ?? []
        existing.push(sec)
        claSectionMap.set(bn, existing)
      }
    }
    console.log(`  Mapped ${claSectionMap.size} unique attorneys with CLA sections`)
  }

  const disciplineMap = new Map<string, object[]>()
  if (discFile) {
    console.log('Reading discipline records...')
    const discRows = readExcel(join(dir, discFile))
    console.log(`  ${discRows.length} rows`)
    if (args.inspect && discRows.length > 0) {
      console.log(`  Columns: ${Object.keys(discRows[0]).join(', ')}`)
      console.log(`  Sample: ${JSON.stringify(discRows[0])}`)
    }
    for (const row of discRows) {
      const headers = Object.keys(row)
      const barCol = headers.find((h) => /lic|bar|number/i.test(h)) ?? headers[0]
      const bn = normalizeBarNumber(row[barCol])
      if (bn) {
        const existing = disciplineMap.get(bn) ?? []
        const record: Record<string, string> = {}
        for (const h of headers) {
          if (h !== barCol) record[h] = String(row[h] ?? '').trim()
        }
        existing.push(record)
        disciplineMap.set(bn, existing)
      }
    }
    console.log(`  Mapped ${disciplineMap.size} unique attorneys with discipline records`)
  }

  if (args.inspect) {
    console.log('\n── Summary ──')
    console.log(`  Total attorneys in main file: ${mainRows.length}`)
    console.log(`  With practice areas:          ${practiceAreaMap.size}`)
    console.log(`  With specialties:             ${specialtyMap.size}`)
    console.log(`  With CLA sections:            ${claSectionMap.size}`)
    console.log(`  With discipline records:       ${disciplineMap.size}`)
    await prisma.$disconnect().catch(() => undefined)
    return
  }

  // ── Process main roster and merge side-tables ─────────────
  console.log('\nProcessing attorneys...')
  const stats = emptyStats()
  const batch: Parameters<typeof prisma.productionAttorney.upsert>[0][] = []

  // Detect column names in main file
  const sampleRow = mainRows[0]
  if (!sampleRow) throw new Error('Main file has no data rows')
  const mainHeaders = Object.keys(sampleRow)

  const col = {
    barNumber: mainHeaders.find((h) => /lic.*num|bar.*num|number/i.test(h)) ?? mainHeaders[0],
    name: mainHeaders.find((h) => /^name$/i.test(h)),
    firstName: mainHeaders.find((h) => /first/i.test(h)),
    lastName: mainHeaders.find((h) => /last/i.test(h)),
    middleName: mainHeaders.find((h) => /middle/i.test(h)),
    firmName: mainHeaders.find((h) => /firm|employer|company/i.test(h)),
    email: mainHeaders.find((h) => /email/i.test(h)),
    phone: mainHeaders.find((h) => /phone|tele/i.test(h)),
    fax: mainHeaders.find((h) => /fax/i.test(h)),
    street: mainHeaders.find((h) => /address|street/i.test(h)),
    city: mainHeaders.find((h) => /city/i.test(h)),
    state: mainHeaders.find((h) => /state/i.test(h)),
    zip: mainHeaders.find((h) => /zip|postal/i.test(h)),
    county: mainHeaders.find((h) => /county/i.test(h)),
    status: mainHeaders.find((h) => /^status$/i.test(h)),
    lawSchool: mainHeaders.find((h) => /law.*school|^school$/i.test(h)),
    admissionDate: mainHeaders.find((h) => /admis|admit|date of/i.test(h)),
    district: mainHeaders.find((h) => /district/i.test(h)),
  }

  console.log('Column mapping:')
  for (const [field, column] of Object.entries(col)) {
    console.log(`  ${field.padEnd(15)} -> ${column ?? '(not found)'}`)
  }
  console.log()

  function pick(row: Record<string, string>, column: string | undefined): string | null {
    if (!column) return null
    const v = row[column]
    if (v === undefined || v === null) return null
    const trimmed = String(v).trim()
    return trimmed.length > 0 ? trimmed : null
  }

  function resolveName(row: Record<string, string>): string | null {
    const full = pick(row, col.name)
    if (full) {
      const comma = full.indexOf(',')
      if (comma > 0) {
        const last = full.slice(0, comma).trim()
        const rest = full.slice(comma + 1).trim()
        if (last && rest) return `${rest} ${last}`
      }
      return full
    }
    const parts = [pick(row, col.firstName), pick(row, col.middleName), pick(row, col.lastName)]
      .filter(Boolean)
      .join(' ')
      .trim()
    return parts.length > 0 ? parts : null
  }

  function parseDate(value: string | null): Date | null {
    if (!value) return null
    const num = Number(value)
    if (Number.isFinite(num) && num > 1000 && num < 100000) {
      // Excel serial number: days since 1899-12-30
      const excelEpoch = new Date(1899, 11, 30)
      const d = new Date(excelEpoch.getTime() + num * 86400000)
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }

  function formatPhone(raw: string | null): string | null {
    if (!raw) return null
    const digits = String(raw).replace(/\D/g, '')
    if (digits.length < 7 || digits === '0') return null
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return digits
  }

  for (const row of mainRows) {
    stats.totalAttorneys += 1

    const barNumber = normalizeBarNumber(pick(row, col.barNumber))
    if (!barNumber) { stats.skippedNoBarNumber += 1; continue }

    const name = resolveName(row)
    if (!name) { stats.skippedNoName += 1; continue }

    const licenseStatus = pick(row, col.status)
    if (!args.allStatuses && licenseStatus && !ACTIVE_STATUS.test(licenseStatus)) {
      stats.skippedStatus += 1
      continue
    }

    // Merge side-table data
    const practiceAreas = practiceAreaMap.get(barNumber) ?? []
    const specialties = specialtyMap.get(barNumber) ?? []
    const claSections = claSectionMap.get(barNumber) ?? []
    const discipline = disciplineMap.get(barNumber) ?? []

    if (practiceAreas.length > 0) stats.withPracticeArea += 1
    if (specialties.length > 0) stats.withSpecialty += 1
    if (claSections.length > 0) stats.withClaSection += 1
    if (discipline.length > 0) stats.withDiscipline += 1

    const piRelevant = isPiRelevant(practiceAreas, specialties)
    if (piRelevant) stats.piRelevantCount += 1

    if (args.piOnly && !piRelevant) {
      stats.skippedNotPi += 1
      continue
    }

    const firmName = pick(row, col.firmName)
    const email = pick(row, col.email)
    const phone = formatPhone(pick(row, col.phone))
    if (email) stats.withEmail += 1
    if (firmName) stats.withFirm += 1
    if (phone) stats.withPhone += 1

    const city = pick(row, col.city)
    const state = (pick(row, col.state) ?? 'CA').toUpperCase()
    const countyResolution = resolveCaCounty({ county: pick(row, col.county), city })
    if (countyResolution.via === 'county') stats.countyFromSource += 1
    else if (countyResolution.via === 'city') stats.countyFromCity += 1
    else stats.countyUnresolved += 1

    const dedupeHash = buildAttorneyDedupeHash({ barNumber })
    const dateOfAdmission = parseDate(pick(row, col.admissionDate))
    const districtNum = pick(row, col.district) ? parseInt(pick(row, col.district)!, 10) : null

    const data = {
      source: args.source,
      dedupeHash,
      externalId: barNumber,
      barNumber,
      barState: 'CA',
      name,
      firmName,
      email,
      phone,
      website: null as string | null,
      street: pick(row, col.street),
      city,
      state,
      zip: pick(row, col.zip),
      county: countyResolution.county,
      countySource: countyResolution.via,
      licenseStatus,
      practiceAreas: practiceAreas.length > 0 ? JSON.stringify(practiceAreas) : null,
      specialties: specialties.length > 0 ? JSON.stringify(specialties) : null,
      claSections: claSections.length > 0 ? JSON.stringify(claSections) : null,
      discipline: discipline.length > 0 ? JSON.stringify(discipline) : null,
      lawSchool: pick(row, col.lawSchool),
      dateOfAdmission,
      district: Number.isFinite(districtNum) ? districtNum : null,
      piRelevant,
      rawPayload: JSON.stringify(row),
    }

    if (!args.dryRun) {
      batch.push({
        where: { source_dedupeHash: { source: data.source, dedupeHash: data.dedupeHash } },
        create: { ...data, status: 'scraped' },
        update: {
          name: data.name,
          firmName: data.firmName,
          email: data.email,
          phone: data.phone,
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          county: data.county,
          countySource: data.countySource,
          licenseStatus: data.licenseStatus,
          practiceAreas: data.practiceAreas,
          specialties: data.specialties,
          claSections: data.claSections,
          discipline: data.discipline,
          lawSchool: data.lawSchool,
          dateOfAdmission: data.dateOfAdmission,
          district: data.district,
          piRelevant: data.piRelevant,
          barNumber: data.barNumber,
          barState: data.barState,
          rawPayload: data.rawPayload,
        },
      })

      if (batch.length >= BATCH_SIZE) {
        await prisma.$transaction(
          batch.map((op) => prisma.productionAttorney.upsert(op))
        )
        stats.staged += batch.length
        batch.length = 0
        process.stdout.write(`\r  staged ${stats.staged}...`)
      }
    }

    stats.eligible += 1
    if (args.limit && stats.eligible >= args.limit) break
  }

  // Flush remaining
  if (!args.dryRun && batch.length > 0) {
    await prisma.$transaction(
      batch.map((op) => prisma.productionAttorney.upsert(op))
    )
    stats.staged += batch.length
    batch.length = 0
  }

  if (stats.staged > 0) process.stdout.write('\r')

  // ── Report ────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`${args.dryRun ? 'DRY RUN' : 'IMPORT'} COMPLETE — CPRA CA State Bar Data`)
  console.log(`${'═'.repeat(50)}\n`)

  console.log(`  Total rows in main file    ${stats.totalAttorneys}`)
  console.log(`  Eligible (after filters)   ${stats.eligible}`)
  if (!args.dryRun) console.log(`  Staged (upserted to DB)    ${stats.staged}`)
  console.log()

  console.log('  Skipped:')
  console.log(`    No bar number            ${stats.skippedNoBarNumber}`)
  console.log(`    No name                  ${stats.skippedNoName}`)
  console.log(`    Inactive status          ${stats.skippedStatus}`)
  if (args.piOnly) console.log(`    Not PI-relevant          ${stats.skippedNotPi}`)
  console.log()

  console.log('  Side-table coverage:')
  console.log(`    With practice areas      ${stats.withPracticeArea}`)
  console.log(`    With specialties         ${stats.withSpecialty}`)
  console.log(`    With CLA sections        ${stats.withClaSection}`)
  console.log(`    With discipline records  ${stats.withDiscipline}`)
  console.log()

  console.log('  Field coverage:')
  console.log(`    With email               ${stats.withEmail}`)
  console.log(`    With firm name           ${stats.withFirm}`)
  console.log(`    With phone               ${stats.withPhone}`)
  console.log()

  console.log(`  PI-relevant attorneys      ${stats.piRelevantCount}`)
  console.log()

  console.log('  County resolution:')
  console.log(`    From source column       ${stats.countyFromSource}`)
  console.log(`    Derived from city        ${stats.countyFromCity}`)
  console.log(`    Unresolved               ${stats.countyUnresolved}`)

  if (!args.dryRun) {
    console.log('\nData is staged in production_attorneys. Nothing was written to the live Attorney table.')
    console.log('To review PI-relevant attorneys:')
    console.log(`  SELECT * FROM production_attorneys WHERE source='${args.source}' AND "piRelevant"=true;`)
    console.log('\nTo promote reviewed attorneys, run:')
    console.log(`  PROMOTE_SOURCE=${args.source} PROMOTE_STATUS=reviewed \\`)
    console.log('    node ../node_modules/tsx/dist/cli.mjs scripts/promote-production-attorneys.ts')
  }

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
