/**
 * Multi-provider bake-off for Workflow adapt planning.
 *
 * Compares providers that have keys configured:
 *   - OpenAI (gpt-4o planning model)
 *   - Anthropic Claude (Messages API; planning model defaults to Sonnet)
 *   - Kimi / Moonshot
 *   - Baichuan
 *   - DeepSeek (optional)
 *
 * Uses synthetic keys-only packs (no PHI). Scores JSON validity, patch
 * apply-rate via applyWorkflowAdaptPlan, latency, and rough token cost.
 *
 * Usage (from api/):
 *   npx tsx scripts/compare-llm-planning.ts
 *   npx tsx scripts/compare-llm-planning.ts --out ../tmp/llm-planning-bakeoff.json
 *   npx tsx scripts/compare-llm-planning.ts --providers openai,claude
 *
 * Requires at least one provider key. Set ANTHROPIC_API_KEY to include Claude.
 */
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { ENV } from '../src/env'
import {
  applyWorkflowAdaptPlan,
  buildAdaptPrompt,
  type AdaptOp,
  type AdaptPlan,
  type WorkflowItemDraft,
} from '../src/lib/workflow-adapt'
import { toGapKeysOnlyCaseIntelligence } from '../src/lib/llm-prompt-sanitize'
import type { CaseIntelligence } from '../src/lib/case-intelligence'

type ProviderId = 'openai' | 'claude' | 'kimi' | 'baichuan' | 'deepseek'

type ProviderRun = {
  provider: ProviderId
  model: string
  fixtureId: string
  ok: boolean
  error?: string
  latencyMs: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  jsonParsed: boolean
  opCount: number
  appliedCount: number
  rejectedCount: number
  rejectedReasons: string[]
  ops: string[]
  rationale?: string
  rawPreview?: string
}

type ProviderSpec = {
  id: ProviderId
  model: string
  /** OpenAI-compatible chat.completions client (omit for Anthropic). */
  client?: OpenAI
  anthropic?: { apiKey: string; baseUrl: string }
  /** Some providers reject non-1 temperature or system role. */
  temperature: number
  maxTokens: number
  useJsonObjectFormat: boolean
  mergeSystemIntoUser: boolean
}

// Rough public list prices (USD / 1M tokens) — ranking only.
const PRICE: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-sonnet-4-5-20250929': { in: 3, out: 15 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-3-5-sonnet-latest': { in: 3, out: 15 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
  'claude-haiku-4-5': { in: 1, out: 5 },
  'claude-3-5-haiku-latest': { in: 0.8, out: 4 },
  'kimi-k3': { in: 0.6, out: 2.5 },
  'Baichuan4-Air': { in: 0.1, out: 0.1 },
  'Baichuan4-Turbo': { in: 0.5, out: 0.5 },
  'deepseek-chat': { in: 0.27, out: 1.1 },
  default: { in: 1, out: 3 },
}

function priceForModel(model: string): { in: number; out: number } {
  if (PRICE[model]) return PRICE[model]
  if (/claude.*haiku/i.test(model)) return PRICE['claude-3-5-haiku-latest']
  if (/claude.*sonnet/i.test(model)) return PRICE['claude-sonnet-4-5']
  return PRICE.default
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = priceForModel(model)
  return (promptTokens * p.in + completionTokens * p.out) / 1_000_000
}

function extractJsonText(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
}

async function completeAnthropic(params: {
  apiKey: string
  baseUrl: string
  model: string
  system: string
  user: string
  temperature: number
  maxTokens: number
}): Promise<{ text: string; promptTokens?: number; completionTokens?: number; totalTokens?: number; finishReason?: string }> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/v1/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    }),
  })
  const raw = await res.text()
  let body: any
  try {
    body = JSON.parse(raw)
  } catch {
    throw new Error(`anthropic_non_json_status_${res.status}: ${raw.slice(0, 200)}`)
  }
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || raw.slice(0, 200)
    throw new Error(`anthropic_${res.status}: ${msg}`)
  }
  const text = Array.isArray(body?.content)
    ? body.content
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => String(b.text || ''))
        .join('\n')
    : ''
  const promptTokens = body?.usage?.input_tokens
  const completionTokens = body?.usage?.output_tokens
  return {
    text,
    promptTokens,
    completionTokens,
    totalTokens:
      promptTokens != null && completionTokens != null ? promptTokens + completionTokens : undefined,
    finishReason: body?.stop_reason,
  }
}

function standardSteps(): WorkflowItemDraft[] {
  return [
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Case Opening',
      stageOrder: 0,
      title: 'Open matter & run conflict check',
      description: null,
      stepType: 'task',
      aiSignal: null,
      assigneeRole: 'case_manager',
      assignedFirmMemberId: null,
      dueOffsetDays: 0,
      dueDate: null,
      required: true,
      templateId: null,
      sortOrder: 0,
    },
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Case Opening',
      stageOrder: 0,
      title: 'Send retainer to client',
      description: null,
      stepType: 'document',
      aiSignal: null,
      assigneeRole: 'attorney',
      assignedFirmMemberId: null,
      dueOffsetDays: 1,
      dueDate: null,
      required: true,
      templateId: null,
      sortOrder: 1,
    },
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Case Opening',
      stageOrder: 0,
      title: 'Confirm signed representation agreement',
      description: null,
      stepType: 'document',
      aiSignal: null,
      assigneeRole: 'attorney',
      assignedFirmMemberId: null,
      dueOffsetDays: 2,
      dueDate: null,
      required: true,
      templateId: null,
      sortOrder: 2,
    },
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Case Opening',
      stageOrder: 0,
      title: 'Send client welcome packet',
      description: null,
      stepType: 'task',
      aiSignal: null,
      assigneeRole: 'intake_specialist',
      assignedFirmMemberId: null,
      dueOffsetDays: 3,
      dueDate: null,
      required: false,
      templateId: null,
      sortOrder: 3,
    },
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Records & Claims',
      stageOrder: 1,
      title: 'Request police / incident report',
      description: null,
      stepType: 'task',
      aiSignal: null,
      assigneeRole: 'paralegal',
      assignedFirmMemberId: null,
      dueOffsetDays: 3,
      dueDate: null,
      required: false,
      templateId: null,
      sortOrder: 0,
    },
    {
      phaseName: 'Intake & Setup',
      phaseOrder: 0,
      stageName: 'Records & Claims',
      stageOrder: 1,
      title: 'Open insurance claims (liability + UM/UIM)',
      description: null,
      stepType: 'task',
      aiSignal: null,
      assigneeRole: 'case_manager',
      assignedFirmMemberId: null,
      dueOffsetDays: 5,
      dueDate: null,
      required: true,
      templateId: null,
      sortOrder: 1,
    },
    {
      phaseName: 'Treatment & Investigation',
      phaseOrder: 1,
      stageName: 'Evidence & Records',
      stageOrder: 2,
      title: 'All medical records & bills received',
      description: null,
      stepType: 'ai_milestone',
      aiSignal: 'documents_complete',
      assigneeRole: null,
      assignedFirmMemberId: null,
      dueOffsetDays: null,
      dueDate: null,
      required: false,
      templateId: null,
      sortOrder: 0,
    },
  ]
}

function fixtureIntel(partial: {
  id: string
  claimType: string
  gapKeys: string[]
  known?: Array<{ key: string; label: string; value: string }>
}): { id: string; intel: CaseIntelligence; expectHints: string[] } {
  const gaps = partial.gapKeys.map((key) => ({
    key,
    label: key,
    category: key.includes('medical') || key.includes('hipaa') ? 'medical' : 'evidence',
    severity: 4,
    valueImpact: 'high' as const,
    rationale: 'synthetic',
    actions: [] as any[],
    resolved: false,
  }))
  const raw = {
    assessmentId: `bakeoff_${partial.id}`,
    claimType: partial.claimType,
    claimTypeKey: partial.claimType,
    generatedAt: new Date().toISOString(),
    modelVersion: 'bakeoff',
    summary: {
      severity: { label: 'moderate', score: 50 },
      estimatedValue: { low: 0, expected: 0, high: 0 },
      attorneyInterest: 0.5,
      liability: { grade: 'B', score: 70 },
      caseStrength: 60,
      sol: { daysRemaining: 600, expiresAt: null, status: 'ok' },
      medical: '',
      evidence: '',
      documentation: { score: 40, grade: 'C' },
      economic: { medicalBills: 0, futureMedical: 0, lostWages: 0 },
    },
    known: partial.known || [
      { key: 'claim_type', label: 'Case type', value: partial.claimType },
      { key: 'venue', label: 'Venue', value: 'Los Angeles, CA' },
      { key: 'evidence', label: 'Evidence on file', value: 'None uploaded yet' },
      { key: 'sol', label: 'SOL remaining', value: '600 days' },
    ],
    gaps,
    narrative: 'SHOULD_NOT_APPEAR_IN_KEYS_ONLY cervical herniation MRI',
  } as CaseIntelligence

  const intel = toGapKeysOnlyCaseIntelligence(raw)
  const expectHints: string[] = []
  if (partial.gapKeys.some((k) => /hipaa/i.test(k))) expectHints.push('add_hipaa')
  if (partial.gapKeys.some((k) => /police/i.test(k))) expectHints.push('keep_or_touch_police')
  if (partial.gapKeys.some((k) => /um_uim|insurance/i.test(k))) expectHints.push('insurance_claim')
  return { id: partial.id, intel, expectHints }
}

const FIXTURES = [
  fixtureIntel({
    id: 'auto_day1_hipaa',
    claimType: 'auto',
    gapKeys: ['gap_hipaa_auth', 'gap_medical_records', 'gap_police_report'],
  }),
  fixtureIntel({
    id: 'auto_no_police',
    claimType: 'auto',
    gapKeys: ['gap_medical_records', 'gap_um_uim', 'gap_hipaa_auth'],
    known: [
      { key: 'claim_type', label: 'Case type', value: 'auto' },
      { key: 'venue', label: 'Venue', value: 'Orange County, CA' },
      { key: 'evidence', label: 'Evidence on file', value: 'Photos' },
      { key: 'um_uim', label: 'UM/UIM', value: 'Available' },
      { key: 'sol', label: 'SOL remaining', value: '500 days' },
    ],
  }),
  fixtureIntel({
    id: 'premises_records',
    claimType: 'premises',
    gapKeys: ['gap_medical_records', 'gap_photos', 'gap_hipaa_auth'],
  }),
]

function sanitizeOps(raw: unknown): AdaptOp[] {
  if (!Array.isArray(raw)) return []
  const out: AdaptOp[] = []
  for (const item of raw) {
    const op = String((item as any)?.op || '').toLowerCase()
    if (op === 'skip' && (item as any).matchTitle) {
      out.push({ op: 'skip', matchTitle: String((item as any).matchTitle), reason: (item as any).reason })
    } else if (op === 'add' && ((item as any).step?.title || (item as any).title)) {
      out.push({
        op: 'add',
        afterTitle: (item as any).afterTitle ?? null,
        step: {
          title: String((item as any).step?.title || (item as any).title),
          description: (item as any).step?.description,
          stepType: (item as any).step?.stepType || 'task',
          assigneeRole: (item as any).step?.assigneeRole,
          dueOffsetDays: (item as any).step?.dueOffsetDays,
          required: Boolean((item as any).step?.required),
        },
        reason: (item as any).reason,
      })
    } else if (op === 'rename' && (item as any).matchTitle && (item as any).title) {
      out.push({
        op: 'rename',
        matchTitle: String((item as any).matchTitle),
        title: String((item as any).title),
        description: (item as any).description,
        reason: (item as any).reason,
      })
    } else if (op === 'reschedule' && (item as any).matchTitle != null) {
      out.push({
        op: 'reschedule',
        matchTitle: String((item as any).matchTitle),
        dueOffsetDays: Number((item as any).dueOffsetDays) || 0,
        reason: (item as any).reason,
      })
    }
  }
  return out
}

async function runOne(params: {
  spec: ProviderSpec
  fixture: (typeof FIXTURES)[0]
}): Promise<ProviderRun> {
  const { spec } = params
  const steps = standardSteps()
  const userPrompt = buildAdaptPrompt(params.fixture.intel as any, steps)
  const system =
    'You are a senior PI case manager. Always respond with valid JSON as specified. Never fabricate facts. Prefer minimal, high-value patches over large rewrites.'
  const messages = spec.mergeSystemIntoUser
    ? [{ role: 'user' as const, content: `${system}\n\n${userPrompt}` }]
    : [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: userPrompt },
      ]

  const started = Date.now()
  try {
    let text = ''
    let promptTokens: number | undefined
    let completionTokens: number | undefined
    let totalTokens: number | undefined
    let finishReason: string | undefined
    let reasoningTokens: number | undefined

    if (spec.anthropic) {
      const completion = await completeAnthropic({
        apiKey: spec.anthropic.apiKey,
        baseUrl: spec.anthropic.baseUrl,
        model: spec.model,
        system,
        user: userPrompt,
        temperature: spec.temperature,
        maxTokens: spec.maxTokens,
      })
      text = completion.text
      promptTokens = completion.promptTokens
      completionTokens = completion.completionTokens
      totalTokens = completion.totalTokens
      finishReason = completion.finishReason
    } else if (spec.client) {
      const body: any = {
        model: spec.model,
        messages,
        temperature: spec.temperature,
        max_tokens: spec.maxTokens,
      }
      if (spec.useJsonObjectFormat) {
        body.response_format = { type: 'json_object' }
      }
      const completion = await spec.client.chat.completions.create(body)
      const msg: any = completion.choices[0]?.message
      text = String(msg?.content || '')
      const usage = completion.usage
      promptTokens = usage?.prompt_tokens
      completionTokens = usage?.completion_tokens
      totalTokens = usage?.total_tokens
      finishReason = completion.choices[0]?.finish_reason || undefined
      reasoningTokens = (usage as any)?.completion_tokens_details?.reasoning_tokens
    } else {
      throw new Error('provider_misconfigured_no_client')
    }

    const latencyMs = Date.now() - started
    let jsonParsed = false
    let plan: AdaptPlan = { rationale: '', ops: [] }
    let parseError: string | undefined
    try {
      const cleaned = extractJsonText(text)
      const parsed = JSON.parse(cleaned)
      plan = {
        rationale: String(parsed.rationale || ''),
        ops: sanitizeOps(parsed.ops),
      }
      jsonParsed = true
    } catch (e: any) {
      jsonParsed = false
      parseError = e?.message || 'json_parse_failed'
    }
    const applied = jsonParsed
      ? applyWorkflowAdaptPlan(steps, plan, new Date('2026-01-01T00:00:00.000Z'))
      : { applied: [], rejected: [], rationale: '', items: steps }

    return {
      provider: spec.id,
      model: spec.model,
      fixtureId: params.fixture.id,
      ok: jsonParsed,
      error: jsonParsed
        ? undefined
        : parseError ||
          `finish=${finishReason || '?'} contentLen=${text.length} reasoningTokens=${reasoningTokens ?? '?'}`,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd:
        promptTokens != null && completionTokens != null
          ? estimateCost(spec.model, promptTokens, completionTokens)
          : undefined,
      jsonParsed,
      opCount: plan.ops.length,
      appliedCount: applied.applied.length,
      rejectedCount: applied.rejected.length,
      rejectedReasons: applied.rejected.map((r) => r.reason),
      ops: plan.ops.map((o) => o.op),
      rationale: plan.rationale.slice(0, 240),
      rawPreview: text.slice(0, 200),
    }
  } catch (e: any) {
    return {
      provider: spec.id,
      model: spec.model,
      fixtureId: params.fixture.id,
      ok: false,
      error: e?.message || String(e),
      latencyMs: Date.now() - started,
      jsonParsed: false,
      opCount: 0,
      appliedCount: 0,
      rejectedCount: 0,
      rejectedReasons: [],
      ops: [],
    }
  }
}

function summarize(runs: ProviderRun[]) {
  const ids = [...new Set(runs.map((r) => r.provider))]
  const out: Record<string, any> = {}
  for (const id of ids) {
    const rows = runs.filter((r) => r.provider === id)
    if (!rows.length) {
      out[id] = null
      continue
    }
    const ok = rows.filter((r) => r.ok).length
    const avg = (fn: (r: ProviderRun) => number) =>
      rows.reduce((s, r) => s + fn(r), 0) / rows.length
    out[id] = {
      runs: rows.length,
      successRate: ok / rows.length,
      avgLatencyMs: Math.round(avg((r) => r.latencyMs)),
      avgApplied: Number(avg((r) => r.appliedCount).toFixed(2)),
      avgRejected: Number(avg((r) => r.rejectedCount).toFixed(2)),
      avgOps: Number(avg((r) => r.opCount).toFixed(2)),
      totalCostUsd: Number(rows.reduce((s, r) => s + (r.estimatedCostUsd || 0), 0).toFixed(5)),
      model: rows[0]?.model,
      errors: rows.filter((r) => !r.ok).map((r) => r.error).filter(Boolean),
    }
  }
  return out
}

function resolveProviders(filter?: Set<string>): ProviderSpec[] {
  const all: ProviderSpec[] = []
  if (ENV.OPENAI_API_KEY) {
    all.push({
      id: 'openai',
      model: ENV.OPENAI_PLANNING_MODEL || 'gpt-4o',
      client: new OpenAI({ apiKey: ENV.OPENAI_API_KEY }),
      temperature: 0.3,
      maxTokens: 1600,
      useJsonObjectFormat: true,
      mergeSystemIntoUser: false,
    })
  }
  if (ENV.ANTHROPIC_API_KEY) {
    all.push({
      id: 'claude',
      model: ENV.ANTHROPIC_PLANNING_MODEL || ENV.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      anthropic: {
        apiKey: ENV.ANTHROPIC_API_KEY,
        baseUrl: ENV.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      },
      temperature: 0.3,
      maxTokens: 1600,
      useJsonObjectFormat: false,
      mergeSystemIntoUser: false,
    })
  }
  if (ENV.KIMI_API_KEY) {
    all.push({
      id: 'kimi',
      model: ENV.KIMI_PLANNING_MODEL || ENV.KIMI_MODEL || 'kimi-k3',
      client: new OpenAI({ apiKey: ENV.KIMI_API_KEY, baseURL: ENV.KIMI_BASE_URL }),
      temperature: 1,
      maxTokens: 8192,
      useJsonObjectFormat: true,
      mergeSystemIntoUser: false,
    })
  }
  if (ENV.BAICHUAN_API_KEY) {
    all.push({
      id: 'baichuan',
      model: ENV.BAICHUAN_MODEL || 'Baichuan4-Air',
      client: new OpenAI({
        apiKey: ENV.BAICHUAN_API_KEY,
        baseURL: ENV.BAICHUAN_BASE_URL || 'https://api.baichuan-ai.com/v1',
      }),
      temperature: 0.3,
      maxTokens: 2048,
      // Some Baichuan accounts are picky about response_format / system role.
      useJsonObjectFormat: false,
      mergeSystemIntoUser: true,
    })
  }
  if (ENV.DEEPSEEK_API_KEY) {
    all.push({
      id: 'deepseek',
      model: ENV.DEEPSEEK_MODEL || 'deepseek-chat',
      client: new OpenAI({
        apiKey: ENV.DEEPSEEK_API_KEY,
        baseURL: ENV.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      }),
      temperature: 0.3,
      maxTokens: 2048,
      useJsonObjectFormat: true,
      mergeSystemIntoUser: false,
    })
  }
  if (!filter || filter.size === 0) return all
  return all.filter((p) => filter.has(p.id))
}

async function main() {
  const outIdx = process.argv.indexOf('--out')
  const outPath =
    outIdx >= 0 && process.argv[outIdx + 1]
      ? path.resolve(process.argv[outIdx + 1])
      : path.resolve(__dirname, '../../tmp/llm-planning-bakeoff.json')

  const providersIdx = process.argv.indexOf('--providers')
  const filter =
    providersIdx >= 0 && process.argv[providersIdx + 1]
      ? new Set(
          process.argv[providersIdx + 1]
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        )
      : undefined

  const providers = resolveProviders(filter)
  if (!providers.length) {
    console.error(
      'No providers configured. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY and/or KIMI_API_KEY and/or BAICHUAN_API_KEY and/or DEEPSEEK_API_KEY.',
    )
    process.exit(1)
  }

  console.log('PHI mode for prompts: keys_only')
  console.log(
    'Providers:',
    providers.map((p) => `${p.id}/${p.model}`).join(', '),
  )
  console.log('Fixtures:', FIXTURES.map((f) => f.id).join(', '))

  const runs: ProviderRun[] = []
  for (const fixture of FIXTURES) {
    for (const spec of providers) {
      console.log(`\n--- fixture ${fixture.id} / ${spec.id} ---`)
      const row = await runOne({ spec, fixture })
      runs.push(row)
      console.log(
        JSON.stringify({
          ok: row.ok,
          latencyMs: row.latencyMs,
          applied: row.appliedCount,
          ops: row.ops,
          error: row.error,
        }),
      )
    }
  }

  const summary = summarize(runs)
  const report = {
    generatedAt: new Date().toISOString(),
    phiMode: 'keys_only',
    useCase: 'workflow_adapt_planning',
    providers: providers.map((p) => ({ id: p.id, model: p.model })),
    summary,
    runs,
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(summary, null, 2))
  console.log('Wrote', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
