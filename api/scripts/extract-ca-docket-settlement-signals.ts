import { createHash } from 'crypto'
import { readdir, readFile } from 'fs/promises'
import { join, relative, resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type JsonRecord = Record<string, unknown>

type CaseMetadata = {
  caseNumber: string
  caseName: string | null
  county: string | null
  court: string | null
  caseType: string | null
  category: string | null
  matterType: string | null
  caseOutcomeType: string | null
  status: string | null
  filingDate: string | null
  url: string | null
  raw: JsonRecord
}

type SettlementSignal = {
  signalId: string
  caseNumber: string
  sourcePath: string
  sourceUrl: string | null
  state: 'CA'
  county: string | null
  court: string | null
  caseName: string | null
  caseType: string | null
  matterType: string | null
  caseStatus: string | null
  caseOutcomeType: string | null
  filingDate: string | null
  signalDate: string | null
  signalType: string
  confidence: number
  eventDescription: string
  motionType: string | null
  settlementAmountText: string | null
  documentAvailable: boolean
  featuresJson: JsonRecord
  rawJson: JsonRecord
}

const DEFAULT_SOURCE_DIR = 'C:\\Business\\ClearCaseIQ Inc\\Legal\\Trellis'
const MONEY_RE = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+(?:\.\d+)?\s?(?:million|billion|k)\b/gi

const SIGNAL_RULES: Array<{ signalType: string; pattern: RegExp; confidence: number }> = [
  {
    signalType: 'good_faith_settlement',
    pattern: /\bgood faith settlement|determination of good faith settlement|ccp\s*877\.?6\b/i,
    confidence: 0.95,
  },
  {
    signalType: 'notice_of_settlement',
    pattern: /\bnotice of settlement|settlement notice|case settled|settled\b/i,
    confidence: 0.9,
  },
  {
    signalType: 'minor_compromise',
    pattern: /\bminor'?s compromise|petition to approve compromise|compromise of minor|guardian ad litem settlement\b/i,
    confidence: 0.95,
  },
  {
    signalType: 'settlement_conference',
    pattern: /\bmandatory settlement conference|settlement conference|msc\b/i,
    confidence: 0.5,
  },
  {
    signalType: 'dismissal_after_settlement',
    pattern: /\brequest for dismissal|dismissal with prejudice|dismissal entered\b/i,
    confidence: 0.55,
  },
  {
    signalType: 'settlement_related_motion',
    pattern: /\bsettlement\b/i,
    confidence: 0.75,
  },
]

function getArg(name: string) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeDate(value: unknown) {
  const text = asString(value)
  if (!text) return null
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function collectMoney(text: string) {
  return [...new Set([...text.matchAll(MONEY_RE)].map((match) => compactText(match[0])))]
}

function hashId(parts: string[]) {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

async function readJson(path: string): Promise<JsonRecord | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as JsonRecord
  } catch {
    return null
  }
}

async function listCaseDirs(sourceDir: string) {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => join(sourceDir, entry.name))
}

async function listJsonFiles(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json')).map((entry) => join(dir, entry.name))
}

function parseCaseMetadata(raw: JsonRecord): CaseMetadata | null {
  const caseNumber = asString(raw.case)
  if (!caseNumber) return null
  return {
    caseNumber,
    caseName: asString(raw.name),
    county: asString(raw.county),
    court: asString(raw.court),
    caseType: asString(raw.type),
    category: asString(raw.category),
    matterType: asString(raw.matter_type),
    caseOutcomeType: asString(raw.case_outcome_type),
    status: asString(raw.status),
    filingDate: normalizeDate(raw.filing_date),
    url: asString(raw.url),
    raw,
  }
}

function findEvents(raw: JsonRecord): JsonRecord[] {
  const directKeys = ['events', 'data', 'results', 'items', 'docket_events']
  for (const key of directKeys) {
    const value = raw[key]
    if (Array.isArray(value)) return value.map(asRecord)
  }
  if (Array.isArray(raw)) return raw.map(asRecord)
  return []
}

function classifyEvent(description: string, motionType: string | null) {
  const text = `${description} ${motionType || ''}`
  return SIGNAL_RULES.find((rule) => rule.pattern.test(text)) || null
}

function buildSignal(caseMeta: CaseMetadata, event: JsonRecord, sourcePath: string, sourceDir: string): SettlementSignal | null {
  const description = compactText(
    [
      ...new Set([asString(event.description), asString(event.full_description), asString(event.secondary_description)].filter(Boolean)),
      asString(event.entry_type),
    ].join(' '),
  )
  if (!description) return null

  const motionType = asString(event.motion_type)
  const rule = classifyEvent(description, motionType)
  if (!rule) return null

  const money = collectMoney(description)
  const signalDate = normalizeDate(event.date)
  const relativePath = relative(sourceDir, sourcePath)

  return {
    signalId: hashId([caseMeta.caseNumber, signalDate || '', description.slice(0, 300)]),
    caseNumber: caseMeta.caseNumber,
    sourcePath: relativePath,
    sourceUrl: caseMeta.url,
    state: 'CA',
    county: caseMeta.county,
    court: caseMeta.court,
    caseName: caseMeta.caseName,
    caseType: caseMeta.caseType || caseMeta.category,
    matterType: caseMeta.matterType,
    caseStatus: caseMeta.status,
    caseOutcomeType: caseMeta.caseOutcomeType,
    filingDate: caseMeta.filingDate,
    signalDate,
    signalType: rule.signalType,
    confidence: money.length > 0 ? Math.min(0.99, rule.confidence + 0.04) : rule.confidence,
    eventDescription: description.slice(0, 4000),
    motionType,
    settlementAmountText: money[0] || null,
    documentAvailable: Boolean(event.document_request),
    featuresJson: {
      all_amounts: money,
      event_type: asString(event.type),
      entry_type: asString(event.entry_type),
      filing_person: asString(event.filing_person),
      judge: asString(event.judge),
      has_document_request: Boolean(event.document_request),
    },
    rawJson: event,
  }
}

async function ensureTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`create schema if not exists cap`)
  await prisma.$executeRawUnsafe(`
    create table if not exists cap.ca_docket_settlement_signals (
      signal_id text primary key,
      case_number text not null,
      source_path text not null,
      source_url text,
      state text not null default 'CA',
      county text,
      court text,
      case_name text,
      case_type text,
      matter_type text,
      case_status text,
      case_outcome_type text,
      filing_date date,
      signal_date date,
      signal_type text not null,
      confidence numeric(4,3) not null,
      event_description text not null,
      motion_type text,
      settlement_amount_text text,
      document_available boolean not null default false,
      label_status text not null default 'signal',
      features_json jsonb not null default '{}'::jsonb,
      raw_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await prisma.$executeRawUnsafe(`create index if not exists ca_docket_settlement_signals_case_idx on cap.ca_docket_settlement_signals (case_number)`)
  await prisma.$executeRawUnsafe(`create index if not exists ca_docket_settlement_signals_type_idx on cap.ca_docket_settlement_signals (signal_type, signal_date)`)
}

async function upsertSignal(prisma: PrismaClient, signal: SettlementSignal) {
  await prisma.$executeRawUnsafe(
    `
    insert into cap.ca_docket_settlement_signals (
      signal_id, case_number, source_path, source_url, state, county, court, case_name, case_type,
      matter_type, case_status, case_outcome_type, filing_date, signal_date, signal_type, confidence,
      event_description, motion_type, settlement_amount_text, document_available, features_json, raw_json,
      updated_at
    )
    values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13::date, $14::date, $15, $16,
      $17, $18, $19, $20, $21::jsonb, $22::jsonb,
      now()
    )
    on conflict (signal_id) do update set
      source_url = excluded.source_url,
      county = excluded.county,
      court = excluded.court,
      case_name = excluded.case_name,
      case_type = excluded.case_type,
      matter_type = excluded.matter_type,
      case_status = excluded.case_status,
      case_outcome_type = excluded.case_outcome_type,
      filing_date = excluded.filing_date,
      signal_date = excluded.signal_date,
      signal_type = excluded.signal_type,
      confidence = excluded.confidence,
      event_description = excluded.event_description,
      motion_type = excluded.motion_type,
      settlement_amount_text = excluded.settlement_amount_text,
      document_available = excluded.document_available,
      features_json = excluded.features_json,
      raw_json = excluded.raw_json,
      updated_at = now()
  `,
    signal.signalId,
    signal.caseNumber,
    signal.sourcePath,
    signal.sourceUrl,
    signal.state,
    signal.county,
    signal.court,
    signal.caseName,
    signal.caseType,
    signal.matterType,
    signal.caseStatus,
    signal.caseOutcomeType,
    signal.filingDate,
    signal.signalDate,
    signal.signalType,
    signal.confidence,
    signal.eventDescription,
    signal.motionType,
    signal.settlementAmountText,
    signal.documentAvailable,
    JSON.stringify(signal.featuresJson),
    JSON.stringify(signal.rawJson),
  )
}

async function extractSignals(sourceDir: string) {
  const signalsById = new Map<string, SettlementSignal>()
  const caseDirs = await listCaseDirs(sourceDir)

  for (const caseDir of caseDirs) {
    const caseJson = await readJson(join(caseDir, 'case.json'))
    const caseMeta = caseJson ? parseCaseMetadata(caseJson) : null
    if (!caseMeta) continue

    for (const jsonFile of await listJsonFiles(caseDir)) {
      if (!/events/i.test(jsonFile)) continue
      const raw = await readJson(jsonFile)
      if (!raw) continue
      for (const event of findEvents(raw)) {
        const signal = buildSignal(caseMeta, event, jsonFile, sourceDir)
        if (signal) signalsById.set(signal.signalId, signal)
      }
    }
  }

  return [...signalsById.values()]
}

async function main() {
  const sourceDir = getArg('source-dir') || DEFAULT_SOURCE_DIR
  const dryRun = process.argv.includes('--dry-run')
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!dryRun && !databaseUrl) throw new Error('SUPABASE_DATABASE_URL or DATABASE_URL is required unless --dry-run is used.')

  const signals = await extractSignals(sourceDir)
  const byType = signals.reduce<Record<string, number>>((acc, signal) => {
    acc[signal.signalType] = (acc[signal.signalType] || 0) + 1
    return acc
  }, {})

  if (dryRun) {
    console.log(JSON.stringify({ sourceDir, signals: signals.length, byType, sample: signals.slice(0, 10) }, null, 2))
    return
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    await ensureTable(prisma)
    for (const signal of signals) await upsertSignal(prisma, signal)
    const status = await prisma.$queryRawUnsafe(`
      select signal_type, count(*)::int as rows
      from cap.ca_docket_settlement_signals
      group by signal_type
      order by rows desc
    `)
    console.log(JSON.stringify({ sourceDir, extracted: signals.length, byType, remoteStatus: status }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
