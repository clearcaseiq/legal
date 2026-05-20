import { createHash } from 'crypto'
import { resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const PREPROCESS_VERSION = 'cap_pre_llm_clean_v1'

type RawCase = {
  case_id: string
  source_name: string | null
  source_url: string | null
  opinion_text: string | null
}

type CleanupRecord = {
  case_id: string
  preprocess_version: string
  source_name: string | null
  source_url: string | null
  raw_sha256: string
  raw_char_count: number
  cleaned_char_count: number
  prompt_char_count: number
  skip_reason: string | null
  routing_bucket: string
  known_metadata_json: Record<string, unknown>
  heuristic_hints_json: Record<string, unknown>
  metrics_json: Record<string, unknown>
}

const STATE_PREFIXES: Record<string, string> = {
  ala: 'AL',
  alaska: 'AK',
  ariz: 'AZ',
  ark: 'AR',
  cal: 'CA',
  colo: 'CO',
  conn: 'CT',
  del: 'DE',
  fla: 'FL',
  ga: 'GA',
  ill: 'IL',
  ind: 'IN',
  iowa: 'IA',
  kan: 'KS',
  ky: 'KY',
  la: 'LA',
  me: 'ME',
  md: 'MD',
  mass: 'MA',
  mich: 'MI',
  minn: 'MN',
  miss: 'MS',
  mo: 'MO',
  mont: 'MT',
  neb: 'NE',
  nev: 'NV',
  nh: 'NH',
  nj: 'NJ',
  nm: 'NM',
  ny: 'NY',
  nc: 'NC',
  nd: 'ND',
  ohio: 'OH',
  okla: 'OK',
  or: 'OR',
  pa: 'PA',
  ri: 'RI',
  sc: 'SC',
  sd: 'SD',
  tenn: 'TN',
  tex: 'TX',
  utah: 'UT',
  vt: 'VT',
  va: 'VA',
  wash: 'WA',
  wva: 'WV',
  wis: 'WI',
  wyo: 'WY',
}

const SIGNAL_PATTERNS: Array<[string, RegExp]> = [
  [
    'death',
    /\b(wrongful\s+death|survival\s+action|decedent|deceased|fatal|fatally|killed|died|death\s+of|died\s+from|died\s+of|resulting\s+in\s+death|administrator\s+of|estate\s+of)\b/i,
  ],
  ['railroad', /\b(train|railroad|railway|streetcar|horse\s+car|rail\s+crossing|locomotive|coal\s+car)\b/i],
  ['workplace', /\b(work(?:er|ing|place)?|employee|employer|mine|coal\s+mine|factory|construction|industrial|uncoupl)\b/i],
  ['auto', /\b(automobile|motor\s+vehicle|car\s+crash|truck|bus|motorcycle|pedestrian|bicycle|highway|road)\b/i],
  ['premises', /\b(sidewalk|premises|stairs?|hole|ice|warehouse|store|building|landlord|fall|fell|slip|trip)\b/i],
  ['med_mal', /\b(medical\s+malpractice|hospital|physician|doctor|nurse|surgery|diagnos|treatment)\b/i],
  ['product', /\b(product\s+liability|defect(?:ive)?|failure\s+to\s+warn|manufactur(?:e|ing)|machine|tool)\b/i],
  ['damages', /\b(damages|verdict|judgment|award(?:ed)?|settlement|remittitur|medical\s+bills?|lost\s+wages|pain\s+and\s+suffering|\$\s*\d)\b/i],
  ['liability', /\b(negligence|comparative\s+negligence|contributory\s+negligence|proximate\s+cause|duty|breach|liable|liability)\b/i],
]

function getArg(name: string) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

function getIntArg(name: string, fallback: number) {
  const raw = getArg(name)
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} must be a positive integer.`)
  return value
}

function requireDatabaseUrl() {
  const value = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!value) throw new Error('Set SUPABASE_DATABASE_URL before running bulk cleanup.')
  return value
}

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function cleanOpinionText(text: string) {
  return text
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/(?<=[A-Za-z])-\s*\n\s*(?=[a-z])/g, '')
    .replace(/\*\s*\d{1,4}\b/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter((line) => !/^\s*\*?\s*\d{1,4}\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function signalLabels(text: string) {
  return SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label)
}

function extractKnownMetadata(rawCase: RawCase, cleanedText: string) {
  const prefix = rawCase.case_id.split('/', 1)[0]?.split('_', 1)[0]?.toLowerCase() || ''
  const year = cleanedText.slice(0, 4000).match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1]
  const courtName = cleanedText
    .slice(0, 4000)
    .match(/\b(Supreme Court|Appellate Court|Court of Appeals|District Court|Superior Court|Circuit Court|City Court|County Court|Probate Court)\b[^\n]{0,120}/i)?.[0]
    ?.replace(/\s+/g, ' ')
    .trim()
    .replace(/[ .,-]+$/, '')

  return {
    preprocess_version: PREPROCESS_VERSION,
    jurisdiction_state_hint: STATE_PREFIXES[prefix] || null,
    decision_year_hint: year ? Number(year) : null,
    court_name_hint: courtName || null,
    source_url: rawCase.source_url,
  }
}

function buildHeuristicHints(labels: string[]) {
  const claimTypeHints = new Set<string>()
  if (labels.includes('death')) claimTypeHints.add('wrongful_death')
  if (labels.includes('railroad')) claimTypeHints.add('railroad_transport')
  if (labels.includes('workplace')) claimTypeHints.add('workplace_injury')
  if (labels.includes('auto')) claimTypeHints.add('auto_pi')
  if (labels.includes('premises')) claimTypeHints.add('premises')
  if (labels.includes('med_mal')) claimTypeHints.add('med_mal')
  if (labels.includes('product')) claimTypeHints.add('product_liability')

  return {
    signal_labels_found: labels,
    claim_type_hints: [...claimTypeHints],
    damages_language: labels.includes('damages') ? ['damages_discussed'] : [],
    liability_signals: labels.includes('liability') ? ['negligence_or_liability'] : [],
  }
}

function estimatePromptChars(cleanedText: string, maxChars: number) {
  if (cleanedText.length <= maxChars) return cleanedText.length
  return maxChars
}

function getSkipReason(cleanedText: string, labels: string[]) {
  if (cleanedText.length < 500) return 'too_little_text'
  if (labels.length === 0) return 'low_signal_text'
  return null
}

function getRoutingBucket(skipReason: string | null, labels: string[]) {
  if (skipReason) return 'skip'
  if (labels.includes('death') || labels.includes('damages')) return 'strong_pi_candidate'
  if (labels.includes('railroad') || labels.includes('workplace') || labels.includes('auto') || labels.includes('premises')) return 'needs_llm'
  if (labels.includes('liability')) return 'borderline_needs_llm'
  return 'review'
}

function buildCleanupRecord(rawCase: RawCase, maxPromptChars: number): CleanupRecord {
  const rawText = rawCase.opinion_text || ''
  const cleanedText = cleanOpinionText(rawText)
  const labels = signalLabels(cleanedText)
  const skipReason = getSkipReason(cleanedText, labels)
  const knownMetadata = extractKnownMetadata(rawCase, cleanedText)
  const heuristicHints = buildHeuristicHints(labels)

  return {
    case_id: rawCase.case_id,
    preprocess_version: PREPROCESS_VERSION,
    source_name: rawCase.source_name,
    source_url: rawCase.source_url,
    raw_sha256: createHash('sha256').update(rawText).digest('hex'),
    raw_char_count: rawText.length,
    cleaned_char_count: cleanedText.length,
    prompt_char_count: estimatePromptChars(cleanedText, maxPromptChars),
    skip_reason: skipReason,
    routing_bucket: getRoutingBucket(skipReason, labels),
    known_metadata_json: knownMetadata,
    heuristic_hints_json: heuristicHints,
    metrics_json: {
      preprocess_version: PREPROCESS_VERSION,
      signal_labels_found: labels,
      raw_char_count: rawText.length,
      cleaned_char_count: cleanedText.length,
      prompt_char_count: estimatePromptChars(cleanedText, maxPromptChars),
    },
  }
}

async function ensureCleanupTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('create schema if not exists cap')
  await prisma.$executeRawUnsafe(`
    create table if not exists cap.pi_pre_llm_cleanups (
      case_id text not null,
      preprocess_version text not null,
      source_name text,
      source_url text,
      raw_sha256 text not null,
      raw_char_count integer not null,
      cleaned_char_count integer not null,
      prompt_char_count integer not null,
      skip_reason text,
      routing_bucket text not null,
      known_metadata_json jsonb not null default '{}'::jsonb,
      heuristic_hints_json jsonb not null default '{}'::jsonb,
      metrics_json jsonb not null default '{}'::jsonb,
      processed_at timestamptz not null default now(),
      primary key (case_id, preprocess_version)
    )
  `)
  await prisma.$executeRawUnsafe(
    'create index if not exists pi_pre_llm_cleanups_bucket_idx on cap.pi_pre_llm_cleanups (preprocess_version, routing_bucket)',
  )
  await prisma.$executeRawUnsafe(
    'create index if not exists pi_pre_llm_cleanups_processed_idx on cap.pi_pre_llm_cleanups (preprocess_version, processed_at)',
  )
}

async function fetchBatch(
  prisma: PrismaClient,
  options: {
    source: string
    worker: number
    workers: number
    batchSize: number
    lastCaseId: string
    includeProcessed: boolean
  },
) {
  const processedFilter = options.includeProcessed
    ? ''
    : `and not exists (
        select 1 from cap.pi_pre_llm_cleanups c
        where c.case_id = r.case_id and c.preprocess_version = ${sqlString(PREPROCESS_VERSION)}
      )`
  const partitionFilter = `and mod(abs(hashtext(r.case_id)), ${options.workers}) = ${options.worker}`

  if (options.source === 'cases_raw') {
    return prisma.$queryRawUnsafe<RawCase[]>(`
      select r.case_id, r.source_name, r.source_url, r.opinion_text
      from public.cases_raw r
      where r.case_id > $1
        and r.opinion_text is not null
        and r.prefilter_label = 'keep'
        ${partitionFilter}
        ${processedFilter}
      order by r.case_id
      limit ${options.batchSize}
    `, options.lastCaseId)
  }

  return prisma.$queryRawUnsafe<RawCase[]>(`
    select r.case_id, coalesce(q.source_name, r.source_name) as source_name, coalesce(q.source_url, r.source_url) as source_url, r.opinion_text
    from cap.pi_extraction_queue q
    join public.cases_raw r on r.case_id = q.case_id
    where r.case_id > $1
      and r.opinion_text is not null
      and q.status = 'queued'
      ${partitionFilter}
      ${processedFilter}
    order by r.case_id
    limit ${options.batchSize}
  `, options.lastCaseId)
}

async function bulkUpsert(prisma: PrismaClient, records: CleanupRecord[]) {
  if (records.length === 0) return

  const placeholders: string[] = []
  const params: unknown[] = []
  for (const record of records) {
    placeholders.push(
      `($${params.length + 1},$${params.length + 2},$${params.length + 3},$${params.length + 4},$${params.length + 5},$${params.length + 6},$${params.length + 7},$${params.length + 8},$${params.length + 9},$${params.length + 10},$${params.length + 11}::jsonb,$${params.length + 12}::jsonb,$${params.length + 13}::jsonb,now())`,
    )
    params.push(
      record.case_id,
      record.preprocess_version,
      record.source_name,
      record.source_url,
      record.raw_sha256,
      record.raw_char_count,
      record.cleaned_char_count,
      record.prompt_char_count,
      record.skip_reason,
      record.routing_bucket,
      JSON.stringify(record.known_metadata_json),
      JSON.stringify(record.heuristic_hints_json),
      JSON.stringify(record.metrics_json),
    )
  }

  await prisma.$executeRawUnsafe(
    `
    insert into cap.pi_pre_llm_cleanups (
      case_id,
      preprocess_version,
      source_name,
      source_url,
      raw_sha256,
      raw_char_count,
      cleaned_char_count,
      prompt_char_count,
      skip_reason,
      routing_bucket,
      known_metadata_json,
      heuristic_hints_json,
      metrics_json,
      processed_at
    )
    values ${placeholders.join(',')}
    on conflict (case_id, preprocess_version) do update set
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      raw_sha256 = excluded.raw_sha256,
      raw_char_count = excluded.raw_char_count,
      cleaned_char_count = excluded.cleaned_char_count,
      prompt_char_count = excluded.prompt_char_count,
      skip_reason = excluded.skip_reason,
      routing_bucket = excluded.routing_bucket,
      known_metadata_json = excluded.known_metadata_json,
      heuristic_hints_json = excluded.heuristic_hints_json,
      metrics_json = excluded.metrics_json,
      processed_at = now()
    `,
    ...params,
  )
}

async function runWorker(
  worker: number,
  options: {
    databaseUrl: string
    source: string
    workers: number
    batchSize: number
    maxPromptChars: number
    limit: number | undefined
    dryRun: boolean
    includeProcessed: boolean
  },
) {
  const prisma = new PrismaClient({ datasources: { db: { url: options.databaseUrl } } })
  let lastCaseId = ''
  let processed = 0
  let batches = 0
  const startedAt = Date.now()

  try {
    while (options.limit == null || processed < options.limit) {
      const remaining = options.limit == null ? options.batchSize : Math.min(options.batchSize, options.limit - processed)
      const rows = await fetchBatch(prisma, {
        source: options.source,
        worker,
        workers: options.workers,
        batchSize: remaining,
        lastCaseId,
        includeProcessed: options.includeProcessed,
      })
      if (rows.length === 0) break

      const records = rows.map((row) => buildCleanupRecord(row, options.maxPromptChars))
      if (!options.dryRun) await bulkUpsert(prisma, records)

      processed += rows.length
      batches += 1
      lastCaseId = rows[rows.length - 1]?.case_id || lastCaseId
      const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000)
      console.log(
        `worker=${worker} batches=${batches} processed=${processed} rate=${(processed / elapsedSeconds).toFixed(1)}/s last=${lastCaseId}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }

  return { worker, processed, batches }
}

async function summarize(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    select
      count(*)::bigint as total,
      count(*) filter (where routing_bucket = 'skip')::bigint as skipped,
      count(*) filter (where routing_bucket <> 'skip')::bigint as llm_candidates,
      avg(raw_char_count)::float as avg_raw_chars,
      avg(cleaned_char_count)::float as avg_cleaned_chars,
      avg(prompt_char_count)::float as avg_prompt_chars
    from cap.pi_pre_llm_cleanups
    where preprocess_version = $1
  `, PREPROCESS_VERSION)
  const buckets = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    select routing_bucket, count(*)::bigint as count
    from cap.pi_pre_llm_cleanups
    where preprocess_version = $1
    group by routing_bucket
    order by count desc, routing_bucket
  `, PREPROCESS_VERSION)
  return { overview: rows[0], buckets }
}

async function main() {
  const databaseUrl = requireDatabaseUrl()
  const workers = getIntArg('workers', 4)
  const batchSize = getIntArg('batch-size', 500)
  const maxPromptChars = getIntArg('max-prompt-chars', 30000)
  const source = getArg('source') || 'queue'
  const limit = getArg('limit') ? getIntArg('limit', 1) : undefined
  const dryRun = process.argv.includes('--dry-run')
  const includeProcessed = process.argv.includes('--include-processed')

  if (!['queue', 'cases_raw'].includes(source)) throw new Error('--source must be queue or cases_raw.')

  const setupPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    if (!dryRun) await ensureCleanupTable(setupPrisma)
  } finally {
    await setupPrisma.$disconnect()
  }

  const startedAt = Date.now()
  const perWorkerLimit = limit == null ? undefined : Math.ceil(limit / workers)
  const results = await Promise.all(
    Array.from({ length: workers }, (_, worker) =>
      runWorker(worker, {
        databaseUrl,
        source,
        workers,
        batchSize,
        maxPromptChars,
        limit: perWorkerLimit,
        dryRun,
        includeProcessed,
      }),
    ),
  )
  const processed = results.reduce((sum, result) => sum + result.processed, 0)
  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000)

  let summary: unknown = null
  if (!dryRun) {
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    try {
      summary = await summarize(prisma)
    } finally {
      await prisma.$disconnect()
    }
  }

  console.log(
    JSON.stringify(
      {
        preprocess_version: PREPROCESS_VERSION,
        source,
        workers,
        batch_size: batchSize,
        processed,
        elapsed_seconds: Number(elapsedSeconds.toFixed(1)),
        rows_per_second: Number((processed / elapsedSeconds).toFixed(1)),
        dry_run: dryRun,
        worker_results: results,
        summary,
      },
      (_, value) => (typeof value === 'bigint' ? Number(value) : value),
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
