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
import { normalizeTaskTitle, taskWorkAlreadyCovered } from './task-identity'

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
    if (existing.status === 'done') return 'noop'
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

  const data: Record<string, unknown> = {}
  if (existing.status === 'done') {
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
  const { reconcileWorkflowItemsFromTasks } = await import('./workflow-reconcile')
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

function findSlot(
  catalog: WorkflowCatalogSlot[],
  phaseHints: RegExp[],
  stageHints: RegExp[],
  fallbackPhaseOrder: number,
  fallbackPhase: string,
  fallbackStage: string,
): WorkflowCatalogSlot {
  const phases = catalog.filter((s) => phaseHints.some((re) => re.test(s.phaseName)))
  const pool = phases.length ? phases : catalog
  const stageHit = pool.find((s) => stageHints.some((re) => re.test(s.stageName)))
  if (stageHit) return stageHit
  if (phases[0]) return phases[0]
  if (catalog[0] && phaseHints.length === 0) return catalog[0]
  return {
    phaseName: fallbackPhase,
    phaseOrder: fallbackPhaseOrder,
    stageName: fallbackStage,
    stageOrder: 0,
  }
}

const OPENING_RECORDS_TITLE =
  /\b(insurance|claim|adjuster|police|incident report|letter of representation|\blor\b|um\/uim|medpay|\bpip\b|coverage)\b/i

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
): InferredWorkflowCategory | null {
  if (parseWorkflowItemIdFromTaskKey(task.sourceTemplateStepId)) return null

  const title = String(task.title || '')
  const taskType = String(task.taskType || '').toLowerCase()
  const milestone = String(task.milestoneType || '').toLowerCase()
  const checkpoint = String(task.checkpointType || '').toLowerCase()
  const notes = String(task.notes || '').toLowerCase()

  let slot: WorkflowCatalogSlot | null = null

  if (milestone === 'case_opening' || notes.includes('day-1 case opening')) {
    slot = OPENING_RECORDS_TITLE.test(title)
      ? findSlot(
          catalog,
          [/intake|setup/i],
          [/records|claims/i],
          0,
          'Intake & Setup',
          'Records & Claims',
        )
      : findSlot(
          catalog,
          [/intake|setup/i],
          [/opening|intake/i],
          0,
          'Intake & Setup',
          'Case Opening',
        )
  } else if (milestone === 'demand_preparation' || taskType === 'demand_deadline') {
    slot = findSlot(catalog, [/demand/i], [/demand/i], 2, 'Demand Preparation', 'Demand Package')
  } else if (milestone === 'settlement' || milestone === 'disbursement' || milestone === 'closeout') {
    slot = findSlot(
      catalog,
      [/settlement|closing/i],
      [/settlement|closing|disburse/i],
      4,
      'Settlement & Closing',
      'Settlement',
    )
  } else if (milestone === 'litigation') {
    slot = findSlot(catalog, [/litigation|suit|trial/i], [/litigation|suit|trial|discovery/i], 35, 'Litigation', 'Litigation')
  } else if (taskType === 'negotiation_deadline') {
    slot = findSlot(catalog, [/negotiation/i], [/negotiation/i], 3, 'Negotiation', 'Negotiation')
  } else if (taskType === 'statute' || taskType === 'sol' || /\bstatute of limitations\b/i.test(title)) {
    slot = findSlot(catalog, [/intake|setup/i], [/opening|deadline/i], 0, 'Intake & Setup', 'Case Opening')
  } else if (taskType === 'question' || String(task.sourceTemplateStepId || '').includes('plaintiff_questions')) {
    slot = findSlot(catalog, [/intake|setup/i], [/opening|intake/i], 0, 'Intake & Setup', 'Case Opening')
  } else if (
    /treatment|medical|mmi|chronolog/i.test(checkpoint) ||
    /treatment|medical|mmi/i.test(title) ||
    notes.includes('treatment')
  ) {
    slot = findSlot(
      catalog,
      [/treatment|investigation/i],
      [/medical|treatment/i],
      1,
      'Treatment & Investigation',
      'Medical Treatment',
    )
  } else if (
    /medical_records|missing|evidence|document|police|photo/i.test(checkpoint) ||
    /collect |records|evidence|bills/i.test(title)
  ) {
    slot = findSlot(
      catalog,
      [/treatment|investigation|intake|setup/i],
      [/evidence|records|claims/i],
      1,
      'Treatment & Investigation',
      'Evidence & Records',
    )
  } else if (taskType === 'coach') {
    slot = findSlot(
      catalog,
      [/treatment|investigation/i],
      [/medical|treatment|evidence|records/i],
      1,
      'Treatment & Investigation',
      'Medical Treatment',
    )
  } else if (taskType === 'checkpoint') {
    slot = findSlot(
      catalog,
      [/treatment|investigation/i],
      [/medical|treatment|evidence|records/i],
      1,
      'Treatment & Investigation',
      'Evidence & Records',
    )
  } else if (notes.includes('readiness') || notes.includes('attorney readiness')) {
    slot = findSlot(
      catalog,
      [/treatment|investigation/i],
      [/evidence|records|medical|treatment/i],
      1,
      'Treatment & Investigation',
      'Evidence & Records',
    )
  }

  return slot ? { ...slot, inferred: true } : null
}
