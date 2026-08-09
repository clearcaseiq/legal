/**
 * Demand-preparation checklist.
 *
 * When a case advances to DEMAND_PREPARATION the platform auto-creates the
 * canonical demand-package checklist so nothing is forgotten before a demand
 * goes to the carrier. These are immediately-actionable human tasks (NOT AI
 * "coach" tasks), so they are never held behind the AI review gate. They carry
 * `milestoneType: 'demand_preparation'` so the stage engine and the tasks UI
 * can group them.
 *
 * Idempotent: dedupes by title across ALL statuses, so completed/deleted items
 * are never recreated.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const DEMAND_PREP_MILESTONE = 'demand_preparation'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type Priority = 'low' | 'medium' | 'high'

interface DemandPrepTaskDef {
  title: string
  role: 'attorney' | 'paralegal'
  dueInDays: number
  priority: Priority
  notes?: string
}

/** The canonical demand-package checklist. Deduped independently by title. */
const DEMAND_PREP_CHECKLIST: DemandPrepTaskDef[] = [
  {
    title: 'Obtain final itemized medical bills and complete records',
    role: 'paralegal',
    dueInDays: 3,
    priority: 'high',
    notes: 'The demand cannot be finalized until the special damages are locked down.',
  },
  {
    title: 'Confirm treatment complete / MMI (discharge or MMI note on file)',
    role: 'paralegal',
    dueInDays: 3,
    priority: 'high',
  },
  {
    title: 'Identify all liens and request payoff figures (health, medical, gov’t)',
    role: 'paralegal',
    dueInDays: 5,
    priority: 'medium',
  },
  {
    title: 'Compile damages exhibits (bill summary, wage-loss verification, records)',
    role: 'paralegal',
    dueInDays: 5,
    priority: 'medium',
  },
  {
    title: 'Confirm policy limits and coverage in writing',
    role: 'paralegal',
    dueInDays: 5,
    priority: 'medium',
  },
  {
    title: 'Draft and finalize demand letter',
    role: 'attorney',
    dueInDays: 7,
    priority: 'high',
    notes: 'Assemble from the structured damages, liability, and medical ledgers, then finalize.',
  },
  {
    title: 'Attorney review and approve demand package before sending',
    role: 'attorney',
    dueInDays: 7,
    priority: 'high',
  },
]

/**
 * Create the demand-preparation checklist for a case. Idempotent — safe to call
 * on every stage sync. Returns the number of tasks created.
 */
export async function createDemandPrepTasks(
  assessmentId: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true } })
    .catch(() => [] as Array<{ title: string }>)
  const existingTitles = new Set(existing.map((t) => String(t.title || '').trim().toLowerCase()))

  const createdByName = opts?.createdByName ?? 'ClearCaseIQ'
  const now = new Date()
  let created = 0

  for (const def of DEMAND_PREP_CHECKLIST) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: def.title,
          taskType: 'milestone',
          milestoneType: DEMAND_PREP_MILESTONE,
          dueDate,
          reminderAt: addDays(dueDate, -1),
          priority: def.priority,
          escalationLevel: def.priority === 'high' ? 'warning' : 'none',
          status: 'open',
          assignedRole: def.role,
          notes: def.notes || 'Auto-created demand-preparation checklist item.',
          createdById: opts?.createdById || null,
          createdByName,
        },
      })
      .then(() => {
        created += 1
        existingTitles.add(normalized)
      })
      .catch((e: any) =>
        logger.warn('Demand-prep task create failed', { assessmentId, title: def.title, error: e?.message }),
      )
  }

  if (created > 0) {
    logger.info('Created demand-preparation tasks', { assessmentId, created })
    void recordCaseChange({
      assessmentId,
      source: 'system',
      action: 'demand_prep_tasks_created',
      entityType: 'task',
      summary: `Created ${created} demand-preparation checklist item${created === 1 ? '' : 's'}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
  }

  return created
}
