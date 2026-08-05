/**
 * Import California State Bar attorney data from CPRA CSV files into
 * the `production_attorneys` staging table.
 *
 * Expects the Excel files to have been converted to CSV first:
 *   python scripts/xlsx-to-csv.py "<directory>"
 *
 * The CPRA response comes as five files:
 *   1. all_attys_*.csv           — Main attorney roster
 *   2. atty_practicearea_*.csv   — Practice areas per attorney
 *   3. atty_specialties_*.csv    — Board-certified specialties
 *   4. cla_sections_*.csv        — CLA section memberships
 *   5. discipline_*.csv          — Disciplinary history
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-cpra-csv.ts \
 *     --dir "C:\Business\ClearCaseIQ Inc\Legal\Attoney Data" --dry-run
 *
 *   node ../node_modules/tsx/dist/cli.mjs scripts/import-cpra-csv.ts \
 *     --dir "C:\Business\ClearCaseIQ Inc\Legal\Attoney Data"
 *
 * Flags:
 *   --dir <path>        Directory containing the CSV files (required).
 *   --dry-run           Parse and report without writing to DB.
 *   --limit <n>         Stop after n attorney rows.
 *   --source <name>     Source label (default "cpra-ca-bar-2026").
 *   --all-statuses      Import every licence status, not just active ones.
 *   --pi-only           Only import PI-relevant attorneys.
 */

import '../src/env'
import { createReadStream, readdirSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse'
import { prisma } from '../src/lib/prisma'
import { buildAttorneyDedupeHash, normalizeBarNumber } from '../src/lib/attorney-identity'
import { resolveCaCounty } from '../src/lib/ca-counties'

/* ── CLI ─────────────────────────────────────────────────────────── */

type Args = {
  dir: string
  dryRun: boolean
  limit: number | null
  source: string
  allStatuses: boolean
  piOnly: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dir: '', dryRun: false, limit: null,
    source: 'cpra-ca-bar-2026', allStatuses: false, piOnly: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dir': args.dir = next() ?? ''; break
      case '--dry-run': args.dryRun = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) && v > 0 ? Math.floor(v) : null; break }
      case '--source': args.source = next() ?? args.source; break
      case '--all-statuses': args.allStatuses = true; break
      case '--pi-only': args.piOnly = true; break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  if (!args.dir) throw new Error('--dir <path> is required')
  return args
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function findCsv(dir: string, pattern: RegExp): string | null {
  const files = readdirSync(dir)
  return files.find((f) => f.endsWith('.csv') && pattern.test(f)) ?? null
}

async function loadCsvMap(
  filePath: string,
  barColPattern: RegExp,
  valueColPattern: RegExp,
  label: string,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  let barCol: string | null = null
  let valCol: string | null = null
  let count = 0

  const stream = createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true })
  )

  for await (const row of stream) {
    const r = row as Record<string, string>
    if (!barCol) {
      const headers = Object.keys(r)
      barCol = headers.find((h) => barColPattern.test(h)) ?? headers[0]
      valCol = headers.find((h) => valueColPattern.test(h)) ?? headers[1]
      console.log(`  ${label}: barCol="${barCol}", valCol="${valCol}"`)
    }
    const bn = normalizeBarNumber(r[barCol!])
    const val = String(r[valCol!] ?? '').trim()
    if (bn && val) {
      const existing = map.get(bn) ?? []
      existing.push(val)
      map.set(bn, existing)
    }
    count += 1
    if (count % 100000 === 0) process.stdout.write(`\r  ${label}: ${count} rows...`)
  }

  console.log(`  ${label}: ${count} rows -> ${map.size} unique attorneys`)
  return map
}

async function loadDisciplineMap(
  filePath: string,
): Promise<Map<string, object[]>> {
  const map = new Map<string, object[]>()
  let barCol: string | null = null
  let count = 0

  const stream = createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true })
  )

  for await (const row of stream) {
    const r = row as Record<string, string>
    if (!barCol) {
      const headers = Object.keys(r)
      barCol = headers.find((h) => /lic|bar|number/i.test(h)) ?? headers[0]
      console.log(`  Discipline: barCol="${barCol}"`)
    }
    const bn = normalizeBarNumber(r[barCol!])
    if (bn) {
      const existing = map.get(bn) ?? []
      const record: Record<string, string> = {}
      for (const [k, v] of Object.entries(r)) {
        if (k !== barCol) record[k] = String(v ?? '').trim()
      }
      existing.push(record)
      map.set(bn, existing)
    }
    count += 1
  }

  console.log(`  Discipline: ${count} rows -> ${map.size} unique attorneys`)
  return map
}

/* ── PI relevance ────────────────────────────────────────────────── */

const PI_KEYWORDS = [
  'personal injury', 'tort', 'insurance', 'medical malpractice',
  'product liability', 'wrongful death', 'negligence', 'automobile',
  'motor vehicle', 'workers compensation', 'worker', 'premises liability',
  'slip and fall', 'accident', 'catastrophic', 'brain injury', 'spinal',
  'dog bite', 'animal', 'aviation', 'maritime', 'nursing home',
  'elder abuse', 'construction', 'defect', 'injury', 'trial',
  'litigation', 'plaintiff',
]

function isPiRelevant(practiceAreas: string[], specialties: string[]): boolean {
  const text = [...practiceAreas, ...specialties].map((s) => s.toLowerCase()).join(' ')
  return PI_KEYWORDS.some((kw) => text.includes(kw))
}

const ACTIVE_STATUS = /^(a|active|active member|admitted|eligible|good standing)/i

/* ── Phone formatter ─────────────────────────────────────────────── */

function formatPhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length < 7 || digits === '0') return null
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return digits
}

function parseExcelDate(value: string | null): Date | null {
  if (!value) return null
  const num = Number(value)
  if (Number.isFinite(num) && num > 1000 && num < 100000) {
    const epoch = new Date(1899, 11, 30)
    const d = new Date(epoch.getTime() + num * 86400000)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/* ── Main ────────────────────────────────────────────────────────── */

const BATCH_SIZE = 50

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dir = args.dir

  const mainFile = findCsv(dir, /all_att/i)
  const paFile = findCsv(dir, /practicearea/i)
  const specFile = findCsv(dir, /specialt/i)
  const claFile = findCsv(dir, /cla_section/i)
  const discFile = findCsv(dir, /discipline/i)

  if (!mainFile) throw new Error(`No main attorney CSV found in ${dir}. Run xlsx-to-csv.py first.`)

  console.log('CSV files found:')
  console.log(`  Main:       ${mainFile}`)
  console.log(`  Practice:   ${paFile ?? '(not found)'}`)
  console.log(`  Specialty:  ${specFile ?? '(not found)'}`)
  console.log(`  CLA:        ${claFile ?? '(not found)'}`)
  console.log(`  Discipline: ${discFile ?? '(not found)'}`)
  console.log()

  // ── Load side tables into memory maps ─────────────────────
  console.log('Loading side tables...')
  const practiceAreaMap = paFile
    ? await loadCsvMap(join(dir, paFile), /lic|bar|number/i, /area|practice|description/i, 'Practice areas')
    : new Map<string, string[]>()
  const specialtyMap = specFile
    ? await loadCsvMap(join(dir, specFile), /lic|bar|number/i, /specialty|special|description|cert/i, 'Specialties')
    : new Map<string, string[]>()
  const claSectionMap = claFile
    ? await loadCsvMap(join(dir, claFile), /lic|bar|number/i, /section|description|name/i, 'CLA sections')
    : new Map<string, string[]>()
  const disciplineMap = discFile
    ? await loadDisciplineMap(join(dir, discFile))
    : new Map<string, object[]>()

  console.log()

  // ── Stream main roster ────────────────────────────────────
  console.log('Processing main roster...')

  const stats = {
    total: 0, eligible: 0, staged: 0,
    skippedNoBar: 0, skippedNoName: 0, skippedStatus: 0, skippedNotPi: 0,
    withPa: 0, withSpec: 0, withCla: 0, withDisc: 0,
    withEmail: 0, withFirm: 0, withPhone: 0, piCount: 0,
    countySource: 0, countyCity: 0, countyNone: 0,
  }

  type UpsertOp = Parameters<typeof prisma.productionAttorney.upsert>[0]
  const batch: UpsertOp[] = []

  let barCol: string | null = null
  let nameCol: string | null = null
  let firstNameCol: string | null = null
  let lastNameCol: string | null = null
  let statusCol: string | null = null
  let emailCol: string | null = null
  let phoneCol: string | null = null
  let firmCol: string | null = null
  let streetCol: string | null = null
  let cityCol: string | null = null
  let stateCol: string | null = null
  let zipCol: string | null = null
  let countyCol: string | null = null
  let lawSchoolCol: string | null = null
  let admDateCol: string | null = null
  let districtCol: string | null = null

  const mainStream = createReadStream(join(dir, mainFile)).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true })
  )

  for await (const record of mainStream) {
    const row = record as Record<string, string>

    if (!barCol) {
      const h = Object.keys(row)
      barCol = h.find((c) => /bar.*num|lic.*num|^number$/i.test(c)) ?? h[0]
      nameCol = h.find((c) => /^name$/i.test(c)) ?? null
      firstNameCol = h.find((c) => /first/i.test(c)) ?? null
      lastNameCol = h.find((c) => /last/i.test(c)) ?? null
      statusCol = h.find((c) => /^status$/i.test(c)) ?? null
      emailCol = h.find((c) => /email/i.test(c)) ?? null
      phoneCol = h.find((c) => /^phone$/i.test(c)) ?? null
      firmCol = h.find((c) => /firm|employer/i.test(c)) ?? null
      streetCol = h.find((c) => /address1|street/i.test(c)) ?? null
      cityCol = h.find((c) => /^city$/i.test(c)) ?? null
      stateCol = h.find((c) => /^state$/i.test(c)) ?? null
      zipCol = h.find((c) => /zip/i.test(c)) ?? null
      countyCol = h.find((c) => /county/i.test(c)) ?? null
      lawSchoolCol = h.find((c) => /law.*school|^school$/i.test(c)) ?? null
      admDateCol = h.find((c) => /admis|date of/i.test(c)) ?? null
      districtCol = h.find((c) => /district/i.test(c)) ?? null

      console.log('Column mapping:')
      const mapping: Record<string, string | null> = {
        barNumber: barCol, name: nameCol, firstName: firstNameCol, lastName: lastNameCol,
        status: statusCol, email: emailCol, phone: phoneCol, firm: firmCol,
        street: streetCol, city: cityCol, state: stateCol, zip: zipCol,
        county: countyCol, lawSchool: lawSchoolCol, admDate: admDateCol, district: districtCol,
      }
      for (const [k, v] of Object.entries(mapping)) console.log(`  ${k.padEnd(12)} -> ${v ?? '(none)'}`)
      console.log()
    }

    stats.total += 1
    if (stats.total % 50000 === 0) process.stdout.write(`\r  processed ${stats.total}...`)

    const pick = (col: string | null) => {
      if (!col) return null
      const v = String(row[col] ?? '').trim()
      return v.length > 0 ? v : null
    }

    const barNumber = normalizeBarNumber(pick(barCol))
    if (!barNumber) { stats.skippedNoBar += 1; continue }

    // Resolve name
    let name: string | null = null
    const fullName = pick(nameCol)
    if (fullName) {
      const comma = fullName.indexOf(',')
      if (comma > 0) {
        const last = fullName.slice(0, comma).trim()
        const rest = fullName.slice(comma + 1).trim()
        name = last && rest ? `${rest} ${last}` : fullName
      } else {
        name = fullName
      }
    } else {
      const parts = [pick(firstNameCol), pick(lastNameCol)].filter(Boolean).join(' ').trim()
      name = parts || null
    }
    if (!name) { stats.skippedNoName += 1; continue }

    const licenseStatus = pick(statusCol)
    if (!args.allStatuses && licenseStatus && !ACTIVE_STATUS.test(licenseStatus)) {
      stats.skippedStatus += 1
      continue
    }

    const practiceAreas = practiceAreaMap.get(barNumber) ?? []
    const specialties = specialtyMap.get(barNumber) ?? []
    const claSections = claSectionMap.get(barNumber) ?? []
    const discipline = disciplineMap.get(barNumber) ?? []

    if (practiceAreas.length > 0) stats.withPa += 1
    if (specialties.length > 0) stats.withSpec += 1
    if (claSections.length > 0) stats.withCla += 1
    if (discipline.length > 0) stats.withDisc += 1

    const piRelevant = isPiRelevant(practiceAreas, specialties)
    if (piRelevant) stats.piCount += 1
    if (args.piOnly && !piRelevant) { stats.skippedNotPi += 1; continue }

    const firmName = pick(firmCol)
    const email = pick(emailCol)
    const phone = formatPhone(pick(phoneCol))
    if (email) stats.withEmail += 1
    if (firmName) stats.withFirm += 1
    if (phone) stats.withPhone += 1

    const city = pick(cityCol)
    const state = (pick(stateCol) ?? 'CA').toUpperCase()
    const cr = resolveCaCounty({ county: pick(countyCol), city })
    if (cr.via === 'county') stats.countySource += 1
    else if (cr.via === 'city') stats.countyCity += 1
    else stats.countyNone += 1

    const dedupeHash = buildAttorneyDedupeHash({ barNumber })
    const dateOfAdmission = parseExcelDate(pick(admDateCol))
    const districtRaw = pick(districtCol)
    const district = districtRaw ? parseInt(districtRaw, 10) : null

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
      street: pick(streetCol),
      city,
      state,
      zip: pick(zipCol),
      county: cr.county,
      countySource: cr.via,
      licenseStatus,
      practiceAreas: practiceAreas.length > 0 ? JSON.stringify(practiceAreas) : null,
      specialties: specialties.length > 0 ? JSON.stringify(specialties) : null,
      claSections: claSections.length > 0 ? JSON.stringify(claSections) : null,
      discipline: discipline.length > 0 ? JSON.stringify(discipline) : null,
      lawSchool: pick(lawSchoolCol),
      dateOfAdmission,
      district: Number.isFinite(district) ? district : null,
      piRelevant,
      rawPayload: JSON.stringify(row),
    }

    if (!args.dryRun) {
      batch.push({
        where: { source_dedupeHash: { source: data.source, dedupeHash: data.dedupeHash } },
        create: { ...data, status: 'scraped' },
        update: {
          name: data.name, firmName: data.firmName, email: data.email, phone: data.phone,
          street: data.street, city: data.city, state: data.state, zip: data.zip,
          county: data.county, countySource: data.countySource, licenseStatus: data.licenseStatus,
          practiceAreas: data.practiceAreas, specialties: data.specialties,
          claSections: data.claSections, discipline: data.discipline,
          lawSchool: data.lawSchool, dateOfAdmission: data.dateOfAdmission,
          district: data.district, piRelevant: data.piRelevant,
          barNumber: data.barNumber, barState: data.barState, rawPayload: data.rawPayload,
        },
      })

      if (batch.length >= BATCH_SIZE) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await prisma.$transaction(batch.map((op) => prisma.productionAttorney.upsert(op)), { timeout: 30000 })
            break
          } catch (err: any) {
            if (attempt === 2) throw err
            console.warn(`\n  Batch retry ${attempt + 1} at row ${stats.total}: ${err.message?.slice(0, 80)}`)
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
        stats.staged += batch.length
        batch.length = 0
        if (stats.staged % 2000 === 0) process.stdout.write(`\r  staged ${stats.staged}...`)
      }
    }

    stats.eligible += 1
    if (args.limit && stats.eligible >= args.limit) break
  }

  // Flush
  if (!args.dryRun && batch.length > 0) {
    await prisma.$transaction(batch.map((op) => prisma.productionAttorney.upsert(op)))
    stats.staged += batch.length
    batch.length = 0
  }

  if (stats.staged > 0) process.stdout.write('\r')

  // ── Report ────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`${args.dryRun ? 'DRY RUN' : 'IMPORT'} COMPLETE — CPRA CA State Bar`)
  console.log(`${'═'.repeat(55)}\n`)

  console.log(`  Total rows               ${stats.total}`)
  console.log(`  Eligible (after filters) ${stats.eligible}`)
  if (!args.dryRun) console.log(`  Staged (upserted to DB)  ${stats.staged}`)
  console.log()
  console.log('  Skipped:')
  console.log(`    No bar number          ${stats.skippedNoBar}`)
  console.log(`    No name                ${stats.skippedNoName}`)
  console.log(`    Inactive status        ${stats.skippedStatus}`)
  if (args.piOnly) console.log(`    Not PI-relevant        ${stats.skippedNotPi}`)
  console.log()
  console.log('  Side-table coverage:')
  console.log(`    Practice areas         ${stats.withPa}`)
  console.log(`    Specialties            ${stats.withSpec}`)
  console.log(`    CLA sections           ${stats.withCla}`)
  console.log(`    Discipline records     ${stats.withDisc}`)
  console.log()
  console.log('  Field coverage:')
  console.log(`    Email                  ${stats.withEmail}`)
  console.log(`    Firm                   ${stats.withFirm}`)
  console.log(`    Phone                  ${stats.withPhone}`)
  console.log()
  console.log(`  PI-relevant              ${stats.piCount}`)
  console.log()
  console.log('  County resolution:')
  console.log(`    From source            ${stats.countySource}`)
  console.log(`    Derived from city      ${stats.countyCity}`)
  console.log(`    Unresolved             ${stats.countyNone}`)

  if (!args.dryRun) {
    console.log('\nStaged in production_attorneys. Nothing written to live Attorney table.')
    console.log(`\nTo query PI attorneys:\n  SELECT COUNT(*) FROM production_attorneys WHERE source='${args.source}' AND "piRelevant"=true;`)
  }

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
