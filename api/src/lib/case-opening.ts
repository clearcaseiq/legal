/**
 * Day-1 Case Opening checklist.
 *
 * When a matter is retained, ClearCaseIQ auto-creates the canonical opening
 * checklist so the paralegal/attorney don't have to remember it. These are
 * immediately-actionable human tasks (NOT AI "coach" tasks), so they are never
 * held behind the AI review gate. They carry `milestoneType: 'case_opening'`
 * which the stage engine uses to detect when opening is complete
 * (OPENING → INVESTIGATION).
 *
 * The statute-of-limitations deadline is created here too, but as a first-class
 * `statute`/`sol` task (NOT a case_opening milestone) because it stays open for
 * the life of the case and must not block the opening→investigation transition.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'
import { calculateSOL, getSOLStatus } from './solRules'

const OPENING_MILESTONE = 'case_opening'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type Priority = 'low' | 'medium' | 'high'

interface OpeningTaskDef {
  title: string
  role: 'attorney' | 'paralegal'
  dueInDays: number
  priority: Priority
  notes?: string
}

/**
 * The canonical Day-1 checklist. Order matters only for display; each task is
 * deduped independently by title.
 */
const OPENING_CHECKLIST: OpeningTaskDef[] = [
  { title: 'Confirm signed retainer agreement', role: 'attorney', dueInDays: 1, priority: 'high' },
  { title: 'Obtain signed HIPAA authorization', role: 'paralegal', dueInDays: 2, priority: 'high' },
  { title: 'Verify client contact information', role: 'paralegal', dueInDays: 1, priority: 'medium' },
  { title: 'Complete conflict check', role: 'attorney', dueInDays: 1, priority: 'high' },
  { title: 'Confirm scope of representation', role: 'attorney', dueInDays: 2, priority: 'medium' },
  { title: 'Open insurance claim(s)', role: 'paralegal', dueInDays: 3, priority: 'high' },
  { title: 'Identify and log claims adjuster', role: 'paralegal', dueInDays: 3, priority: 'medium' },
  { title: 'Send Letter of Representation (LOR)', role: 'paralegal', dueInDays: 3, priority: 'high' },
  { title: 'Request police / incident report', role: 'paralegal', dueInDays: 5, priority: 'medium' },
  { title: "Confirm client's own applicable coverage (UM/UIM, MedPay, PIP)", role: 'paralegal', dueInDays: 5, priority: 'medium' },
]

/**
 * Create the Day-1 opening checklist + SOL deadline for a retained case.
 * Idempotent: dedupes by title across ALL statuses so completed/deleted items
 * are never recreated. Returns the number of tasks created.
 */
export async function createCaseOpeningTasks(
  assessmentId: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  const assessment = await prisma.assessment
    .findUnique({
      where: { id: assessmentId },
      select: { id: true, facts: true, venueState: true, claimType: true },
    })
    .catch(() => null)
  if (!assessment) return 0

  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true } })
    .catch(() => [] as Array<{ title: string }>)
  const existingTitles = new Set(existing.map((t) => String(t.title || '').trim().toLowerCase()))

  const createdByName = opts?.createdByName ?? 'ClearCaseIQ'
  const now = new Date()
  let created = 0

  for (const def of OPENING_CHECKLIST) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: def.title,
          taskType: 'milestone',
          milestoneType: OPENING_MILESTONE,
          dueDate,
          reminderAt: addDays(dueDate, -1),
          priority: def.priority,
          escalationLevel: def.priority === 'high' ? 'warning' : 'none',
          status: 'open',
          assignedRole: def.role,
          notes: def.notes || 'Auto-created Day-1 case opening checklist item.',
          createdById: opts?.createdById || null,
          createdByName,
        },
      })
      .then(() => {
        created += 1
        existingTitles.add(normalized)
      })
      .catch((e: any) => logger.warn('Opening task create failed', { assessmentId, title: def.title, error: e?.message }))
  }

  // Statute-of-limitations deadline — first-class SOL task, not an opening milestone.
  let facts: any = {}
  try {
    facts = assessment.facts ? JSON.parse(assessment.facts) : {}
  } catch {
    facts = {}
  }
  const incidentDate = facts?.incident?.date
  if (incidentDate && assessment.venueState && assessment.claimType) {
    const title = `Statute of limitations (${assessment.venueState} • ${assessment.claimType})`
    if (!existingTitles.has(title.trim().toLowerCase())) {
      try {
        const sol = calculateSOL(incidentDate, { state: assessment.venueState }, assessment.claimType)
        const status = getSOLStatus(sol.daysRemaining)
        await prisma.caseTask.create({
          data: {
            assessmentId,
            title,
            taskType: 'statute',
            deadlineType: 'sol',
            dueDate: sol.expiresAt,
            reminderAt: addDays(sol.expiresAt, -30),
            priority: status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low',
            escalationLevel: status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'none',
            status: 'open',
            assignedRole: 'attorney',
            notes: sol.rule?.notes || 'Auto-created statute-of-limitations deadline.',
            createdByName,
          },
        })
        created += 1
      } catch (e: any) {
        logger.warn('Opening SOL task create failed', { assessmentId, error: e?.message })
      }
    }
  }

  if (created > 0) {
    logger.info('Created Day-1 case opening tasks', { assessmentId, created })
    void recordCaseChange({
      assessmentId,
      source: 'system',
      action: 'case_opening_tasks_created',
      entityType: 'task',
      summary: `Created ${created} Day-1 case opening task${created === 1 ? '' : 's'}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
  }

  return created
}
