/**
 * Case-scoped Workflow adaptation on top of the firm blueprint snapshot.
 *
 * GPT proposes a patch list (skip / add / rename / reschedule / annotate /
 * retarget). Code validates patches against protected steps and applies them.
 * Failures leave the blueprint snapshot unchanged.
 */
import { ENV } from '../env'
import { logger } from './logger'
import { buildCaseIntelligence } from './case-intelligence'
import { prepareCaseIntelligenceForLlm, llmPhiMode } from './llm-prompt-sanitize'
import { resolveLlmPlanningCandidates, llmChatCompleteWithFallback } from './llm-client'
import { recordAiRun } from './ai-run'
import { prisma } from './prisma'
import { syncWorkflowStepTasks } from './workflow-step-tasks'

function maxOps() {
  return ENV.WORKFLOW_AI_ADAPT_MAX_OPS
}
function maxAdds() {
  return ENV.WORKFLOW_AI_ADAPT_MAX_ADDS
}

const VALID_STEP_TYPES = new Set([
  'task',
  'milestone',
  'checkpoint',
  'deadline',
  'document',
])

const VALID_ASSIGNEE_ROLES = new Set([
  'paralegal',
  'attorney',
  'case_manager',
  'intake_specialist',
])

/** Titles matching these cannot be skipped/removed (core Day-1 / compliance). */
const PROTECTED_TITLE_RE =
  /\b(conflict|retainer|representation agreement|hipaa|consent|statute of limitations|\bsol\b)\b/i

const MAX_DESCRIPTION_CHARS = 600

export type WorkflowItemDraft = {
  phaseName: string | null
  phaseOrder: number | null
  stageName: string
  stageOrder: number
  title: string
  description: string | null
  stepType: string
  aiSignal: string | null
  assigneeRole: string | null
  assignedFirmMemberId: string | null
  dueOffsetDays: number | null
  dueDate: Date | null
  required: boolean
  templateId: string | null
  sortOrder: number
  custom?: boolean
  id?: string
  status?: string
}

export type AdaptOp =
  | { op: 'skip'; matchTitle: string; reason?: string }
  | {
      op: 'add'
      afterTitle?: string | null
      step: {
        title: string
        description?: string | null
        stepType?: string
        assigneeRole?: string | null
        dueOffsetDays?: number | null
        required?: boolean
        phaseName?: string | null
        stageName?: string | null
      }
      reason?: string
    }
  | { op: 'rename'; matchTitle: string; title: string; description?: string | null; reason?: string }
  | { op: 'reschedule'; matchTitle: string; dueOffsetDays: number; reason?: string }
  | { op: 'annotate'; matchTitle: string; description: string; reason?: string }
  | { op: 'retarget'; matchTitle: string; assigneeRole: string; reason?: string }

export function openGapFingerprint(
  gaps: Array<{ key?: string; resolved?: boolean }>,
): string {
  return gaps
    .filter((g) => !g.resolved && g.key)
    .map((g) => String(g.key))
    .sort()
    .join('|')
}

function clipDescription(raw: unknown): string | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  return text.length > MAX_DESCRIPTION_CHARS ? text.slice(0, MAX_DESCRIPTION_CHARS) : text
}

function normalizeAssigneeRole(raw: unknown): string | null {
  if (raw == null) return null
  const role = String(raw).trim().toLowerCase().replace(/\s+/g, '_')
  return VALID_ASSIGNEE_ROLES.has(role) ? role : null
}

export type AdaptPlan = {
  rationale: string
  ops: AdaptOp[]
}

export type AdaptApplyResult = {
  items: WorkflowItemDraft[]
  applied: AdaptOp[]
  rejected: Array<{ op: AdaptOp; reason: string }>
  rationale: string
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isProtectedWorkflowStep(item: Pick<WorkflowItemDraft, 'title' | 'required' | 'stepType'>): boolean {
  if (item.stepType === 'ai_milestone') return true
  if (item.required) return true
  return PROTECTED_TITLE_RE.test(item.title || '')
}

function normTitle(t: string): string {
  return String(t || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findByTitle(items: WorkflowItemDraft[], title: string): number {
  const key = normTitle(title)
  return items.findIndex((it) => normTitle(it.title) === key)
}

function sanitizeOp(raw: any): AdaptOp | null {
  const op = String(raw?.op || '').toLowerCase()
  if (op === 'skip') {
    const matchTitle = String(raw?.matchTitle || '').trim()
    if (!matchTitle) return null
    return { op: 'skip', matchTitle, reason: raw?.reason ? String(raw.reason) : undefined }
  }
  if (op === 'rename') {
    const matchTitle = String(raw?.matchTitle || '').trim()
    const title = String(raw?.title || '').trim()
    if (!matchTitle || !title) return null
    return {
      op: 'rename',
      matchTitle,
      title,
      description: raw?.description !== undefined ? clipDescription(raw.description) : undefined,
      reason: raw?.reason ? String(raw.reason) : undefined,
    }
  }
  if (op === 'reschedule') {
    const matchTitle = String(raw?.matchTitle || '').trim()
    const dueOffsetDays = Number(raw?.dueOffsetDays)
    if (!matchTitle || !Number.isFinite(dueOffsetDays)) return null
    return {
      op: 'reschedule',
      matchTitle,
      dueOffsetDays: Math.max(0, Math.min(365, Math.round(dueOffsetDays))),
      reason: raw?.reason ? String(raw.reason) : undefined,
    }
  }
  if (op === 'annotate') {
    const matchTitle = String(raw?.matchTitle || '').trim()
    const description = clipDescription(raw?.description)
    if (!matchTitle || !description) return null
    return {
      op: 'annotate',
      matchTitle,
      description,
      reason: raw?.reason ? String(raw.reason) : undefined,
    }
  }
  if (op === 'retarget') {
    const matchTitle = String(raw?.matchTitle || '').trim()
    const assigneeRole = normalizeAssigneeRole(raw?.assigneeRole)
    if (!matchTitle || !assigneeRole) return null
    return {
      op: 'retarget',
      matchTitle,
      assigneeRole,
      reason: raw?.reason ? String(raw.reason) : undefined,
    }
  }
  if (op === 'add') {
    const title = String(raw?.step?.title || raw?.title || '').trim()
    if (!title) return null
    const stepTypeRaw = String(raw?.step?.stepType || 'task').toLowerCase()
    const stepType = VALID_STEP_TYPES.has(stepTypeRaw) ? stepTypeRaw : 'task'
    return {
      op: 'add',
      afterTitle: raw?.afterTitle != null ? String(raw.afterTitle) : null,
      step: {
        title,
        description: clipDescription(raw?.step?.description ?? raw?.description),
        stepType,
        assigneeRole: normalizeAssigneeRole(raw?.step?.assigneeRole ?? raw?.assigneeRole),
        dueOffsetDays:
          typeof raw?.step?.dueOffsetDays === 'number' && Number.isFinite(raw.step.dueOffsetDays)
            ? Math.max(0, Math.min(365, Math.round(raw.step.dueOffsetDays)))
            : null,
        required: Boolean(raw?.step?.required),
        phaseName: raw?.step?.phaseName != null ? String(raw.step.phaseName) : null,
        stageName: raw?.step?.stageName != null ? String(raw.step.stageName) : null,
      },
      reason: raw?.reason ? String(raw.reason) : undefined,
    }
  }
  return null
}

/** Pure patch applicator — unit-tested without calling the LLM. */
export function applyWorkflowAdaptPlan(
  itemsIn: WorkflowItemDraft[],
  plan: AdaptPlan,
  startDate: Date = new Date(),
): AdaptApplyResult {
  const items = itemsIn.map((it) => ({ ...it }))
  const applied: AdaptOp[] = []
  const rejected: Array<{ op: AdaptOp; reason: string }> = []
  let addCount = 0

  const ops = (plan.ops || []).slice(0, maxOps())
  for (const op of ops) {
    if (op.op === 'skip') {
      const idx = findByTitle(items, op.matchTitle)
      if (idx < 0) {
        rejected.push({ op, reason: 'step_not_found' })
        continue
      }
      const item = items[idx]
      if (isProtectedWorkflowStep(item)) {
        rejected.push({ op, reason: 'protected_step' })
        continue
      }
      if (item.status && item.status !== 'pending') {
        rejected.push({ op, reason: 'not_pending' })
        continue
      }
      // Mark skipped via status when present; otherwise drop from draft (apply-time).
      if (item.id || item.status != null) {
        item.status = 'skipped'
      } else {
        items.splice(idx, 1)
      }
      applied.push(op)
      continue
    }

    if (op.op === 'rename') {
      const idx = findByTitle(items, op.matchTitle)
      if (idx < 0) {
        rejected.push({ op, reason: 'step_not_found' })
        continue
      }
      const item = items[idx]
      if (item.stepType === 'ai_milestone') {
        rejected.push({ op, reason: 'protected_step' })
        continue
      }
      if (item.status && item.status !== 'pending') {
        rejected.push({ op, reason: 'not_pending' })
        continue
      }
      item.title = op.title.trim()
      if (op.description !== undefined) {
        item.description = clipDescription(op.description)
      }
      applied.push(op)
      continue
    }

    if (op.op === 'reschedule') {
      const idx = findByTitle(items, op.matchTitle)
      if (idx < 0) {
        rejected.push({ op, reason: 'step_not_found' })
        continue
      }
      const item = items[idx]
      if (item.stepType === 'ai_milestone') {
        rejected.push({ op, reason: 'protected_step' })
        continue
      }
      if (item.status && item.status !== 'pending') {
        rejected.push({ op, reason: 'not_pending' })
        continue
      }
      item.dueOffsetDays = op.dueOffsetDays
      item.dueDate = addDays(startDate, op.dueOffsetDays)
      applied.push(op)
      continue
    }

    if (op.op === 'annotate') {
      const idx = findByTitle(items, op.matchTitle)
      if (idx < 0) {
        rejected.push({ op, reason: 'step_not_found' })
        continue
      }
      const item = items[idx]
      if (item.stepType === 'ai_milestone') {
        rejected.push({ op, reason: 'protected_step' })
        continue
      }
      if (item.status && item.status !== 'pending') {
        rejected.push({ op, reason: 'not_pending' })
        continue
      }
      item.description = op.description
      applied.push(op)
      continue
    }

    if (op.op === 'retarget') {
      const idx = findByTitle(items, op.matchTitle)
      if (idx < 0) {
        rejected.push({ op, reason: 'step_not_found' })
        continue
      }
      const item = items[idx]
      if (item.stepType === 'ai_milestone') {
        rejected.push({ op, reason: 'protected_step' })
        continue
      }
      if (item.status && item.status !== 'pending') {
        rejected.push({ op, reason: 'not_pending' })
        continue
      }
      item.assigneeRole = op.assigneeRole
      applied.push(op)
      continue
    }

    if (op.op === 'add') {
      if (addCount >= maxAdds()) {
        rejected.push({ op, reason: 'max_adds' })
        continue
      }
      if (findByTitle(items, op.step.title) >= 0) {
        rejected.push({ op, reason: 'duplicate_title' })
        continue
      }
      let insertAt = items.length
      let phaseName: string | null = op.step.phaseName ?? null
      let phaseOrder: number | null = null
      let stageName = op.step.stageName || 'Case Opening'
      let stageOrder = 0

      if (op.afterTitle) {
        const afterIdx = findByTitle(items, op.afterTitle)
        if (afterIdx >= 0) {
          const anchor = items[afterIdx]
          insertAt = afterIdx + 1
          phaseName = phaseName ?? anchor.phaseName
          phaseOrder = anchor.phaseOrder
          stageName = op.step.stageName || anchor.stageName
          stageOrder = anchor.stageOrder
        }
      } else if (items.length > 0) {
        const first = items[0]
        phaseName = phaseName ?? first.phaseName
        phaseOrder = first.phaseOrder
        stageName = op.step.stageName || first.stageName
        stageOrder = first.stageOrder
        // Insert near the end of the first stage group.
        insertAt = items.findIndex((it) => it.stageOrder !== stageOrder)
        if (insertAt < 0) insertAt = items.length
      }

      const dueOffsetDays = op.step.dueOffsetDays ?? null
      const draft: WorkflowItemDraft = {
        phaseName,
        phaseOrder,
        stageName,
        stageOrder,
        title: op.step.title.trim(),
        description: op.step.description?.trim() ? op.step.description.trim() : null,
        stepType: op.step.stepType || 'task',
        aiSignal: null,
        assigneeRole: op.step.assigneeRole || null,
        assignedFirmMemberId: null,
        dueOffsetDays,
        dueDate: typeof dueOffsetDays === 'number' ? addDays(startDate, dueOffsetDays) : null,
        required: Boolean(op.step.required),
        templateId: null,
        sortOrder: 0,
        custom: true,
        status: 'pending',
      }
      items.splice(insertAt, 0, draft)
      addCount++
      applied.push(op)
    }
  }

  // Re-number sortOrder within each stage.
  const byStage = new Map<string, WorkflowItemDraft[]>()
  for (const it of items) {
    const key = `${it.phaseOrder ?? 0}:${it.stageOrder}`
    if (!byStage.has(key)) byStage.set(key, [])
    byStage.get(key)!.push(it)
  }
  for (const group of byStage.values()) {
    group.forEach((it, i) => {
      it.sortOrder = i
    })
  }

  return {
    items,
    applied,
    rejected,
    rationale: String(plan.rationale || '').trim(),
  }
}

/** Exported for bake-off / eval scripts — same prompt production uses. */
export function buildAdaptPrompt(
  intel: NonNullable<Awaited<ReturnType<typeof buildCaseIntelligence>>>,
  items: WorkflowItemDraft[],
): string {
  const known = intel.known
    .slice(0, 24)
    .map((k) => `- ${k.label}: ${k.value}`)
    .join('\n')
  const gaps = intel.gaps
    .filter((g) => !g.resolved)
    .slice(0, 20)
    .map((g) => `- [${g.key}] ${g.label} (${g.category}, impact: ${g.valueImpact})`)
    .join('\n')
  const steps = items
    .map((it, i) => {
      const bits = [
        `[${it.stepType}${it.required ? ', required' : ''}${it.status ? `, ${it.status}` : ''}]`,
        it.title,
      ]
      if (it.assigneeRole) bits.push(`role=${it.assigneeRole}`)
      if (it.dueOffsetDays != null) bits.push(`due+${it.dueOffsetDays}d`)
      if (it.phaseName || it.stageName) bits.push(`${it.phaseName || ''}/${it.stageName}`)
      const desc = it.description?.trim()
      const line = `${i + 1}. ${bits.join(' ')}`
      return desc ? `${line}\n     note: ${desc.slice(0, 160)}` : line
    })
    .join('\n')

  const phiMode = llmPhiMode()
  const narrativeLine =
    phiMode === 'keys_only'
      ? 'INCIDENT NARRATIVE: [omitted — LLM_ALLOW_PHI=false; use gap keys only]'
      : `INCIDENT NARRATIVE: ${(intel.narrative || 'Not provided.').slice(0, 1200)}`

  return `You adapt a STANDARD personal-injury firm workflow to ONE specific case.
You propose a focused patch list. The firm blueprint stays the base — enrich it for THIS case.
PHI_MODE: ${phiMode}${phiMode === 'keys_only' ? ' — no medical narrative/injuries/treatment; decide from gap keys and step list only.' : ''}

CASE TYPE: ${intel.claimType}
${narrativeLine}

ALREADY KNOWN:
${known || '(none)'}

OPEN GAPS (use keys when adding work):
${gaps || '(none)'}

CURRENT WORKFLOW STEPS (do not invent a full replacement pipeline):
${steps || '(none)'}

Rules:
- Cover high-impact open gaps with add / annotate / retarget / reschedule when useful.
- Prefer enriching existing steps (annotate description, retarget role, reschedule) before adding duplicates.
- At most ${maxOps()} ops and at most ${maxAdds()} add ops.
- NEVER skip or remove: conflict check, retainer / representation agreement, HIPAA / consent, SOL / statute of limitations, required steps, or ai_milestone steps.
- When adding a step, ALWAYS include a short actionable description (what to do + why for this case) and a sensible assigneeRole + dueOffsetDays.
- Use annotate to add case-specific guidance on existing pending steps (including protected ones).
- Use retarget to assign the right role: paralegal | attorney | case_manager | intake_specialist.
- matchTitle must exactly match an existing step title above.
- Do NOT invent dollar figures, deadlines from thin air, or medical facts.
- Do NOT ask for or assume SSN, email, phone, street address, or clinical details not present above.

Respond with STRICT JSON only:
{
  "rationale": "one short paragraph",
  "ops": [
    { "op": "skip", "matchTitle": "...", "reason": "..." },
    { "op": "rename", "matchTitle": "...", "title": "...", "description": "...", "reason": "..." },
    { "op": "reschedule", "matchTitle": "...", "dueOffsetDays": 7, "reason": "..." },
    { "op": "annotate", "matchTitle": "...", "description": "case-specific guidance for the assignee", "reason": "..." },
    { "op": "retarget", "matchTitle": "...", "assigneeRole": "paralegal", "reason": "..." },
    { "op": "add", "afterTitle": "...", "step": { "title": "...", "description": "...", "stepType": "task|document|checkpoint|milestone|deadline", "assigneeRole": "paralegal|attorney|case_manager|intake_specialist", "dueOffsetDays": 3, "required": false, "phaseName": null, "stageName": null }, "reason": "..." }
  ]
}`
}

async function requestAdaptPlan(params: {
  assessmentId: string
  items: WorkflowItemDraft[]
}): Promise<{ plan: AdaptPlan | null; runId: string | null; model: string | null; provider: string | null }> {
  if (!ENV.WORKFLOW_AI_ADAPT) {
    await recordAiRun({
      kind: 'workflow_adapt',
      assessmentId: params.assessmentId,
      status: 'skipped',
      inputSummary: { reason: 'WORKFLOW_AI_ADAPT=false', stepCount: params.items.length },
    })
    return { plan: null, runId: null, model: null, provider: null }
  }

  const candidates = resolveLlmPlanningCandidates()
  if (!candidates.length) {
    await recordAiRun({
      kind: 'workflow_adapt',
      assessmentId: params.assessmentId,
      status: 'skipped',
      inputSummary: { reason: 'no_llm_client', stepCount: params.items.length },
    })
    return { plan: null, runId: null, model: null, provider: null }
  }

  const intelRaw = await buildCaseIntelligence(params.assessmentId).catch(() => null)
  if (!intelRaw) {
    await recordAiRun({
      kind: 'workflow_adapt',
      assessmentId: params.assessmentId,
      provider: candidates[0].provider,
      model: candidates[0].model,
      status: 'skipped',
      inputSummary: { reason: 'no_case_intelligence', stepCount: params.items.length },
    })
    return { plan: null, runId: null, model: candidates[0].model, provider: candidates[0].provider }
  }
  // Contact PII always redacted; medical detail only when LLM_ALLOW_PHI=true.
  const { intel, phiMode } = prepareCaseIntelligenceForLlm(intelRaw)
  const gapFingerprint = openGapFingerprint(intel.gaps)

  const started = Date.now()
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are a senior PI case manager. Always respond with valid JSON as specified. Never fabricate facts. Prefer high-value, case-specific patches: add missing gap work, annotate guidance, retarget roles, and reschedule when timing matters. Keep the firm blueprint as the base. The prompt is privacy-filtered — do not ask for SSN, email, phone, street address, or clinical details omitted from the pack.',
    },
    { role: 'user' as const, content: buildAdaptPrompt(intel, params.items) },
  ]

  try {
    const { result: completion, resolved, attempted } = await llmChatCompleteWithFallback({
      kind: 'workflow_adapt',
      candidates,
      run: (candidate) =>
        candidate.client.chat.completions.create({
          model: candidate.model,
          messages,
          temperature: 0.3,
          max_tokens: 2400,
          response_format: { type: 'json_object' },
        }),
    })

    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Empty planning response')
    const parsed = JSON.parse(text) as { rationale?: unknown; ops?: unknown }
    const ops: AdaptOp[] = []
    if (Array.isArray(parsed.ops)) {
      for (const raw of parsed.ops) {
        const op = sanitizeOp(raw)
        if (op) ops.push(op)
      }
    }
    const plan: AdaptPlan = {
      rationale: String(parsed.rationale || '').trim(),
      ops: ops.slice(0, maxOps()),
    }

    const usage = completion.usage
    const runId = await recordAiRun({
      kind: 'workflow_adapt',
      assessmentId: params.assessmentId,
      provider: resolved.provider,
      model: resolved.model,
      status: 'ok',
      latencyMs: Date.now() - started,
      inputSummary: {
        claimType: intel.claimType,
        gapCount: intel.gaps.filter((g) => !g.resolved).length,
        gapFingerprint,
        stepCount: params.items.length,
        phiMode,
        maxOps: maxOps(),
        maxAdds: maxAdds(),
        primary: `${candidates[0].provider}:${candidates[0].model}`,
        usedFallback: attempted.length > 1,
        attempted,
      },
      outputSummary: {
        rationale: plan.rationale.slice(0, 400),
        opCount: plan.ops.length,
        ops: plan.ops.map((o) => o.op),
        gapFingerprint,
      },
      tokenUsage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : null,
    })

    return { plan, runId, model: resolved.model, provider: resolved.provider }
  } catch (error: any) {
    await recordAiRun({
      kind: 'workflow_adapt',
      assessmentId: params.assessmentId,
      provider: candidates[0]?.provider,
      model: candidates[0]?.model,
      status: 'error',
      latencyMs: Date.now() - started,
      inputSummary: {
        stepCount: params.items.length,
        gapFingerprint,
        primary: candidates[0] ? `${candidates[0].provider}:${candidates[0].model}` : null,
        backup: candidates[1] ? `${candidates[1].provider}:${candidates[1].model}` : null,
      },
      error: error?.message || String(error),
    })
    logger.warn('Workflow AI adapt planning failed', {
      assessmentId: params.assessmentId,
      error: error?.message || String(error),
    })
    return { plan: null, runId: null, model: candidates[0]?.model || null, provider: candidates[0]?.provider || null }
  }
}

/**
 * Adapt a draft item list before CaseWorkflow create. Returns original items
 * unchanged when planning is disabled or fails.
 */
export async function adaptWorkflowDraftForCase(params: {
  assessmentId: string
  items: WorkflowItemDraft[]
  startDate: Date
}): Promise<{
  items: WorkflowItemDraft[]
  adapted: boolean
  rationale: string | null
  aiRunId: string | null
  appliedCount: number
}> {
  const { plan, runId } = await requestAdaptPlan({
    assessmentId: params.assessmentId,
    items: params.items,
  })
  if (!plan || plan.ops.length === 0) {
    return {
      items: params.items,
      adapted: false,
      rationale: plan?.rationale || null,
      aiRunId: runId,
      appliedCount: 0,
    }
  }

  const result = applyWorkflowAdaptPlan(params.items, plan, params.startDate)
  logger.info('Adapted workflow draft for case', {
    assessmentId: params.assessmentId,
    applied: result.applied.length,
    rejected: result.rejected.length,
  })
  return {
    items: result.items,
    adapted: result.applied.length > 0,
    rationale: result.rationale || null,
    aiRunId: runId,
    appliedCount: result.applied.length,
  }
}

/**
 * Re-adapt an existing case workflow (pending steps only). Syncs Tasks after.
 */
export async function adaptExistingCaseWorkflow(params: {
  assessmentId: string
}): Promise<{
  adapted: boolean
  rationale: string | null
  aiRunId: string | null
  appliedCount: number
  reason?: string
}> {
  const cw = await (prisma as any).caseWorkflow.findUnique({
    where: { assessmentId: params.assessmentId },
    include: { items: true },
  })
  if (!cw) return { adapted: false, rationale: null, aiRunId: null, appliedCount: 0, reason: 'no_workflow' }

  const drafts: WorkflowItemDraft[] = (cw.items || []).map((it: any) => ({
    id: it.id,
    phaseName: it.phaseName,
    phaseOrder: it.phaseOrder,
    stageName: it.stageName,
    stageOrder: it.stageOrder,
    title: it.title,
    description: it.description,
    stepType: it.stepType,
    aiSignal: it.aiSignal,
    assigneeRole: it.assigneeRole,
    assignedFirmMemberId: it.assignedFirmMemberId,
    dueOffsetDays: it.dueOffsetDays,
    dueDate: it.dueDate,
    required: Boolean(it.required),
    templateId: it.templateId,
    sortOrder: it.sortOrder,
    custom: Boolean(it.custom),
    status: it.status,
  }))

  const { plan, runId } = await requestAdaptPlan({
    assessmentId: params.assessmentId,
    items: drafts,
  })
  if (!plan || plan.ops.length === 0) {
    return {
      adapted: false,
      rationale: plan?.rationale || null,
      aiRunId: runId,
      appliedCount: 0,
      reason: 'no_ops',
    }
  }

  const startDate = cw.startDate ? new Date(cw.startDate) : new Date()
  const result = applyWorkflowAdaptPlan(drafts, plan, startDate)

  // Persist: updates for existing ids, creates for new custom drafts, skips.
  for (const it of result.items) {
    if (it.id) {
      const data: Record<string, unknown> = {
        title: it.title,
        description: it.description,
        assigneeRole: it.assigneeRole,
        dueOffsetDays: it.dueOffsetDays,
        dueDate: it.dueDate,
        sortOrder: it.sortOrder,
      }
      if (it.status === 'skipped') {
        data.status = 'skipped'
        data.completedAt = null
        data.completedById = null
      }
      await (prisma as any).caseWorkflowItem.update({
        where: { id: it.id },
        data,
      })
    } else {
      await (prisma as any).caseWorkflowItem.create({
        data: {
          caseWorkflowId: cw.id,
          phaseName: it.phaseName,
          phaseOrder: it.phaseOrder,
          stageName: it.stageName,
          stageOrder: it.stageOrder,
          title: it.title,
          description: it.description,
          stepType: it.stepType,
          aiSignal: it.aiSignal,
          assigneeRole: it.assigneeRole,
          assignedFirmMemberId: it.assignedFirmMemberId,
          dueOffsetDays: it.dueOffsetDays,
          dueDate: it.dueDate,
          required: it.required,
          templateId: it.templateId,
          sortOrder: it.sortOrder,
          custom: true,
          status: 'pending',
        },
      })
    }
  }

  await (prisma as any).caseWorkflow.update({
    where: { id: cw.id },
    data: {
      aiAdaptedAt: new Date(),
      aiAdaptRationale: result.rationale || null,
      aiAdaptRunId: runId,
    },
  })

  await syncWorkflowStepTasks(params.assessmentId).catch((e: any) => {
    logger.warn('Workflow step → task sync failed after AI adapt', {
      assessmentId: params.assessmentId,
      error: e?.message || String(e),
    })
  })

  return {
    adapted: result.applied.length > 0,
    rationale: result.rationale || null,
    aiRunId: runId,
    appliedCount: result.applied.length,
  }
}

/**
 * If open gap keys changed since the last successful adapt, re-run adapt on
 * the existing case workflow. Debounced; fail-safe (never throws to callers).
 */
export async function maybeReadaptWorkflowOnGapChange(params: {
  assessmentId: string
  trigger?: string
}): Promise<{
  ran: boolean
  adapted: boolean
  reason?: string
  appliedCount?: number
}> {
  if (!ENV.WORKFLOW_AI_ADAPT || !ENV.WORKFLOW_AI_ADAPT_ON_GAP_CHANGE) {
    return { ran: false, adapted: false, reason: 'disabled' }
  }

  try {
    const cw = await (prisma as any).caseWorkflow.findUnique({
      where: { assessmentId: params.assessmentId },
      select: { id: true, aiAdaptedAt: true },
    })
    if (!cw) return { ran: false, adapted: false, reason: 'no_workflow' }

    const intel = await buildCaseIntelligence(params.assessmentId).catch(() => null)
    if (!intel) return { ran: false, adapted: false, reason: 'no_case_intelligence' }

    const fingerprint = openGapFingerprint(intel.gaps)
    const last = await (prisma as any).aiRun.findFirst({
      where: {
        assessmentId: params.assessmentId,
        kind: 'workflow_adapt',
        status: 'ok',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, inputSummary: true, outputSummary: true },
    })

    const lastFp =
      (last?.outputSummary as any)?.gapFingerprint ??
      (last?.inputSummary as any)?.gapFingerprint ??
      null

    if (lastFp != null && String(lastFp) === fingerprint) {
      return { ran: false, adapted: false, reason: 'gaps_unchanged' }
    }

    const cooldownMs = ENV.WORKFLOW_AI_ADAPT_GAP_COOLDOWN_MS
    if (last?.createdAt && cooldownMs > 0) {
      const age = Date.now() - new Date(last.createdAt).getTime()
      if (age < cooldownMs) {
        return { ran: false, adapted: false, reason: 'cooldown' }
      }
    }

    // First adapt on a case with no prior fingerprint: still run once gaps exist
    // so apply-time + later gap drift both get richer patches.
    const result = await adaptExistingCaseWorkflow({ assessmentId: params.assessmentId })
    logger.info('Workflow AI adapt on gap change', {
      assessmentId: params.assessmentId,
      trigger: params.trigger || 'gap_change',
      fingerprint,
      previousFingerprint: lastFp,
      adapted: result.adapted,
      appliedCount: result.appliedCount,
      reason: result.reason,
    })
    return {
      ran: true,
      adapted: result.adapted,
      appliedCount: result.appliedCount,
      reason: result.reason,
    }
  } catch (e: any) {
    logger.warn('Workflow AI adapt on gap change failed', {
      assessmentId: params.assessmentId,
      error: e?.message || String(e),
    })
    return { ran: false, adapted: false, reason: 'error' }
  }
}
