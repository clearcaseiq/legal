import { resolve } from 'path'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type CandidateRow = {
  url: string
  source_domain: string
  source_name: string
  page_title: string | null
  case_type_hint: string | null
  outcome_kind: string | null
  settlement_amount_text: string | null
  verdict_amount_text: string | null
  liability_percent_text: string | null
  incident_location_hint: string | null
  practice_area_hint: string | null
  published_date_hint: string | null
  extracted_summary: string | null
  raw_text_excerpt: string
  evidence_json: Record<string, unknown>
}

type LabelStatus =
  | 'case_level_outcome'
  | 'case_results_index'
  | 'aggregate_marketing'
  | 'practice_page'
  | 'mass_tort_article'
  | 'directory_or_article'
  | 'insufficient'

type CandidateLabel = {
  label_status: LabelStatus
  confidence: number
  is_case_level_outcome: boolean
  amount_text: string | null
  amount_kind: 'settlement' | 'verdict' | 'recovery' | 'award' | 'unknown' | null
  case_type: string | null
  injury_summary: string | null
  incident_year: number | null
  incident_location: string | null
  liability_percent: string | null
  is_aggregate_amount: boolean
  is_mass_tort_or_class_action: boolean
  exclusion_reason: string | null
  rationale: string
}

const MODEL = getArg('model') || 'gpt-4o-mini'
const PROVIDER = getArg('provider') || 'openai'

function getArg(name: string) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : undefined
}

function getIntArg(name: string, fallback: number) {
  const value = Number(getArg(name))
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required in api/.env.`)
  return value
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('LLM response did not contain JSON')
    return JSON.parse(match[0])
  }
}

function cleanConfidence(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number))
}

function normalizeLabel(raw: Record<string, unknown>): CandidateLabel {
  const allowed: LabelStatus[] = [
    'case_level_outcome',
    'case_results_index',
    'aggregate_marketing',
    'practice_page',
    'mass_tort_article',
    'directory_or_article',
    'insufficient',
  ]
  const labelStatus = allowed.includes(raw.label_status as LabelStatus) ? (raw.label_status as LabelStatus) : 'insufficient'
  const amountKind = ['settlement', 'verdict', 'recovery', 'award', 'unknown'].includes(String(raw.amount_kind || ''))
    ? (raw.amount_kind as CandidateLabel['amount_kind'])
    : null

  return {
    label_status: labelStatus,
    confidence: cleanConfidence(raw.confidence),
    is_case_level_outcome: Boolean(raw.is_case_level_outcome) && labelStatus === 'case_level_outcome',
    amount_text: typeof raw.amount_text === 'string' && raw.amount_text.trim() ? raw.amount_text.trim() : null,
    amount_kind: amountKind,
    case_type: typeof raw.case_type === 'string' && raw.case_type.trim() ? raw.case_type.trim() : null,
    injury_summary: typeof raw.injury_summary === 'string' && raw.injury_summary.trim() ? raw.injury_summary.trim().slice(0, 500) : null,
    incident_year: Number.isInteger(raw.incident_year) ? (raw.incident_year as number) : null,
    incident_location: typeof raw.incident_location === 'string' && raw.incident_location.trim() ? raw.incident_location.trim().slice(0, 200) : null,
    liability_percent: typeof raw.liability_percent === 'string' && raw.liability_percent.trim() ? raw.liability_percent.trim() : null,
    is_aggregate_amount: Boolean(raw.is_aggregate_amount),
    is_mass_tort_or_class_action: Boolean(raw.is_mass_tort_or_class_action),
    exclusion_reason: typeof raw.exclusion_reason === 'string' && raw.exclusion_reason.trim() ? raw.exclusion_reason.trim().slice(0, 300) : null,
    rationale: typeof raw.rationale === 'string' && raw.rationale.trim() ? raw.rationale.trim().slice(0, 500) : 'No rationale returned.',
  }
}

function buildPrompt(candidate: CandidateRow) {
  return `You are labeling law-firm website pages for machine-learning settlement training.

Classify whether this page describes a SINGLE case-level plaintiff personal injury outcome that can be used as a labeled settlement/verdict example.

Use label_status:
- case_level_outcome: ONE specific individual case, or one clearly separated case-result entry, where the selected amount belongs to that one case.
- case_results_index: a page listing many verdicts/settlements/results. Do not choose an aggregate firm total or one random case from an index page.
- aggregate_marketing: broad firm total, "over $1B recovered", "we recovered millions", marketing brag, homepage/about/practice total.
- practice_page: practice-area/location page that mentions possible compensation or firm totals, but not one case result.
- mass_tort_article: lawsuit update, mass tort, class action, multidistrict litigation, generic settlement estimate, not one resolved case.
- directory_or_article: third-party article/directory/news page rather than a firm's own specific case result.
- insufficient: not enough context or no usable outcome amount.

Important:
- If the page says "case results", "verdicts & settlements", "results", or lists multiple amounts/cases, classify as case_results_index unless the excerpt is clearly one isolated case detail.
- If the amount is a firmwide total such as "$2 billion recovered", "$1B recovered", "millions recovered", or "over $X recovered", classify as aggregate_marketing even if other specific case amounts appear.
- case_level_outcome must use the amount for one specific case, not a firm total or headline marketing total.

Return ONLY JSON:
{
  "label_status": "case_level_outcome|case_results_index|aggregate_marketing|practice_page|mass_tort_article|directory_or_article|insufficient",
  "confidence": 0.0,
  "is_case_level_outcome": false,
  "amount_text": null,
  "amount_kind": "settlement|verdict|recovery|award|unknown|null",
  "case_type": null,
  "injury_summary": null,
  "incident_year": null,
  "incident_location": null,
  "liability_percent": null,
  "is_aggregate_amount": false,
  "is_mass_tort_or_class_action": false,
  "exclusion_reason": null,
  "rationale": "short reason"
}

Candidate metadata:
url: ${candidate.url}
source_domain: ${candidate.source_domain}
page_title: ${candidate.page_title || ''}
case_type_hint: ${candidate.case_type_hint || ''}
outcome_kind_hint: ${candidate.outcome_kind || ''}
settlement_amount_text_hint: ${candidate.settlement_amount_text || ''}
verdict_amount_text_hint: ${candidate.verdict_amount_text || ''}
liability_percent_text_hint: ${candidate.liability_percent_text || ''}
published_date_hint: ${candidate.published_date_hint || ''}

Page text excerpt:
${candidate.raw_text_excerpt.slice(0, 5500)}`
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required for --provider=gemini.')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You are a careful legal data labeling system. Output only valid JSON.' }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  })
  const body = (await response.json().catch(async () => ({ error: await response.text() }))) as Record<string, unknown>
  if (!response.ok) throw new Error(`Gemini request failed ${response.status}: ${JSON.stringify(body).slice(0, 800)}`)

  const candidates = Array.isArray(body.candidates) ? body.candidates : []
  const firstCandidate = candidates[0] as Record<string, unknown> | undefined
  const content = firstCandidate?.content as Record<string, unknown> | undefined
  const parts = Array.isArray(content?.parts) ? content.parts : []
  const text = parts
    .map((part) => (part && typeof part === 'object' && 'text' in part ? String((part as { text?: unknown }).text || '') : ''))
    .join('\n')
    .trim()
  if (!text) throw new Error(`Gemini returned no text: ${JSON.stringify(body).slice(0, 800)}`)
  return normalizeLabel(parseJsonObject(text))
}

async function fetchBatch(prisma: PrismaClient, options: { limit: number; worker: number; workers: number }) {
  return prisma.$queryRawUnsafe<CandidateRow[]>(
    `
    select url, source_domain, source_name, page_title, case_type_hint, outcome_kind,
      settlement_amount_text, verdict_amount_text, liability_percent_text,
      incident_location_hint, practice_area_hint, published_date_hint,
      extracted_summary, raw_text_excerpt, evidence_json
    from cap.pi_website_case_candidates
    where label_status = 'candidate'
      and mod(abs(hashtext(url)), $2) = $3
    order by fetched_at asc
    limit $1
  `,
    options.limit,
    options.workers,
    options.worker,
  )
}

async function callOpenAI(openai: OpenAI, prompt: string) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a careful legal data labeling system. Output only valid JSON.' },
      { role: 'user', content: prompt },
    ],
  })

  return normalizeLabel(parseJsonObject(completion.choices[0]?.message?.content || '{}'))
}

async function labelCandidate(openai: OpenAI | null, candidate: CandidateRow) {
  const prompt = buildPrompt(candidate)
  if (PROVIDER === 'gemini') return callGemini(prompt)
  if (PROVIDER !== 'openai') throw new Error(`Unsupported provider "${PROVIDER}". Use openai or gemini.`)
  if (!openai) throw new Error('OpenAI client is required for --provider=openai.')
  return callOpenAI(openai, prompt)
}

async function updateLabel(prisma: PrismaClient, candidate: CandidateRow, label: CandidateLabel) {
  const evidenceJson = {
    ...(candidate.evidence_json || {}),
    labeling: {
      provider: PROVIDER,
      model: MODEL,
      labeled_at: new Date().toISOString(),
      ...label,
    },
  }

  await prisma.$executeRawUnsafe(
    `
    update cap.pi_website_case_candidates
    set label_status = $2,
      evidence_json = $3::jsonb,
      fetched_at = now()
    where url = $1
  `,
    candidate.url,
    label.label_status,
    JSON.stringify(evidenceJson),
  )
}

async function runWorker(worker: number, options: { databaseUrl: string; openai: OpenAI | null; limit: number; workers: number }) {
  const prisma = new PrismaClient({ datasources: { db: { url: options.databaseUrl } } })
  let processed = 0
  let failed = 0
  const byStatus: Record<string, number> = {}

  try {
    const candidates = await fetchBatch(prisma, { limit: options.limit, worker, workers: options.workers })
    for (const candidate of candidates) {
      try {
        const label = await labelCandidate(options.openai, candidate)
        await updateLabel(prisma, candidate, label)
        byStatus[label.label_status] = (byStatus[label.label_status] || 0) + 1
      } catch (error) {
        failed += 1
        byStatus.failed = (byStatus.failed || 0) + 1
        console.error(JSON.stringify({ worker, url: candidate.url, error: error instanceof Error ? error.message : String(error) }))
      }
      processed += 1
      if (processed % 25 === 0) console.log(JSON.stringify({ worker, processed, failed, byStatus }))
    }
  } finally {
    await prisma.$disconnect()
  }

  return { worker, processed, failed, byStatus }
}

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL or DATABASE_URL is required')

  const openai = PROVIDER === 'openai' ? new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') }) : null
  const limit = getIntArg('limit', 100)
  const workers = getIntArg('workers', 4)
  const perWorkerLimit = Math.ceil(limit / workers)

  const results = await Promise.all(
    Array.from({ length: workers }, (_, worker) => runWorker(worker, { databaseUrl, openai, limit: perWorkerLimit, workers })),
  )

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    const statuses = await prisma.$queryRawUnsafe(`
      select label_status, count(*)::int as rows
      from cap.pi_website_case_candidates
      group by label_status
      order by rows desc
    `)
    console.log(JSON.stringify({ model: MODEL, requested_limit: limit, workers, results, statuses }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
