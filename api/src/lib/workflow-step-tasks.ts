/**
 * Materialize Case Workflow steps into CaseTask rows so they show on the
 * Tasks tab (assignable work), not only as checklist items on Workflow.
 *
 * Linking: `sourceTemplateStepId = wfitem:<caseWorkflowItemId>` (workflow items
 * never share that sentinel with question-group / template-step keys).
 *
 * Scope: pending, non-AI steps that are either required OR belong to the
 * earliest incomplete stage (so Case Opening — including non-required welcome
 * packet — appears as tasks without dumping the entire PI pipeline at once).
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  applySoleAttorneyAssignee,
  findSoleAttorneyForAssessment,
} from './sole-firm-attorney'
import { isSameUnitOfWork, normalizeTaskTitle, taskWorkAlreadyCovered } from './task-identity'

export const WORKFLOW_ITEM_TASK_PREFIX = 'wfitem:'

export function workflowItemTaskKey(itemId: string): string {
  return `${WORKFLOW_ITEM_TASK_PREFIX}${itemId}`
}

export function parseWorkflowItemIdFromTaskKey(key: string | null | undefined): string | null {
  if (!key || !key.startsWith(WORKFLOW_ITEM_TASK_PREFIX)) return null
  const id = key.slice(WORKFLOW_ITEM_TASK_PREFIX.length)
  return id || null
}

function mapStepTypeToTaskType(stepType: string | null | undefined): string {
  switch (stepType) {
    case 'deadline':
      return 'demand_deadline'
    case 'checkpoint':
      return 'checkpoint'
    case 'milestone':
      return 'milestone'
    case 'document':
      return 'general'
    default:
      return 'general'
  }
}

function actionableItems(items: any[]): any[] {
  return items.filter((it) => it && it.stepType !== 'ai_milestone')
}

/** Earliest stageOrder that still has a pending actionable step. */
function activeStageOrder(items: any[]): number | null {
  const pending = actionableItems(items).filter((it) => it.status === 'pending')
  if (pending.length === 0) return null
  return Math.min(...pending.map((it) => Number(it.stageOrder ?? 0)))
}

/** Public helper so routes can snapshot the active stage before reconcile. */
export async function getActiveWorkflowStageOrder(assessmentId: string): Promise<number | null> {
  if (!assessmentId) return null
  const cw = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      select: { items: { select: { status: true, stageOrder: true, stepType: true } } },
    })
    .catch(() => null)
  if (!cw?.items?.length) return null
  return activeStageOrder(cw.items)
}

function shouldMaterialize(item: any, activeStage: number | null): boolean {
  if (!item || item.stepType === 'ai_milestone') return false
  if (item.status !== 'pending') return false
  // Only the earliest incomplete stage — avoids dumping Demand/Settlement
  // required steps onto Tasks while Case Opening is still open.
  if (activeStage == null) return false
  return Number(item.stageOrder ?? 0) === activeStage
}

async function resolveMemberAssignee(firmMemberId: string | null | undefined): Promise<{
  userId: string | null
  name: string | null
  role: string | null
}> {
  if (!firmMemberId) return { userId: null, name: null, role: null }
  const member = await (prisma as any).firmMember
    .findUnique({
      where: { id: firmMemberId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    .catch(() => null)
  if (!member) return { userId: null, name: null, role: null }
  const name =
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ').trim() ||
    member.user?.email ||
    null
  return {
    userId: member.userId || member.user?.id || null,
    name,
    role: member.role || null,
  }
}

async function upsertTaskForItem(
  assessmentId: string,
  item: any,
  soleAttorney: Awaited<ReturnType<typeof findSoleAttorneyForAssessment>>,
): Promise<'created' | 'updated' | 'noop'> {
  const key = workflowItemTaskKey(item.id)
  const existing = await prisma.caseTask.findFirst({
    where: { assessmentId, sourceTemplateStepId: key, mergedIntoId: null },
    select: {
      id: true,
      status: true,
      title: true,
      dueDate: true,
      assignedRole: true,
      assignedTo: true,
      assignedUserId: true,
      priority: true,
      notes: true,
    },
  })

  const member = await resolveMemberAssignee(item.assignedFirmMemberId)
  const title = String(item.title || '')
  const isAutoIntakeMilestone =
    /confirm signed (retainer|representation)/i.test(title) ||
    /complete conflict check/i.test(title) ||
    /open matter.*conflict check/i.test(title) ||
    /^run conflict check$/i.test(title) ||
    /^send retainer to client$/i.test(title) ||
    /send retainer for signature/i.test(title)

  // Auto intake milestones stay person-unassigned (Assignee = Auto) unless the
  // workflow step has an explicit firm-member pick.
  const assignee = isAutoIntakeMilestone && !member.userId
    ? {
        assignedRole: member.role || item.assigneeRole || 'attorney',
        assignedTo: null as string | null,
        assignedUserId: null as string | null,
      }
    : applySoleAttorneyAssignee(
        {
          assignedRole: member.role || item.assigneeRole || null,
          assignedTo: member.name || null,
          assignedUserId: member.userId || null,
        },
        soleAttorney,
      )
  const assignedRole = assignee.assignedRole
  const assignedTo = assignee.assignedTo
  const assignedUserId = assignee.assignedUserId
  const priority = item.required ? 'high' : 'medium'
  const dueDate = item.dueDate ? new Date(item.dueDate) : null
  const descNote = String(item.description || '')
    .trim()
    .slice(0, 240)
  const notes =
    [item.phaseName, item.stageName, descNote || null].filter(Boolean).join(' · ') || null

  if (item.status === 'done' || item.status === 'skipped') {
    // Close every related open task (not only the wfitem: row) so Workflow → Tasks
    // matches the multi-task ownership model used the other direction.
    const { closeRelatedOpenTasksForWorkflowItem } = await import('./workflow-reconcile')
    const closed = await closeRelatedOpenTasksForWorkflowItem(
      assessmentId,
      { id: item.id, title: item.title },
      item.status === 'skipped' ? 'Workflow step skipped' : 'Workflow step marked done',
    )
    if (closed > 0) return 'updated'
    if (!existing) return 'noop'
    if (existing.status === 'done' || existing.status === 'deleted') return 'noop'
    await prisma.caseTask.update({
      where: { id: existing.id },
      data: {
        status: 'done',
        completedAt: item.completedAt ? new Date(item.completedAt) : new Date(),
      },
    })
    return 'updated'
  }

  // pending
  if (!existing) {
    // When readiness/coach already created the same unit of work under a
    // different title (e.g. "Collect Police…" vs "Request police…"), don't
    // invent a duplicate — link those peers to this workflow item so completing
    // them marks the Workflow step done.
    const peers = await prisma.caseTask.findMany({
      where: { assessmentId, mergedIntoId: null },
      select: {
        id: true,
        title: true,
        notes: true,
        status: true,
        sourceTemplateStepId: true,
        completedAt: true,
      },
    })
    if (taskWorkAlreadyCovered(peers, { title: item.title, notes: notes ? `From workflow: ${notes}` : null })) {
      const itemTitle = normalizeTaskTitle(item.title)
      let linked = 0
      let allDone = true
      let anyDone = false
      for (const peer of peers) {
        const covers =
          taskWorkAlreadyCovered([{ title: peer.title, notes: peer.notes }], {
            title: item.title,
            notes: notes ? `From workflow: ${notes}` : null,
          }) || normalizeTaskTitle(peer.title) === itemTitle
        if (!covers) continue
        const otherWf = parseWorkflowItemIdFromTaskKey(peer.sourceTemplateStepId)
        if (otherWf && otherWf !== item.id) continue
        if (peer.sourceTemplateStepId !== key) {
          await prisma.caseTask.update({
            where: { id: peer.id },
            data: { sourceTemplateStepId: key },
          })
          linked++
        }
        if (peer.status === 'done' || peer.status === 'skipped' || peer.status === 'cancelled') {
          anyDone = true
        } else if (peer.status === 'open' || peer.status === 'in_progress') {
          allDone = false
        }
      }
      if (anyDone && allDone && item.status === 'pending') {
        await (prisma as any).caseWorkflowItem.update({
          where: { id: item.id },
          data: { status: 'done', completedAt: new Date() },
        })
        return 'updated'
      }
      return linked > 0 ? 'updated' : 'noop'
    }

    await prisma.caseTask.create({
      data: {
        assessmentId,
        title: item.title,
        taskType: mapStepTypeToTaskType(item.stepType),
        dueDate,
        priority,
        status: 'open',
        notes: notes ? `From workflow: ${notes}` : 'From case workflow',
        assignedRole,
        assignedTo,
        assignedUserId,
        sourceTemplateStepId: key,
        sourceTemplateId: item.caseWorkflowId || null,
      },
    })
    return 'created'
  }

  // The attorney deleted this step's task; restoring it is theirs to do.
  if (existing.status === 'deleted') return 'noop'

  const data: Record<string, unknown> = {}
  if (existing.status === 'done' && !(await stepWaitsOnAnotherOpenTask(assessmentId, item, existing.id))) {
    // Step re-opened on workflow — reopen task.
    data.status = 'open'
    data.completedAt = null
  }
  if (existing.title !== item.title) data.title = item.title
  const existingDue = existing.dueDate ? existing.dueDate.toISOString() : null
  const nextDue = dueDate ? dueDate.toISOString() : null
  if (existingDue !== nextDue) data.dueDate = dueDate
  // Prefer an existing person assignee; only fill when the task is still unowned.
  if (!existing.assignedUserId && assignedUserId) {
    data.assignedUserId = assignedUserId
    data.assignedTo = assignedTo
    data.assignedRole = assignedRole
  } else if (member.userId) {
    // Workflow step has an explicit person — keep tasks in sync with that pick.
    if ((existing.assignedRole || null) !== (assignedRole || null)) data.assignedRole = assignedRole
    if ((existing.assignedTo || null) !== (assignedTo || null)) data.assignedTo = assignedTo
    if ((existing.assignedUserId || null) !== (assignedUserId || null)) data.assignedUserId = assignedUserId
  } else if (!member.userId && item.assigneeRole) {
    // Workflow is role-only (e.g. Paralegal). Mirror that on the task so Edit
    // details matches the Workflow tab — clear a stale sole-attorney person fill.
    if ((existing.assignedRole || null) !== (assignedRole || null)) data.assignedRole = assignedRole
    if (
      soleAttorney &&
      existing.assignedUserId &&
      existing.assignedUserId === soleAttorney.userId &&
      !assignedUserId
    ) {
      data.assignedUserId = null
      data.assignedTo = null
    }
  }
  if (existing.priority !== priority) data.priority = priority
  const nextNotes = notes ? `From workflow: ${notes}` : 'From case workflow'
  if ((existing.notes || null) !== nextNotes) data.notes = nextNotes

  if (Object.keys(data).length === 0) return 'noop'
  await prisma.caseTask.update({ where: { id: existing.id }, data: data as any })
  return 'updated'
}

export type WorkflowStepTaskSyncResult = {
  created: number
  updated: number
  activeStageOrder: number | null
  /** Set when sync advances the active stage and materializes new tasks. */
  stageUnlock: { newTasks: number; stageOrder: number } | null
}

/**
 * Ensure Tasks-tab CaseTasks exist for the active/required workflow steps on a case.
 * Safe to call on workflow apply, workflow GET, and tasks GET (idempotent).
 */
export async function syncWorkflowStepTasks(
  assessmentId: string,
  opts?: { priorActiveStageOrder?: number | null },
): Promise<WorkflowStepTaskSyncResult> {
  const empty: WorkflowStepTaskSyncResult = {
    created: 0,
    updated: 0,
    activeStageOrder: null,
    stageUnlock: null,
  }
  if (!assessmentId) return empty

  const cw = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      include: { items: true },
    })
    .catch(() => null)

  if (!cw?.items?.length) return empty

  const currentActive = activeStageOrder(cw.items)
  // Caller may pass the stage from *before* reconcile completed the prior stage.
  const baselineActive =
    opts?.priorActiveStageOrder !== undefined ? opts.priorActiveStageOrder : currentActive
  const soleAttorney = await findSoleAttorneyForAssessment(assessmentId)
  let created = 0
  let updated = 0

  // Materialize active/required pending steps; also close any linked tasks when
  // their workflow step is already done/skipped (upsert is a no-op if no task).
  for (const item of cw.items) {
    if (item.stepType === 'ai_milestone') continue
    const pendingTrack = shouldMaterialize(item, currentActive)
    const completedTrack = item.status === 'done' || item.status === 'skipped'
    if (!pendingTrack && !completedTrack) continue

    try {
      const result = await upsertTaskForItem(assessmentId, item, soleAttorney)
      if (result === 'created') created++
      if (result === 'updated') updated++
    } catch (error: any) {
      logger.warn('Failed to sync workflow step task', {
        assessmentId,
        itemId: item.id,
        error: error?.message || String(error),
      })
    }
  }

  // Re-read after peer-link / completion side effects may have advanced the stage,
  // then materialize the newly active stage if it changed mid-sync.
  const afterCw = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      include: { items: true },
    })
    .catch(() => null)
  const afterActive = afterCw?.items?.length ? activeStageOrder(afterCw.items) : currentActive

  if (
    afterCw?.items?.length &&
    afterActive != null &&
    currentActive != null &&
    afterActive !== currentActive
  ) {
    for (const item of afterCw.items) {
      if (item.stepType === 'ai_milestone') continue
      if (!shouldMaterialize(item, afterActive)) continue
      try {
        const result = await upsertTaskForItem(assessmentId, item, soleAttorney)
        if (result === 'created') created++
        if (result === 'updated') updated++
      } catch (error: any) {
        logger.warn('Failed to sync unlocked-stage workflow step task', {
          assessmentId,
          itemId: item.id,
          error: error?.message || String(error),
        })
      }
    }
  }

  const finalActive = afterActive ?? currentActive
  const stageUnlock =
    created > 0 &&
    baselineActive != null &&
    finalActive != null &&
    finalActive !== baselineActive
      ? { newTasks: created, stageOrder: finalActive }
      : null

  if (created || updated) {
    logger.info('Synced workflow step tasks', {
      assessmentId,
      created,
      updated,
      baselineActive,
      currentActive,
      finalActive,
      stageUnlock,
    })
  }
  return { created, updated, activeStageOrder: finalActive ?? null, stageUnlock }
}

/**
 * A pending step with a done task is either a step reopened on the Workflow tab
 * or one still waiting on another related task. Only the first should reopen the
 * task; the second is the attorney having finished their part.
 */
async function stepWaitsOnAnotherOpenTask(
  assessmentId: string,
  item: { id: string; title: string },
  doneTaskId: string,
): Promise<boolean> {
  try {
    const { tasksRelatedToWorkflowItem } = await import('./workflow-reconcile')
    const open = await prisma.caseTask.findMany({
      where: { assessmentId, mergedIntoId: null, status: { in: ['open', 'in_progress'] }, id: { not: doneTaskId } },
      select: { id: true, title: true, status: true, notes: true, sourceTemplateStepId: true, completedAt: true },
    })
    return tasksRelatedToWorkflowItem(item, open as any).length > 0
  } catch {
    return false
  }
}

/**
 * When a CaseTask is completed (or reopened) from the Tasks UI, reconcile every
 * Workflow step that task belongs to. One Workflow step may map to many tasks;
 * the step completes only when all related tasks are done.
 */
export async function syncWorkflowItemFromTask(task: {
  id: string
  assessmentId: string
  status: string
  sourceTemplateStepId?: string | null
  completedAt?: Date | null
}): Promise<void> {
  if (!task.assessmentId) return
  // Dynamic import avoids a circular dependency with workflow-reconcile.
  const { reconcileWorkflowItemsFromTasks, closeRelatedOpenTasksForWorkflowItem, taskBelongsToWorkflowItem } =
    await import('./workflow-reconcile')

  // Completing one of several tasks for the same step (the workflow's own task
  // plus a checklist or coach duplicate) completes the step. Otherwise the step
  // stays pending on the duplicate, and the next sync reopens the task the
  // attorney just finished.
  if (task.status === 'done') {
    try {
      const completed = await prisma.caseTask.findUnique({
        where: { id: task.id },
        select: { id: true, title: true, notes: true, status: true, sourceTemplateStepId: true, completedAt: true },
      })
      const items: Array<{ id: string; title: string }> = completed
        ? await (prisma as any).caseWorkflowItem.findMany({
            where: { caseWorkflow: { assessmentId: task.assessmentId }, stepType: { not: 'ai_milestone' }, status: 'pending' },
            select: { id: true, title: true },
          })
        : []
      for (const item of items) {
        if (!taskBelongsToWorkflowItem(item, completed as any)) continue
        await closeRelatedOpenTasksForWorkflowItem(
          task.assessmentId,
          item,
          `Completed with "${completed!.title}"`,
          (sibling) => isSameUnitOfWork(completed!, sibling),
        )
      }
    } catch (error: any) {
      logger.warn('Closing duplicate step tasks failed', { assessmentId: task.assessmentId, error: error?.message })
    }
  }

  await reconcileWorkflowItemsFromTasks(task.assessmentId)
}

/** Phase/stage slot taken from the case's applied workflow (for grouping). */
export type WorkflowCatalogSlot = {
  phaseName: string
  phaseOrder: number
  stageName: string
  stageOrder: number
}

export type InferredWorkflowCategory = WorkflowCatalogSlot & { inferred: true }

/** Unique phase→stage slots from a case workflow, ordered for display. */
export function buildWorkflowCatalog(
  items: Array<{
    phaseName?: string | null
    phaseOrder?: number | null
    stageName?: string | null
    stageOrder?: number | null
  }>,
): WorkflowCatalogSlot[] {
  const map = new Map<string, WorkflowCatalogSlot>()
  for (const it of items) {
    const phaseName = String(it.phaseName || '').trim()
    const stageName = String(it.stageName || '').trim()
    if (!phaseName || !stageName) continue
    const phaseOrder = typeof it.phaseOrder === 'number' ? it.phaseOrder : 0
    const stageOrder = typeof it.stageOrder === 'number' ? it.stageOrder : 0
    const key = `${phaseOrder}:${phaseName}|${stageOrder}:${stageName}`
    if (!map.has(key)) {
      map.set(key, { phaseName, phaseOrder, stageName, stageOrder })
    }
  }
  return [...map.values()].sort(
    (a, b) => a.phaseOrder - b.phaseOrder || a.stageOrder - b.stageOrder || a.stageName.localeCompare(b.stageName),
  )
}

/**
 * The stage a case is currently working: the first phase→stage (in pipeline
 * order) that still has a pending actionable step, else the last stage.
 */
export function activeWorkflowSlot(
  items: Array<{
    phaseName?: string | null
    phaseOrder?: number | null
    stageName?: string | null
    stageOrder?: number | null
    status?: string | null
    stepType?: string | null
  }>,
): WorkflowCatalogSlot | null {
  const catalog = buildWorkflowCatalog(items)
  if (!catalog.length) return null
  const pending = buildWorkflowCatalog(actionableItems(items).filter((it) => it.status === 'pending'))
  return pending[0] ?? catalog[catalog.length - 1]
}

type TaskBucket =
  | 'opening'
  | 'records_claims'
  | 'medical'
  | 'evidence'
  | 'demand'
  | 'negotiation'
  | 'litigation'
  | 'settlement'

/**
 * How each task category finds its home in a case workflow. Stage hints are
 * tried first (most specific), then phase hints. `position` (0 = start of the
 * pipeline, 1 = end) places the task when a firm's workflow for that case type
 * names its phases differently. The default* names apply only to cases with no
 * workflow and mirror the standard PI blueprint.
 */
const BUCKETS: Record<
  TaskBucket,
  {
    phase: RegExp
    stage: RegExp
    position: number
    defaultPhase: string
    defaultPhaseOrder: number
    defaultStage: string
  }
> = {
  opening: {
    phase: /\b(intake|setup|onboard|open|sign[- ]?up)/i,
    stage: /\b(opening|intake|onboard|engagement|retain|sign[- ]?up)/i,
    position: 0,
    defaultPhase: 'Intake & Setup',
    defaultPhaseOrder: 0,
    defaultStage: 'Case Opening',
  },
  records_claims: {
    phase: /\b(intake|setup|investigat|claim|insurance)/i,
    stage: /\b(claim|insurance|coverage|records)/i,
    position: 0.1,
    defaultPhase: 'Intake & Setup',
    defaultPhaseOrder: 0,
    defaultStage: 'Records & Claims',
  },
  medical: {
    phase: /\b(treatment|medical|investigat)/i,
    stage: /\b(medical|treatment|care|mmi)\b/i,
    position: 0.3,
    defaultPhase: 'Treatment & Investigation',
    defaultPhaseOrder: 1,
    defaultStage: 'Medical Treatment',
  },
  evidence: {
    phase: /\b(investigat|evidence|discovery|treatment)/i,
    stage: /\b(evidence|records|liability|investigat|damage|document)/i,
    position: 0.35,
    defaultPhase: 'Treatment & Investigation',
    defaultPhaseOrder: 1,
    defaultStage: 'Evidence & Records',
  },
  demand: {
    phase: /\b(demand|pre[- ]?lit)/i,
    stage: /\bdemand/i,
    position: 0.55,
    defaultPhase: 'Demand Preparation',
    defaultPhaseOrder: 2,
    defaultStage: 'Demand Package',
  },
  negotiation: {
    phase: /\bnegotiat/i,
    stage: /\b(negotiat|offer)/i,
    position: 0.7,
    defaultPhase: 'Negotiation',
    defaultPhaseOrder: 3,
    defaultStage: 'Negotiation',
  },
  litigation: {
    phase: /\b(litigat|suit|trial|court)/i,
    stage: /\b(litigat|suit|complaint|discovery|deposition|mediation|trial)/i,
    position: 0.85,
    defaultPhase: 'Litigation',
    defaultPhaseOrder: 35,
    defaultStage: 'Litigation',
  },
  settlement: {
    phase: /\b(settle|clos|disburse|resolution)/i,
    stage: /\b(settle|clos|disburse|liens?\b|release)/i,
    position: 1,
    defaultPhase: 'Settlement & Closing',
    defaultPhaseOrder: 4,
    defaultStage: 'Settlement',
  },
}

function slotForBucket(catalog: WorkflowCatalogSlot[], bucket: TaskBucket): WorkflowCatalogSlot {
  const b = BUCKETS[bucket]
  if (!catalog.length) {
    return { phaseName: b.defaultPhase, phaseOrder: b.defaultPhaseOrder, stageName: b.defaultStage, stageOrder: 0 }
  }
  const inPhase = catalog.filter((s) => b.phase.test(s.phaseName))
  const stageHit =
    inPhase.find((s) => b.stage.test(s.stageName)) ?? catalog.find((s) => b.stage.test(s.stageName))
  if (stageHit) return stageHit
  if (inPhase[0]) return inPhase[0]
  const phaseFirstSlots: WorkflowCatalogSlot[] = []
  for (const s of catalog) {
    const last = phaseFirstSlots[phaseFirstSlots.length - 1]
    if (!last || last.phaseName !== s.phaseName || last.phaseOrder !== s.phaseOrder) phaseFirstSlots.push(s)
  }
  return phaseFirstSlots[Math.round(b.position * (phaseFirstSlots.length - 1))]
}

const OPENING_RECORDS_TITLE =
  /\b(insurance|claim|adjuster|police|incident report|letter of representation|\blor\b|um\/uim|medpay|\bpip\b|coverage)\b/i

const SETTLEMENT_TITLE =
  /\b(settle(ment|d)?|(settlement|signed|general) release|release of (all )?claims|disburse(ment)?|closing statement|lien (resolution|reduction|payoff)|close ?out|final accounting)\b/i
const LITIGATION_TITLE =
  /\b(lawsuit|file suit|complaint|summons|service of process|discovery|deposition|interrogator(y|ies)|subpoena|trial|mediation|arbitration|motion)\b/i
const NEGOTIATION_TITLE = /\b(negotiat\w*|counter[- ]?offer|offer|adjuster call)\b/i
const DEMAND_TITLE = /\bdemand\b/i
const MEDICAL_TITLE =
  /\b(treatment|medical|mmi|doctor|physician|provider|appointment|therapy|chiropract\w*|surgery|imaging|mri|x-?ray|prescription)\b/i
const EVIDENCE_TITLE =
  /\b(collect|records|evidence|bills?|photos?|videos?|witness(es)?|scene|dash ?cam|document(s|ation)?|upload|wage|lost (income|earnings)|property damage|receipts|liability|fault)\b/i
const OPENING_TITLE =
  /\b(retainer|engagement|fee agreement|hipaa|authorization|intake|contact|welcome|conflict check|consult(ation)?|onboard\w*|statute of limitations)\b/i

function classifyTask(task: {
  title?: string | null
  taskType?: string | null
  milestoneType?: string | null
  checkpointType?: string | null
  notes?: string | null
  sourceTemplateStepId?: string | null
}): TaskBucket | null {
  const title = String(task.title || '')
  const taskType = String(task.taskType || '').toLowerCase()
  const milestone = String(task.milestoneType || '').toLowerCase()
  const checkpoint = String(task.checkpointType || '').toLowerCase()
  const notes = String(task.notes || '').toLowerCase()

  if (milestone === 'case_opening' || notes.includes('day-1 case opening')) {
    return OPENING_RECORDS_TITLE.test(title) ? 'records_claims' : 'opening'
  }
  if (milestone === 'demand_preparation' || taskType === 'demand_deadline') return 'demand'
  if (milestone === 'settlement' || milestone === 'disbursement' || milestone === 'closeout') return 'settlement'
  if (milestone === 'litigation') return 'litigation'
  if (taskType === 'negotiation_deadline') return 'negotiation'
  if (taskType === 'statute' || taskType === 'sol') return 'opening'
  if (taskType === 'question' || String(task.sourceTemplateStepId || '').includes('plaintiff_questions')) {
    return 'opening'
  }
  if (/treatment|medical|mmi|chronolog/i.test(checkpoint)) return 'medical'
  if (/medical_records|missing|evidence|document|police|photo/i.test(checkpoint)) return 'evidence'

  if (SETTLEMENT_TITLE.test(title)) return 'settlement'
  if (LITIGATION_TITLE.test(title)) return 'litigation'
  if (DEMAND_TITLE.test(title)) return 'demand'
  if (NEGOTIATION_TITLE.test(title)) return 'negotiation'
  if (MEDICAL_TITLE.test(title) || notes.includes('treatment')) return 'medical'
  if (OPENING_RECORDS_TITLE.test(title)) return 'records_claims'
  if (EVIDENCE_TITLE.test(title)) return 'evidence'
  if (OPENING_TITLE.test(title) || taskType === 'signature') return 'opening'

  if (taskType === 'coach') return 'medical'
  if (taskType === 'checkpoint' || notes.includes('readiness')) return 'evidence'
  return null
}

/**
 * Map non-workflow CaseTasks (day-1 checklist, readiness, stage checklists,
 * questions, SOL, coach, etc.) into the case pipeline so the Tasks tab does
 * not dump them under a vague "Other tasks" bucket.
 */
export function inferWorkflowCategoryForTask(
  task: {
    title?: string | null
    taskType?: string | null
    milestoneType?: string | null
    checkpointType?: string | null
    notes?: string | null
    sourceTemplateStepId?: string | null
  },
  catalog: WorkflowCatalogSlot[],
  activeSlot?: WorkflowCatalogSlot | null,
): InferredWorkflowCategory | null {
  if (parseWorkflowItemIdFromTaskKey(task.sourceTemplateStepId)) return null

  const bucket = classifyTask(task)
  if (bucket) return { ...slotForBucket(catalog, bucket), inferred: true }
  // Nothing in the task says where it belongs: file it with the work the case
  // is in right now rather than an "Other tasks" bucket.
  const fallback = activeSlot ?? catalog[0]
  return fallback ? { ...fallback, inferred: true } : null
}
