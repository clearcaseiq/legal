/**
 * Applies a firm's "applied" (default) workflow to a specific case as a
 * point-in-time snapshot. The firm workflow's stages/steps are copied into
 * CaseWorkflowItem rows so later edits to the firm template don't disrupt
 * in-flight matters. Step due dates are computed as startDate + dueOffsetDays.
 *
 * Idempotent: a case can only have one workflow (CaseWorkflow.assessmentId is
 * unique), so re-invoking is a no-op once applied.
 */
import { prisma } from './prisma'
import { logger } from './logger'

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
  let workflow: any = null
  if (params.workflowId) {
    workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { id: params.workflowId, ...(params.lawFirmId ? { lawFirmId: params.lawFirmId } : {}) },
      include: { stages: { include: { steps: true } } },
    })
  } else if (params.lawFirmId) {
    workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { lawFirmId: params.lawFirmId, isDefault: true },
      include: { stages: { include: { steps: true } } },
    })
  }
  if (!workflow) return { created: false, reason: 'no_workflow' }

  const start = params.startDate || new Date()
  const stages = [...(workflow.stages || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
  const items: any[] = []
  stages.forEach((stage: any, si: number) => {
    const steps = [...(stage.steps || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    steps.forEach((step: any, ti: number) => {
      items.push({
        stageName: stage.name,
        stageOrder: si,
        title: step.title,
        description: step.description || null,
        assigneeRole: step.assigneeRole || null,
        dueOffsetDays: typeof step.dueOffsetDays === 'number' ? step.dueOffsetDays : null,
        dueDate: typeof step.dueOffsetDays === 'number' ? addDays(start, step.dueOffsetDays) : null,
        required: Boolean(step.required),
        templateId: step.templateId || null,
        sortOrder: ti,
      })
    })
  })

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

/** Serialize a case workflow (+items) into a stage-grouped progress view. */
export function serializeCaseWorkflow(cw: any) {
  const items = [...(cw.items || [])].sort(
    (a: any, b: any) => a.stageOrder - b.stageOrder || a.sortOrder - b.sortOrder
  )
  const stageMap = new Map<number, any>()
  for (const it of items) {
    if (!stageMap.has(it.stageOrder)) {
      stageMap.set(it.stageOrder, { name: it.stageName, order: it.stageOrder, steps: [] })
    }
    stageMap.get(it.stageOrder).steps.push({
      id: it.id,
      title: it.title,
      description: it.description,
      assigneeRole: it.assigneeRole,
      dueOffsetDays: it.dueOffsetDays,
      dueDate: it.dueDate,
      required: it.required,
      templateId: it.templateId,
      status: it.status,
      completedAt: it.completedAt,
    })
  }
  const stages = [...stageMap.values()].sort((a, b) => a.order - b.order)
  const total = items.length
  const done = items.filter((i: any) => i.status === 'done').length
  // Current stage = first stage with an incomplete (non-done/skipped) step.
  let currentStageOrder: number | null = null
  for (const st of stages) {
    if (st.steps.some((s: any) => s.status === 'pending')) {
      currentStageOrder = st.order
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
    currentStageOrder,
    stages,
  }
}
