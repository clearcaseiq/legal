/**
 * Settlement + disbursement checklists.
 *
 * When a case reaches SETTLEMENT_PENDING (agreement reached, funds pending) and
 * later DISBURSEMENT (funds in trust, distributing to the client), the platform
 * auto-creates the canonical checklist for that stage so nothing is forgotten —
 * lien reductions, the settlement statement, the disbursement/closing steps that
 * protect the client's net recovery.
 *
 * These are immediately-actionable human tasks (NOT AI "coach" tasks), so they
 * are never held behind the AI review gate. They carry
 * `milestoneType: 'settlement' | 'disbursement'`.
 *
 * Idempotent: dedupes by title across ALL statuses.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const SETTLEMENT_MILESTONE = 'settlement'
export const DISBURSEMENT_MILESTONE = 'disbursement'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type Priority = 'low' | 'medium' | 'high'

interface StageTaskDef {
  title: string
  role: 'attorney' | 'paralegal'
  dueInDays: number
  priority: Priority
  notes?: string
}

const SETTLEMENT_CHECKLIST: StageTaskDef[] = [
  {
    title: 'Confirm settlement terms in writing with the carrier',
    role: 'attorney',
    dueInDays: 2,
    priority: 'high',
  },
  {
    title: 'Negotiate final lien reductions (health, medical, gov’t)',
    role: 'paralegal',
    dueInDays: 7,
    priority: 'high',
    notes: 'Reducing liens directly increases the client’s net recovery.',
  },
  {
    title: 'Finalize case costs and expenses ledger',
    role: 'paralegal',
    dueInDays: 5,
    priority: 'medium',
  },
  {
    title: 'Prepare settlement statement and net-to-client disbursement sheet',
    role: 'attorney',
    dueInDays: 7,
    priority: 'high',
  },
  {
    title: 'Obtain executed release and client sign-off on disbursement',
    role: 'attorney',
    dueInDays: 10,
    priority: 'high',
  },
]

const DISBURSEMENT_CHECKLIST: StageTaskDef[] = [
  {
    title: 'Deposit settlement funds into trust and confirm clearance',
    role: 'paralegal',
    dueInDays: 3,
    priority: 'high',
  },
  {
    title: 'Pay negotiated liens and obtain lien releases',
    role: 'paralegal',
    dueInDays: 7,
    priority: 'high',
  },
  {
    title: 'Disburse attorney fees and reimburse case costs',
    role: 'attorney',
    dueInDays: 7,
    priority: 'medium',
  },
  {
    title: 'Issue client disbursement and deliver signed settlement statement',
    role: 'attorney',
    dueInDays: 7,
    priority: 'high',
  },
  {
    title: 'Close the file and archive records',
    role: 'paralegal',
    dueInDays: 14,
    priority: 'low',
  },
]

async function createStageTasks(
  assessmentId: string,
  milestoneType: string,
  checklist: StageTaskDef[],
  label: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true } })
    .catch(() => [] as Array<{ title: string }>)
  const existingTitles = new Set(existing.map((t) => String(t.title || '').trim().toLowerCase()))

  const createdByName = opts?.createdByName ?? 'ClearCaseIQ'
  const now = new Date()
  let created = 0

  for (const def of checklist) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: def.title,
          taskType: 'milestone',
          milestoneType,
          dueDate,
          reminderAt: addDays(dueDate, -1),
          priority: def.priority,
          escalationLevel: def.priority === 'high' ? 'warning' : 'none',
          status: 'open',
          assignedRole: def.role,
          notes: def.notes || `Auto-created ${label} checklist item.`,
          createdById: opts?.createdById || null,
          createdByName,
        },
      })
      .then(() => {
        created += 1
        existingTitles.add(normalized)
      })
      .catch((e: any) =>
        logger.warn(`${label} task create failed`, { assessmentId, title: def.title, error: e?.message }),
      )
  }

  if (created > 0) {
    logger.info(`Created ${label} tasks`, { assessmentId, created })
    void recordCaseChange({
      assessmentId,
      source: 'system',
      action: `${milestoneType}_tasks_created`,
      entityType: 'task',
      summary: `Created ${created} ${label} checklist item${created === 1 ? '' : 's'}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
  }

  return created
}

/** Settlement checklist — materialized on entry to SETTLEMENT_PENDING. */
export function createSettlementTasks(
  assessmentId: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  return createStageTasks(assessmentId, SETTLEMENT_MILESTONE, SETTLEMENT_CHECKLIST, 'settlement', opts)
}

/** Disbursement checklist — materialized on entry to DISBURSEMENT. */
export function createDisbursementTasks(
  assessmentId: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  return createStageTasks(assessmentId, DISBURSEMENT_MILESTONE, DISBURSEMENT_CHECKLIST, 'disbursement', opts)
}
