import { resolve } from 'path'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })
config({ path: resolve(process.cwd(), '.env'), override: false })
config({ path: resolve(process.cwd(), 'api/.env'), override: false })

const MODEL = getArg('model') || process.env.ML_EXTRACTION_MODEL || 'gpt-4o-mini'
const PROVIDER = getArg('provider') || (MODEL.startsWith('gemini') ? 'gemini' : 'openai')
const PROMPT_VERSION = 'cap_pi_extract_taxonomy_v3_clean_v1'
const PREPROCESS_VERSION = 'cap_pre_llm_clean_v1'
const SOURCE_NAME = 'CaselawAccessProject'

const PI_CASE_TYPES = new Set([
  'auto_pi',
  'premises',
  'workplace_injury',
  'railroad_transport',
  'med_mal',
  'product_liability',
  'wrongful_death',
  'intentional_tort',
  'other_pi',
])
const ALLOWED_CASE_TYPES = new Set([...PI_CASE_TYPES, 'property_damage', 'not_pi'])
const CASE_TYPE_ALIASES: Record<string, string> = {
  auto: 'auto_pi',
  auto_accident: 'auto_pi',
  motor_vehicle: 'auto_pi',
  motor_vehicle_accident: 'auto_pi',
  slip_and_fall: 'premises',
  premises_liability: 'premises',
  medical_malpractice: 'med_mal',
  medmal: 'med_mal',
  workplace: 'workplace_injury',
  workers_comp: 'workplace_injury',
  railroad: 'railroad_transport',
  railway: 'railroad_transport',
  train: 'railroad_transport',
  assault: 'intentional_tort',
  battery: 'intentional_tort',
  property_only: 'property_damage',
  property: 'property_damage',
  negligence: 'other_pi',
  unknown: 'not_pi',
}

const DEATH_TERMS =
  /\b(wrongful\s+death|survival\s+action|decedent|deceased|fatal|fatally|killed|died|death\s+of|died\s+from|died\s+of|resulting\s+in\s+death|administrator\s+of|estate\s+of)\b/i
const RAILROAD_TERMS = /\b(train|railroad|railway|streetcar|horse\s+car|rail\s+crossing|locomotive|coal\s+car)\b/i
const WORKPLACE_TERMS = /\b(work(?:er|ing|place)?|employee|employer|mine|coal\s+mine|factory|construction|industrial|uncoupl)\b/i
const PREMISES_TERMS = /\b(sidewalk|premises|stairs?|hole|ice|warehouse|store|building|landlord|fall|fell|slip|trip)\b/i
const AUTO_TERMS = /\b(automobile|motor\s+vehicle|car\s+crash|truck|bus|motorcycle|pedestrian|bicycle|highway|road)\b/i

const SIGNAL_PATTERNS: Array<[string, RegExp]> = [
  ['death', DEATH_TERMS],
  ['railroad', RAILROAD_TERMS],
  ['workplace', WORKPLACE_TERMS],
  ['auto', AUTO_TERMS],
  ['premises', PREMISES_TERMS],
  ['med_mal', /\b(medical\s+malpractice|hospital|physician|doctor|nurse|surgery|diagnos|treatment)\b/i],
  ['product', /\b(product\s+liability|defect(?:ive)?|failure\s+to\s+warn|manufactur(?:e|ing)|machine|tool)\b/i],
  ['damages', /\b(damages|verdict|judgment|award(?:ed)?|settlement|remittitur|medical\s+bills?|lost\s+wages|pain\s+and\s+suffering|\$\s*\d)\b/i],
  ['liability', /\b(negligence|comparative\s+negligence|contributory\s+negligence|proximate\s+cause|duty|breach|liable|liability)\b/i],
]

type Candidate = {
  case_id: string
  source_name: string | null
  source_url: string | null
  opinion_text: string
  known_metadata_json: Record<string, unknown> | null
  heuristic_hints_json: Record<string, unknown> | null
  metrics_json: Record<string, unknown> | null
}

type NormalizedExtraction = {
  case_id: string
  source_name: string
  source_url: string | null
  jurisdiction_state: string | null
  court_name: string | null
  court_level: string
  decision_year: number | null
  case_type: string
  is_plaintiff_pi_case: boolean
  procedural_posture: string
  injury_summary: string | null
  injury_flags: Record<string, unknown>
  treatment_features: Record<string, unknown>
  damages: Record<string, unknown>
  liability: Record<string, unknown>
  insurance: Record<string, unknown>
  value_signals: Record<string, unknown>
  citations: unknown[]
  evidence_spans: Record<string, unknown[]>
  confidence: Record<string, number>
}

type LlmUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

type LlmResult = {
  rawJson: Record<string, unknown>
  usage: LlmUsage
  providerUsage: unknown
}

type LlmClient = OpenAI | { provider: 'gemini'; apiKey: string }

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

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required in api/.env.`)
  return value
}

function getOptionalEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  return undefined
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

function buildPromptText(cleanedText: string, maxChars: number) {
  if (cleanedText.length <= maxChars) {
    return { text: cleanedText, metrics: { strategy: 'full_text', selected_signal_windows: [] } }
  }

  const headChars = Math.max(500, Math.floor(maxChars * 0.3))
  const tailChars = Math.max(300, Math.floor(maxChars * 0.12))
  const windowBudget = Math.max(0, maxChars - headChars - tailChars - 400)
  const windows: Array<[number, number, string]> = []

  for (const [label, pattern] of SIGNAL_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
    let count = 0
    for (const match of cleanedText.matchAll(globalPattern)) {
      const index = match.index ?? 0
      windows.push([Math.max(0, index - 700), Math.min(cleanedText.length, index + match[0].length + 700), label])
      count += 1
      if (count >= 4) break
    }
  }

  windows.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number, Set<string>]> = []
  for (const [start, end, label] of windows) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1] + 120) {
      last[1] = Math.max(last[1], end)
      last[2].add(label)
    } else {
      merged.push([start, end, new Set([label])])
    }
  }

  let used = 0
  const selected: Array<[number, number, string[]]> = []
  for (const [start, rawEnd, labels] of merged) {
    let end = rawEnd
    let length = end - start
    if (used + length > windowBudget) {
      const remaining = windowBudget - used
      if (remaining < 300) break
      end = start + remaining
      length = remaining
    }
    selected.push([start, end, [...labels].sort()])
    used += length
    if (used >= windowBudget) break
  }

  const windowText = selected
    .map(([start, end, labels]) => `[window labels=${labels.join(',')} chars=${start}-${end}]\n${cleanedText.slice(start, end).trim()}`)
    .join('\n\n')
  let text = [cleanedText.slice(0, headChars).trim(), windowText, cleanedText.slice(-tailChars).trim()]
    .filter(Boolean)
    .join('\n\n[...SELECTED RELEVANT WINDOWS...]\n\n')

  if (text.length > maxChars) text = `${text.slice(0, maxChars - 80).trim()}\n\n[...PREPROCESS TRUNCATED...]`
  return {
    text,
    metrics: {
      strategy: 'head_windows_tail',
      selected_signal_windows: selected.map(([start, end, labels]) => ({ start, end, labels })),
    },
  }
}

function buildPrompt(candidate: Candidate, maxChars: number) {
  const cleanedText = cleanOpinionText(candidate.opinion_text || '')
  const packed = buildPromptText(cleanedText, maxChars)
  const knownMetadata = candidate.known_metadata_json || {}
  const heuristicHints = candidate.heuristic_hints_json || {}
  const cleanupMetrics = {
    ...(candidate.metrics_json || {}),
    prompt_char_count_for_llm: packed.text.length,
    prompt_pack_strategy: packed.metrics.strategy,
  }

  return `You are extracting structured plaintiff-side personal injury case-value data from a judicial opinion. Return ONLY valid JSON. Do not invent facts; use null when unknown. Confidence values MUST be decimals from 0 to 1.

Required taxonomy:
- auto_pi: motor vehicle road collisions only, such as car, truck, bus, motorcycle, pedestrian, or bicycle crashes.
- railroad_transport: train, streetcar, rail crossing, rail passenger, rail worker, or rail equipment injury. Do not label these auto_pi.
- workplace_injury: employee or worker injured at work, including mines, factories, construction, industrial equipment, employer negligence, or unsafe workplace conditions.
- premises: land/building/sidewalk/store/residential premises conditions, slip/trip/fall, negligent maintenance, unsafe stairs, holes, ice, or similar premises defects.
- med_mal: medical, hospital, physician, nursing, diagnosis, treatment, or surgical negligence.
- product_liability: defective product, machine, tool, design/manufacturing defect, or failure to warn.
- wrongful_death: death claim arising from injury/tort facts, but only when the opinion explicitly says death, died, killed, fatal, deceased, decedent, estate, administrator, survival action, or wrongful death. Severe injury, permanent injury, paralysis, amputation, or catastrophic injury alone is not wrongful_death.
- intentional_tort: assault, battery, false imprisonment, intentional infliction, or other intentional personal injury.
- property_damage: property-only economic loss, damaged goods, repossession, contract/commercial disputes, or vehicle/property damage without bodily injury.
- other_pi: plaintiff-side bodily injury that does not fit the above.
- not_pi: no plaintiff-side personal injury or wrongful death claim.

Classification precedence:
1. If there is explicit death/decedent/estate/survival/wrongful-death language from tort/injury facts, use wrongful_death.
2. If bodily injury happened while working or in a mine/factory/construction workplace, use workplace_injury unless the case is strictly med_mal or product_liability.
3. If injury involves trains, railroads, streetcars, crossings, or rail equipment, use railroad_transport, not auto_pi.
4. Use auto_pi only for road motor vehicle crashes.
5. Use property_damage or not_pi for property-only/value-only disputes, even if damages are discussed.

Return this exact JSON shape with every field present:
{"case_id":"${candidate.case_id}","source_name":"CaselawAccessProject","source_url":${JSON.stringify(candidate.source_url)},"jurisdiction_state":null,"court_name":null,"court_level":"unknown","decision_year":null,"case_type":"not_pi","is_plaintiff_pi_case":false,"procedural_posture":"unknown","injury_summary":null,"injury_flags":{"soft_tissue":false,"spine":false,"surgery":false,"tbi":false,"fracture":false,"death":false,"permanency":false},"treatment_features":{"er_visit":false,"hospitalization":false,"pt":false,"injections":false,"future_treatment":false,"treatment_duration_days":null},"damages":{"medical_expenses_past":null,"medical_expenses_future":null,"lost_wages_past":null,"lost_earning_capacity":null,"pain_suffering":null,"punitive":null,"consortium":null,"property_damage":null,"total_award":null,"settlement_amount":null,"final_recoverable_amount":null},"liability":{"plaintiff_win":null,"comparative_fault_percent":null,"liability_strength":"unclear"},"insurance":{"policy_limit_amount":null,"policy_limit_mentioned":null},"value_signals":{"verdict_mentioned":false,"settlement_mentioned":false,"remittitur_mentioned":false,"damages_discussed":false},"citations":[],"confidence":{"overall":0,"damages":0,"injury":0,"liability":0},"evidence_spans":{"injury_text":[],"damages_text":[],"liability_text":[]}}

Metadata:
case_id: ${candidate.case_id}
source_url: ${candidate.source_url || 'unknown'}
prompt_version: ${PROMPT_VERSION}
preprocess_version: ${PREPROCESS_VERSION}

Known metadata extracted before the LLM; use only when consistent with the opinion:
${JSON.stringify(knownMetadata, null, 2)}

Precomputed heuristic hints, not final labels:
${JSON.stringify(heuristicHints, null, 2)}

Preprocessing metrics:
${JSON.stringify(cleanupMetrics, null, 2)}

Opinion text:
${packed.text}`
}

function parseJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed)
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('LLM response did not contain a JSON object.')
  return JSON.parse(match[0])
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function boolValue(value: unknown) {
  return Boolean(value)
}

function confidenceNumber(value: unknown) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number))
}

function textFrom(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function intFrom(value: unknown): number | null {
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function normalizeExtraction(data: Record<string, unknown>, candidate: Candidate): NormalizedExtraction {
  const evidenceSpans = asObject(data.evidence_spans)
  const confidence = asObject(data.confidence)
  const knownMetadata = asObject(candidate.known_metadata_json)
  let caseType = String(data.case_type || 'not_pi').trim().toLowerCase()
  caseType = CASE_TYPE_ALIASES[caseType] || caseType
  if (!ALLOWED_CASE_TYPES.has(caseType)) caseType = boolValue(data.is_plaintiff_pi_case) ? 'other_pi' : 'not_pi'

  const joinedEvidence = [
    data.injury_summary,
    data.procedural_posture,
    ...(Array.isArray(evidenceSpans.injury_text) ? evidenceSpans.injury_text : []),
    ...(Array.isArray(evidenceSpans.damages_text) ? evidenceSpans.damages_text : []),
    ...(Array.isArray(evidenceSpans.liability_text) ? evidenceSpans.liability_text : []),
  ]
    .filter((value) => value != null)
    .join(' ')

  if (caseType === 'wrongful_death' && !DEATH_TERMS.test(joinedEvidence)) {
    if (WORKPLACE_TERMS.test(joinedEvidence)) caseType = 'workplace_injury'
    else if (RAILROAD_TERMS.test(joinedEvidence)) caseType = 'railroad_transport'
    else if (PREMISES_TERMS.test(joinedEvidence)) caseType = 'premises'
    else if (AUTO_TERMS.test(joinedEvidence)) caseType = 'auto_pi'
    else caseType = 'other_pi'
  }

  const injuryFlags = asObject(data.injury_flags)
  const treatmentFeatures = asObject(data.treatment_features)
  const damages = asObject(data.damages)
  const liability = asObject(data.liability)
  const insurance = asObject(data.insurance)
  const valueSignals = asObject(data.value_signals)

  return {
    case_id: candidate.case_id,
    source_name: textFrom(data.source_name) || candidate.source_name || SOURCE_NAME,
    source_url: textFrom(data.source_url) || candidate.source_url,
    jurisdiction_state: textFrom(data.jurisdiction_state) || textFrom(knownMetadata.jurisdiction_state_hint),
    court_name: textFrom(data.court_name) || textFrom(knownMetadata.court_name_hint),
    court_level: textFrom(data.court_level) || 'unknown',
    decision_year: intFrom(data.decision_year) || intFrom(knownMetadata.decision_year_hint),
    case_type: caseType,
    is_plaintiff_pi_case: PI_CASE_TYPES.has(caseType),
    procedural_posture: textFrom(data.procedural_posture) || 'unknown',
    injury_summary: textFrom(data.injury_summary),
    injury_flags: {
      soft_tissue: injuryFlags.soft_tissue,
      spine: injuryFlags.spine,
      surgery: injuryFlags.surgery,
      tbi: injuryFlags.tbi,
      fracture: injuryFlags.fracture,
      death: injuryFlags.death,
      permanency: injuryFlags.permanency,
    },
    treatment_features: {
      er_visit: treatmentFeatures.er_visit,
      hospitalization: treatmentFeatures.hospitalization,
      pt: treatmentFeatures.pt,
      injections: treatmentFeatures.injections,
      future_treatment: treatmentFeatures.future_treatment,
      treatment_duration_days: treatmentFeatures.treatment_duration_days,
    },
    damages: {
      medical_expenses_past: damages.medical_expenses_past,
      medical_expenses_future: damages.medical_expenses_future,
      lost_wages_past: damages.lost_wages_past,
      lost_earning_capacity: damages.lost_earning_capacity,
      pain_suffering: damages.pain_suffering,
      punitive: damages.punitive,
      consortium: damages.consortium,
      property_damage: damages.property_damage,
      total_award: damages.total_award,
      settlement_amount: damages.settlement_amount,
      final_recoverable_amount: damages.final_recoverable_amount,
    },
    liability: {
      plaintiff_win: liability.plaintiff_win,
      comparative_fault_percent: liability.comparative_fault_percent,
      liability_strength: liability.liability_strength || 'unclear',
    },
    insurance: {
      policy_limit_amount: insurance.policy_limit_amount,
      policy_limit_mentioned: insurance.policy_limit_mentioned,
    },
    value_signals: {
      verdict_mentioned: boolValue(valueSignals.verdict_mentioned),
      settlement_mentioned: boolValue(valueSignals.settlement_mentioned),
      remittitur_mentioned: boolValue(valueSignals.remittitur_mentioned),
      damages_discussed: boolValue(valueSignals.damages_discussed),
    },
    citations: Array.isArray(data.citations) ? data.citations : [],
    evidence_spans: {
      injury_text: Array.isArray(evidenceSpans.injury_text) ? evidenceSpans.injury_text : [],
      damages_text: Array.isArray(evidenceSpans.damages_text) ? evidenceSpans.damages_text : [],
      liability_text: Array.isArray(evidenceSpans.liability_text) ? evidenceSpans.liability_text : [],
    },
    confidence: {
      overall: confidenceNumber(confidence.overall),
      damages: confidenceNumber(confidence.damages),
      injury: confidenceNumber(confidence.injury),
      liability: confidenceNumber(confidence.liability),
    },
  }
}

async function ensureFailureTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('create schema if not exists cap')
  await prisma.$executeRawUnsafe(`
    create table if not exists cap.pi_llm_extraction_failures (
      case_id text not null,
      model_name text not null,
      prompt_version text not null,
      preprocess_version text not null,
      error text not null,
      failed_at timestamptz not null default now(),
      primary key (case_id, model_name, prompt_version)
    )
  `)
}

async function fetchBatch(
  prisma: PrismaClient,
  options: {
    worker: number
    workers: number
    batchSize: number
    lastCaseId: string
    routingBucket: string
    skipAnyModel: boolean
  },
) {
  const existingExtractionFilter = options.skipAnyModel
    ? `and not exists (
        select 1 from public.case_extractions e
        where e.case_id = c.case_id
          and e.prompt_version = ${sqlString(PROMPT_VERSION)}
      )`
    : `and not exists (
        select 1 from public.case_extractions e
        where e.case_id = c.case_id
          and e.model_name = ${sqlString(MODEL)}
          and e.prompt_version = ${sqlString(PROMPT_VERSION)}
      )`

  return prisma.$queryRawUnsafe<Candidate[]>(
    `
    select
      c.case_id,
      coalesce(c.source_name, r.source_name) as source_name,
      coalesce(c.source_url, r.source_url) as source_url,
      r.opinion_text,
      c.known_metadata_json,
      c.heuristic_hints_json,
      c.metrics_json
    from cap.pi_pre_llm_cleanups c
    join public.cases_raw r on r.case_id = c.case_id
    where c.case_id > $1
      and c.preprocess_version = ${sqlString(PREPROCESS_VERSION)}
      and c.routing_bucket = $2
      and mod(abs(hashtext(c.case_id)), ${options.workers}) = ${options.worker}
      ${existingExtractionFilter}
    order by c.case_id
    limit ${options.batchSize}
  `,
    options.lastCaseId,
    options.routingBucket,
  )
}

async function upsertExtraction(prisma: PrismaClient, normalized: NormalizedExtraction, rawOutput: Record<string, unknown>) {
  await prisma.$executeRawUnsafe(
    `
    insert into public.case_extractions (
      case_id, source_name, model_name, model_version, prompt_version,
      is_plaintiff_pi_case, case_type, jurisdiction_state, court_name, court_level, decision_year,
      procedural_posture, injury_summary, injury_flags_json, treatment_features_json, damages_json,
      liability_json, insurance_json, value_signals_json, citations_json, evidence_spans_json,
      confidence_json, raw_llm_output, validation_status, validation_errors_json
    )
    values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
      $14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,
      'valid','[]'::jsonb
    )
    on conflict (case_id, model_name, prompt_version) do update set
      source_name=excluded.source_name,
      model_version=excluded.model_version,
      is_plaintiff_pi_case=excluded.is_plaintiff_pi_case,
      case_type=excluded.case_type,
      jurisdiction_state=excluded.jurisdiction_state,
      court_name=excluded.court_name,
      court_level=excluded.court_level,
      decision_year=excluded.decision_year,
      procedural_posture=excluded.procedural_posture,
      injury_summary=excluded.injury_summary,
      injury_flags_json=excluded.injury_flags_json,
      treatment_features_json=excluded.treatment_features_json,
      damages_json=excluded.damages_json,
      liability_json=excluded.liability_json,
      insurance_json=excluded.insurance_json,
      value_signals_json=excluded.value_signals_json,
      citations_json=excluded.citations_json,
      evidence_spans_json=excluded.evidence_spans_json,
      confidence_json=excluded.confidence_json,
      raw_llm_output=excluded.raw_llm_output,
      validation_status='valid',
      validation_errors_json='[]'::jsonb,
      extracted_at=now()
  `,
    normalized.case_id,
    normalized.source_name,
    MODEL,
    MODEL,
    PROMPT_VERSION,
    normalized.is_plaintiff_pi_case,
    normalized.case_type,
    normalized.jurisdiction_state,
    normalized.court_name,
    normalized.court_level,
    normalized.decision_year,
    normalized.procedural_posture,
    normalized.injury_summary,
    JSON.stringify(normalized.injury_flags),
    JSON.stringify(normalized.treatment_features),
    JSON.stringify(normalized.damages),
    JSON.stringify(normalized.liability),
    JSON.stringify(normalized.insurance),
    JSON.stringify(normalized.value_signals),
    JSON.stringify(normalized.citations),
    JSON.stringify(normalized.evidence_spans),
    JSON.stringify(normalized.confidence),
    JSON.stringify(rawOutput),
  )
}

async function recordFailure(prisma: PrismaClient, candidate: Candidate, error: unknown) {
  await prisma.$executeRawUnsafe(
    `
    insert into cap.pi_llm_extraction_failures (case_id, model_name, prompt_version, preprocess_version, error, failed_at)
    values ($1,$2,$3,$4,$5,now())
    on conflict (case_id, model_name, prompt_version) do update set
      preprocess_version=excluded.preprocess_version,
      error=excluded.error,
      failed_at=now()
  `,
    candidate.case_id,
    MODEL,
    PROMPT_VERSION,
    PREPROCESS_VERSION,
    error instanceof Error ? error.message : String(error),
  )
}

async function callOpenAI(openai: OpenAI, prompt: string): Promise<LlmResult> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a careful legal extraction system. Output only valid JSON.' },
      { role: 'user', content: prompt },
    ],
  })
  const rawJson = parseJsonObject(completion.choices[0]?.message?.content || '{}')
  const usage = completion.usage
  return {
    rawJson,
    usage: {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
    },
    providerUsage: usage || null,
  }
}

async function callGemini(client: { apiKey: string }, prompt: string): Promise<LlmResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(client.apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You are a careful legal extraction system. Output only valid JSON.' }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  })
  const body = (await response.json().catch(async () => ({ error: await response.text() }))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(`Gemini request failed ${response.status}: ${JSON.stringify(body).slice(0, 800)}`)
  }

  const candidates = Array.isArray(body.candidates) ? body.candidates : []
  const firstCandidate = asObject(candidates[0])
  const content = asObject(firstCandidate.content)
  const parts = Array.isArray(content.parts) ? content.parts : []
  const text = parts
    .map((part) => asObject(part).text)
    .filter((partText): partText is string => typeof partText === 'string')
    .join('\n')
  if (!text) throw new Error(`Gemini response did not include text: ${JSON.stringify(body).slice(0, 800)}`)

  const rawJson = parseJsonObject(text)
  const usageMetadata = asObject(body.usageMetadata)
  const promptTokens = Number(usageMetadata.promptTokenCount || 0)
  const completionTokens = Number(usageMetadata.candidatesTokenCount || 0)
  const totalTokens = Number(usageMetadata.totalTokenCount || promptTokens + completionTokens)
  return {
    rawJson,
    usage: {
      prompt_tokens: Number.isFinite(promptTokens) ? promptTokens : 0,
      completion_tokens: Number.isFinite(completionTokens) ? completionTokens : 0,
      total_tokens: Number.isFinite(totalTokens) ? totalTokens : 0,
    },
    providerUsage: usageMetadata,
  }
}

async function callLlm(client: LlmClient, prompt: string): Promise<LlmResult> {
  if ((client as { provider?: string }).provider === 'gemini') return callGemini(client as { provider: 'gemini'; apiKey: string }, prompt)
  return callOpenAI(client as OpenAI, prompt)
}

async function extractCandidate(llmClient: LlmClient, candidate: Candidate, maxChars: number) {
  const prompt = buildPrompt(candidate, maxChars)
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const llmResult = await callLlm(llmClient, prompt)
      return {
        normalized: normalizeExtraction(llmResult.rawJson, candidate),
        rawOutput: {
          ...llmResult.rawJson,
          _llm_provider: PROVIDER,
          _llm_usage: llmResult.usage,
          _openai_usage: llmResult.usage,
          _gemini_usage: PROVIDER === 'gemini' ? llmResult.providerUsage : null,
          _pre_llm_cleanup: {
            known_metadata: candidate.known_metadata_json || {},
            heuristic_hints: candidate.heuristic_hints_json || {},
            metrics: candidate.metrics_json || {},
          },
        },
        usage: llmResult.usage,
      }
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const delayMs = /rate|429|timeout|temporarily/i.test(message) ? attempt * 5000 : attempt * 1500
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function runWorker(
  worker: number,
  options: {
    databaseUrl: string
    llmClient: LlmClient
    workers: number
    batchSize: number
    perWorkerLimit: number
    maxChars: number
    routingBucket: string
    skipAnyModel: boolean
  },
) {
  const prisma = new PrismaClient({ datasources: { db: { url: options.databaseUrl } } })
  let lastCaseId = ''
  let processed = 0
  let success = 0
  let failed = 0
  let batches = 0
  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0
  const startedAt = Date.now()

  try {
    while (processed < options.perWorkerLimit) {
      const remaining = options.perWorkerLimit - processed
      const candidates = await fetchBatch(prisma, {
        worker,
        workers: options.workers,
        batchSize: Math.min(options.batchSize, remaining),
        lastCaseId,
        routingBucket: options.routingBucket,
        skipAnyModel: options.skipAnyModel,
      })
      if (candidates.length === 0) break
      batches += 1

      for (const candidate of candidates) {
        try {
          const result = await extractCandidate(options.llmClient, candidate, options.maxChars)
          await upsertExtraction(prisma, result.normalized, result.rawOutput)
          promptTokens += result.usage.prompt_tokens
          completionTokens += result.usage.completion_tokens
          totalTokens += result.usage.total_tokens
          success += 1
        } catch (error) {
          await recordFailure(prisma, candidate, error)
          failed += 1
        }
        processed += 1
        lastCaseId = candidate.case_id
        if (processed % 25 === 0) {
          const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000)
          console.log(
            `worker=${worker} processed=${processed}/${options.perWorkerLimit} success=${success} failed=${failed} rate=${(processed / elapsedSeconds).toFixed(2)}/s last=${lastCaseId}`,
          )
        }
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  return { worker, processed, success, failed, batches, promptTokens, completionTokens, totalTokens }
}

async function summarize(prisma: PrismaClient) {
  const overview = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
    select
      count(*)::bigint as total,
      count(*) filter (where is_plaintiff_pi_case)::bigint as pi_total,
      count(*) filter (where not is_plaintiff_pi_case)::bigint as non_pi_total,
      avg((confidence_json->>'overall')::numeric)::float as avg_confidence
    from public.case_extractions
    where model_name = $1 and prompt_version = $2
  `,
    MODEL,
    PROMPT_VERSION,
  )
  const byType = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
    select case_type, count(*)::bigint as count
    from public.case_extractions
    where model_name = $1 and prompt_version = $2
    group by case_type
    order by count desc, case_type
  `,
    MODEL,
    PROMPT_VERSION,
  )
  const failures = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
    select count(*)::bigint as total
    from cap.pi_llm_extraction_failures
    where model_name = $1 and prompt_version = $2
  `,
    MODEL,
    PROMPT_VERSION,
  )
  return { overview: overview[0], byType, failures: failures[0] }
}

async function main() {
  const databaseUrl = requireEnv('SUPABASE_DATABASE_URL')
  const llmClient: LlmClient =
    PROVIDER === 'gemini'
      ? { provider: 'gemini', apiKey: getOptionalEnv('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY') || requireEnv('GEMINI_API_KEY') }
      : new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') })
  const workers = getIntArg('workers', 16)
  const limit = getIntArg('limit', 10000)
  const batchSize = getIntArg('batch-size', 25)
  const maxChars = getIntArg('max-chars', 30000)
  const routingBucket = getArg('routing-bucket') || 'strong_pi_candidate'
  const skipAnyModel = process.argv.includes('--skip-any-model')
  const perWorkerLimit = Math.ceil(limit / workers)

  const setupPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    await ensureFailureTable(setupPrisma)
  } finally {
    await setupPrisma.$disconnect()
  }

  const startedAt = Date.now()
  const results = await Promise.all(
    Array.from({ length: workers }, (_, worker) =>
      runWorker(worker, {
        databaseUrl,
        llmClient,
        workers,
        batchSize,
        perWorkerLimit,
        maxChars,
        routingBucket,
        skipAnyModel,
      }),
    ),
  )
  const processed = results.reduce((sum, result) => sum + result.processed, 0)
  const success = results.reduce((sum, result) => sum + result.success, 0)
  const failed = results.reduce((sum, result) => sum + result.failed, 0)
  const promptTokens = results.reduce((sum, result) => sum + result.promptTokens, 0)
  const completionTokens = results.reduce((sum, result) => sum + result.completionTokens, 0)
  const totalTokens = results.reduce((sum, result) => sum + result.totalTokens, 0)
  const estimatedCostUsd =
    PROVIDER === 'gemini'
      ? Number(((promptTokens / 1_000_000) * 0.1 + (completionTokens / 1_000_000) * 0.4).toFixed(4))
      : Number(((promptTokens / 1_000_000) * 0.15 + (completionTokens / 1_000_000) * 0.6).toFixed(4))
  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000)

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  let summary: unknown
  try {
    summary = await summarize(prisma)
  } finally {
    await prisma.$disconnect()
  }

  console.log(
    JSON.stringify(
      {
        model: MODEL,
        provider: PROVIDER,
        prompt_version: PROMPT_VERSION,
        preprocess_version: PREPROCESS_VERSION,
        routing_bucket: routingBucket,
        skip_any_model: skipAnyModel,
        workers,
        batch_size: batchSize,
        requested_limit: limit,
        processed,
        success,
        failed,
        elapsed_seconds: Number(elapsedSeconds.toFixed(1)),
        rows_per_second: Number((processed / elapsedSeconds).toFixed(2)),
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
        estimated_cost_usd: estimatedCostUsd,
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
