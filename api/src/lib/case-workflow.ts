/**
 * Applies a firm's "applied" (default) workflow to a specific case as a
 * point-in-time snapshot. The firm workflow's phases/stages/steps are copied
 * into CaseWorkflowItem rows so later edits to the firm template don't disrupt
 * in-flight matters. Step due dates are computed as startDate + dueOffsetDays.
 *
 * Conditional steps are evaluated once, at apply-time, against the case's
 * Assessment; steps whose condition fails are simply not snapshotted.
 *
 * Idempotent: a case can only have one workflow (CaseWorkflow.assessmentId is
 * unique), so re-invoking is a no-op once applied.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  evaluateStepCondition,
  resolveConditionContext,
  loadSignalContext,
  deriveSignal,
} from './workflow-signals'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export interface ApplyWorkflowResult {
  created: boolean
  caseWorkflowId?: string
  reason?: 'exists' | 'no_workflow' | 'no_case'
}

/**
 * Flatten a firm workflow (which may use the new phase -> stage hierarchy or
 * legacy phase-less stages) into an ordered list of { phase, stage } groups.
 */
function orderedGroups(workflow: any): { phaseName: string | null; phaseOrder: number | null; stage: any }[] {
  const stages = [...(workflow.stages || [])]
  const phases = [...(workflow.phases || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
  const groups: { phaseName: string | null; phaseOrder: number | null; stage: any }[] = []

  phases.forEach((phase: any, pi: number) => {
    const phaseStages = stages
      .filter((s: any) => s.phaseId === phase.id)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    for (const stage of phaseStages) groups.push({ phaseName: phase.name, phaseOrder: pi, stage })
  })

  // Legacy/flat stages (no phase): each becomes its own phase group.
  const orphan = stages.filter((s: any) => !s.phaseId).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
  let nextPhaseOrder = phases.length
  for (const stage of orphan) {
    groups.push({ phaseName: stage.name, phaseOrder: nextPhaseOrder++, stage })
  }
  return groups
}

export async function applyFirmWorkflowToCase(params: {
  assessmentId: string
  lawFirmId?: string | null
  appliedById?: string | null
  startDate?: Date
  /** Apply a specific workflow instead of the firm's default. */
  workflowId?: string
}): Promise<ApplyWorkflowResult> {
  const { assessmentId } = params
  if (!assessmentId) return { created: false, reason: 'no_case' }

  // Idempotent: one workflow per case.
  const existing = await (prisma as any).caseWorkflow.findUnique({ where: { assessmentId } })
  if (existing) return { created: false, caseWorkflowId: existing.id, reason: 'exists' }

  // Resolve which firm workflow to apply.
  const include = { phases: true, stages: { include: { steps: true } } }
  let workflow: any = null
  if (params.workflowId) {
    workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { id: params.workflowId, ...(params.lawFirmId ? { lawFirmId: params.lawFirmId } : {}) },
      include,
    })
  } else if (params.lawFirmId) {
    workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { lawFirmId: params.lawFirmId, isDefault: true },
      include,
    })
  }
  if (!workflow) return { created: false, reason: 'no_workflow' }

  // Resolve case fields for apply-time conditional evaluation.
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, claimType: true, venueState: true, status: true },
  })
  const conditionCtx = resolveConditionContext(assessment)

  // Default assignees are only carried over if the member is still in the firm.
  let validMemberIds = new Set<string>()
  if (params.lawFirmId) {
    const members = await (prisma as any).firmMember.findMany({
      where: { lawFirmId: params.lawFirmId, status: { in: ['active', 'invited'] } },
      select: { id: true },
    })
    validMemberIds = new Set(members.map((m: any) => m.id))
  }

  const start = params.startDate || new Date()
  const groups = orderedGroups(workflow)
  const items: any[] = []
  let stageOrder = 0
  for (const group of groups) {
    const steps = [...(group.stage.steps || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    let ti = 0
    for (const step of steps) {
      // Skip conditional steps whose condition doesn't match this case.
      if (!evaluateStepCondition(step, conditionCtx)) continue
      items.push({
        phaseName: group.phaseName,
        phaseOrder: group.phaseOrder,
        stageName: group.stage.name,
        stageOrder,
        title: step.title,
        description: step.description || null,
        stepType: step.stepType || 'task',
        aiSignal: step.aiSignal || null,
        assigneeRole: step.assigneeRole || null,
        assignedFirmMemberId:
          step.assigneeFirmMemberId && validMemberIds.has(step.assigneeFirmMemberId)
            ? step.assigneeFirmMemberId
            : null,
        dueOffsetDays: typeof step.dueOffsetDays === 'number' ? step.dueOffsetDays : null,
        dueDate: typeof step.dueOffsetDays === 'number' ? addDays(start, step.dueOffsetDays) : null,
        required: Boolean(step.required),
        templateId: step.templateId || null,
        sortOrder: ti,
      })
      ti++
    }
    stageOrder++
  }

  try {
    const created = await (prisma as any).caseWorkflow.create({
      data: {
        assessmentId,
        lawFirmId: params.lawFirmId || null,
        sourceWorkflowId: workflow.id,
        name: workflow.name,
        description: workflow.description || null,
        startDate: start,
        appliedById: params.appliedById || null,
        appliedAt: new Date(),
        items: { create: items },
      },
    })
    logger.info('Applied firm workflow to case', {
      assessmentId,
      workflowId: workflow.id,
      itemCount: items.length,
    })
    return { created: true, caseWorkflowId: created.id }
  } catch (error: any) {
    // Unique-constraint race: another request applied it first.
    if (error?.code === 'P2002') {
      const now = await (prisma as any).caseWorkflow.findUnique({ where: { assessmentId } })
      return { created: false, caseWorkflowId: now?.id, reason: 'exists' }
    }
    throw error
  }
}

/**
 * Serialize a case workflow (+items) into a phase -> stage progress pipeline.
 * AI-milestone steps get a read-only `status`/`aiDone` derived from case data.
 */
export async function serializeCaseWorkflow(cw: any) {
  const items = [...(cw.items || [])].sort(
    (a: any, b: any) =>
      (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0) || a.stageOrder - b.stageOrder || a.sortOrder - b.sortOrder
  )

  // Derive AI-milestone statuses once if any ai_milestone steps are present.
  const hasAi = items.some((i: any) => i.stepType === 'ai_milestone' && i.aiSignal)
  const signalCtx = hasAi ? await loadSignalContext(cw.assessmentId) : null

  // Resolve assignee names for any assigned steps.
  const assigneeIds = [...new Set(items.map((i: any) => i.assignedFirmMemberId).filter(Boolean))] as string[]
  const memberNames = new Map<string, string>()
  if (assigneeIds.length) {
    const members = await (prisma as any).firmMember.findMany({
      where: { id: { in: assigneeIds } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    })
    for (const m of members) {
      const name =
        [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || 'Member'
      memberNames.set(m.id, name)
    }
  }

  const aiStatusFor = (item: any): 'done' | 'pending' => {
    if (item.stepType === 'ai_milestone' && signalCtx) {
      return deriveSignal(item.aiSignal, signalCtx) ? 'done' : 'pending'
    }
    return item.status
  }

  // Group items into phases -> stages.
  type StageNode = { name: string; order: number; steps: any[] }
  type PhaseNode = { name: string; order: number; stages: StageNode[]; stageMap: Map<number, StageNode> }
  const phaseMap = new Map<number, PhaseNode>()

  for (const it of items) {
    const pOrder = it.phaseOrder ?? 0
    if (!phaseMap.has(pOrder)) {
      phaseMap.set(pOrder, { name: it.phaseName || it.stageName || 'Workflow', order: pOrder, stages: [], stageMap: new Map() })
    }
    const phase = phaseMap.get(pOrder)!
    if (!phase.stageMap.has(it.stageOrder)) {
      const node: StageNode = { name: it.stageName, order: it.stageOrder, steps: [] }
      phase.stageMap.set(it.stageOrder, node)
      phase.stages.push(node)
    }
    phase.stageMap.get(it.stageOrder)!.steps.push({
      id: it.id,
      title: it.title,
      description: it.description,
      stepType: it.stepType || 'task',
      aiSignal: it.aiSignal || null,
      readOnly: it.stepType === 'ai_milestone',
      assigneeRole: it.assigneeRole,
      assignedFirmMemberId: it.assignedFirmMemberId || null,
      assignedName: it.assignedFirmMemberId ? memberNames.get(it.assignedFirmMemberId) || null : null,
      dueOffsetDays: it.dueOffsetDays,
      dueDate: it.dueDate,
      required: it.required,
      templateId: it.templateId,
      status: aiStatusFor(it),
      completedAt: it.completedAt,
    })
  }

  const phases = [...phaseMap.values()].sort((a, b) => a.order - b.order).map((p) => {
    const stages = p.stages.sort((a, b) => a.order - b.order)
    const stepTotal = stages.reduce((n, s) => n + s.steps.length, 0)
    const stepDone = stages.reduce(
      (n, s) => n + s.steps.filter((st: any) => st.status === 'done' || st.status === 'skipped').length,
      0
    )
    return { name: p.name, order: p.order, totalSteps: stepTotal, completedSteps: stepDone, stages }
  })

  const allSteps = phases.flatMap((p) => p.stages.flatMap((s) => s.steps))
  const total = allSteps.length
  const done = allSteps.filter((s: any) => s.status === 'done' || s.status === 'skipped').length

  // Current phase = first phase with an incomplete (pending) step.
  let currentPhaseOrder: number | null = null
  for (const ph of phases) {
    if (ph.stages.some((s) => s.steps.some((st: any) => st.status === 'pending'))) {
      currentPhaseOrder = ph.order
      break
    }
  }

  return {
    id: cw.id,
    name: cw.name,
    description: cw.description,
    sourceWorkflowId: cw.sourceWorkflowId,
    startDate: cw.startDate,
    appliedAt: cw.appliedAt,
    status: cw.status,
    totalSteps: total,
    completedSteps: done,
    currentPhaseOrder,
    phases,
  }
}
