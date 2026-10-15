/**
 * Give every task on a case a step in the case's workflow.
 *
 * Only the firm's own workflow steps were linked to tasks. Everything else on
 * the Tasks tab (the Day-1 checklist, the SOL deadline, readiness checkpoints,
 * insurance follow-ups, case intelligence actions, tasks added by hand, …) was
 * filed under a workflow heading by its title but never appeared on the
 * Workflow tab, and finishing it never moved the pipeline.
 *
 * Each such task now gets a linked step in the stage it belongs to. Rose's
 * tasks stay out (they are suggestions until a person acts on them), as do
 * time entries. Day-1 checklist items hold their stage open like the firm's own
 * steps; everything else is added as a step that does not block its stage, so
 * a carrier follow-up or an invoice reminder cannot stall a case, and the SOL
 * deadline, open for the life of the case, cannot keep Case Opening current.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { AI_AUTHOR_NAME, AI_TASK_TYPES } from './ai-author'
import {
  activeWorkflowSlot,
  buildWorkflowCatalog,
  inferWorkflowCategoryForTask,
  parseWorkflowItemIdFromTaskKey,
  workflowItemTaskKey,
  type WorkflowCatalogSlot,
} from './workflow-step-tasks'

const OPENING_MILESTONE = 'case_opening'
const EXCLUDED_TASK_TYPES = [...AI_TASK_TYPES, 'time_entry']
const DONE_STATUSES = new Set(['done', 'skipped', 'cancelled'])

type CandidateTask = {
  id: string
  title: string
  notes: string | null
  status: string
  sourceTemplateStepId: string | null
  completedAt: Date | null
  dueDate: Date | null
  priority: string
  assignedRole: string | null
  milestoneType: string | null
  checkpointType: string | null
  taskType: string
  deadlineType: string | null
  workflowPhase: string | null
  workflowStage: string | null
}

function isSol(task: CandidateTask): boolean {
  return task.taskType === 'statute' || task.deadlineType === 'sol'
}

function stepTypeFor(task: CandidateTask): string {
  if (isSol(task) || task.deadlineType || /deadline/.test(task.taskType)) return 'deadline'
  if (task.taskType === 'milestone') return 'milestone'
  if (task.taskType === 'checkpoint') return 'checkpoint'
  return 'task'
}

/** The heading picked when the task was created by hand, when the workflow has it. */
function chosenSlot(task: CandidateTask, catalog: WorkflowCatalogSlot[]): WorkflowCatalogSlot | null {
  const phase = task.workflowPhase?.trim().toLowerCase()
  const stage = task.workflowStage?.trim().toLowerCase()
  if (!stage) return null
  return (
    catalog.find(
      (slot) => slot.stageName.toLowerCase() === stage && (!phase || slot.phaseName.toLowerCase() === phase),
    ) ?? null
  )
}

/** Idempotent. Returns how many steps were added. */
export async function addCaseTasksToWorkflow(assessmentId: string): Promise<number> {
  if (!assessmentId) return 0
  const cw = await prisma.caseWorkflow
    .findUnique({ where: { assessmentId }, include: { items: true } })
    .catch(() => null)
  if (!cw?.items?.length) return 0

  await removeStepsForRemovedTasks(cw.items)

  const tasks: CandidateTask[] = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { not: 'deleted' },
      taskType: { notIn: EXCLUDED_TASK_TYPES },
      OR: [{ createdByName: null }, { createdByName: { not: AI_AUTHOR_NAME } }],
    },
    select: {
      id: true,
      title: true,
      notes: true,
      status: true,
      sourceTemplateStepId: true,
      completedAt: true,
      dueDate: true,
      priority: true,
      assignedRole: true,
      milestoneType: true,
      checkpointType: true,
      taskType: true,
      deadlineType: true,
      workflowPhase: true,
      workflowStage: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  if (tasks.length === 0) return 0

  const { taskBelongsToWorkflowItem } = await import('./workflow-reconcile')
  const items: Array<(typeof cw.items)[number]> = [...cw.items]
  const catalog = buildWorkflowCatalog(items)
  const activeSlot = activeWorkflowSlot(items)
  let added = 0

  for (const task of tasks) {
    if (parseWorkflowItemIdFromTaskKey(task.sourceTemplateStepId)) continue
    const covered = items.some(
      (item) => item.stepType !== 'ai_milestone' && taskBelongsToWorkflowItem(item, task as any),
    )
    if (covered) continue
    const slot = chosenSlot(task, catalog) ?? inferWorkflowCategoryForTask(task, catalog, activeSlot)
    if (!slot) continue

    const stageSort = items
      .filter((item) => item.stageOrder === slot.stageOrder && (item.phaseOrder ?? 0) === slot.phaseOrder)
      .map((item) => item.sortOrder)
    const done = DONE_STATUSES.has(task.status)
    const blocks = task.milestoneType === OPENING_MILESTONE && !isSol(task)
    const item = await prisma.caseWorkflowItem.create({
      data: {
        caseWorkflowId: cw.id,
        phaseName: slot.phaseName,
        phaseOrder: slot.phaseOrder,
        stageName: slot.stageName,
        stageOrder: slot.stageOrder,
        title: task.title,
        stepType: stepTypeFor(task),
        blocksStage: blocks,
        sourceTaskId: task.id,
        assigneeRole: task.assignedRole || null,
        dueDate: task.dueDate,
        required: isSol(task) || (blocks && task.priority === 'high'),
        status: done ? 'done' : 'pending',
        completedAt: done ? task.completedAt ?? new Date() : null,
        custom: true,
        sortOrder: stageSort.length ? Math.max(...stageSort) + 1 : 0,
      },
    })
    // A task with no key of its own also takes the wfitem: link, which groups
    // it under this exact step on the Tasks tab.
    if (!task.sourceTemplateStepId) {
      await prisma.caseTask.update({
        where: { id: task.id },
        data: { sourceTemplateStepId: workflowItemTaskKey(item.id) },
      })
    }
    items.push(item)
    added += 1
  }

  if (added > 0) logger.info('Added case tasks to workflow', { assessmentId, added })
  return added
}

/**
 * A step added for a task exists only to mirror it, so it goes when the task is
 * deleted or merged into another (whose own step carries the work).
 */
async function removeStepsForRemovedTasks(items: Array<{ id: string; custom: boolean; sourceTaskId: string | null }>) {
  const mirrored = items.filter((item) => item.custom && item.sourceTaskId)
  if (mirrored.length === 0) return
  const live = await prisma.caseTask.findMany({
    where: {
      id: { in: mirrored.map((item) => item.sourceTaskId as string) },
      mergedIntoId: null,
      status: { not: 'deleted' },
    },
    select: { id: true },
  })
  const liveIds = new Set(live.map((task) => task.id))
  const gone = mirrored.filter((item) => !liveIds.has(item.sourceTaskId as string)).map((item) => item.id)
  if (gone.length === 0) return
  await prisma.caseWorkflowItem.deleteMany({ where: { id: { in: gone } } })
  const goneSet = new Set(gone)
  for (let i = items.length - 1; i >= 0; i -= 1) if (goneSet.has(items[i].id)) items.splice(i, 1)
}
