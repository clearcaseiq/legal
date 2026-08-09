/**
 * Case close-out checklist.
 *
 * Materialized when a matter reaches CLOSED. These are the final administrative
 * steps that protect the firm after the money moves: confirm the client has the
 * signed settlement statement, all liens are released, the file is retained per
 * policy, and the matter is closed in every system. Immediately-actionable human
 * tasks (never behind the AI review gate). milestoneType 'closeout'.
 *
 * Idempotent: dedupes by lowercased title across all statuses.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const CLOSEOUT_MILESTONE = 'closeout'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type Priority = 'low' | 'medium' | 'high'
interface CloseoutTaskDef {
  title: string
  role: 'attorney' | 'paralegal'
  dueInDays: number
  priority: Priority
  notes?: string
}

const CLOSEOUT_CHECKLIST: CloseoutTaskDef[] = [
  { title: 'Confirm client received signed settlement statement and funds', role: 'attorney', dueInDays: 3, priority: 'high' },
  { title: 'Confirm all lien releases received and filed', role: 'paralegal', dueInDays: 7, priority: 'high' },
  { title: 'Reconcile trust ledger to zero for this matter', role: 'paralegal', dueInDays: 7, priority: 'high' },
  { title: 'Send case-closing letter to client', role: 'paralegal', dueInDays: 5, priority: 'medium' },
  { title: 'Apply file-retention policy and archive the matter', role: 'paralegal', dueInDays: 14, priority: 'low' },
  { title: 'Request client review / satisfaction survey', role: 'paralegal', dueInDays: 10, priority: 'low' },
]

/** Create the close-out checklist. Idempotent. Returns count created. */
export async function createCloseoutTasks(
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

  for (const def of CLOSEOUT_CHECKLIST) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: def.title,
          taskType: 'milestone',
          milestoneType: CLOSEOUT_MILESTONE,
          dueDate,
          reminderAt: addDays(dueDate, -1),
          priority: def.priority,
          escalationLevel: def.priority === 'high' ? 'warning' : 'none',
          status: 'open',
          assignedRole: def.role,
          notes: def.notes || 'Auto-created case close-out checklist item.',
          createdById: opts?.createdById || null,
          createdByName,
        },
      })
      .then(() => {
        created += 1
        existingTitles.add(normalized)
      })
      .catch((e: any) => logger.warn('Closeout task create failed', { assessmentId, title: def.title, error: e?.message }))
  }

  if (created > 0) {
    logger.info('Created case close-out tasks', { assessmentId, created })
    void recordCaseChange({
      assessmentId,
      source: 'system',
      action: 'closeout_tasks_created',
      entityType: 'task',
      summary: `Created ${created} close-out checklist item${created === 1 ? '' : 's'}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
  }

  return created
}
