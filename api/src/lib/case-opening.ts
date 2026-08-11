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
import {
  applySoleAttorneyAssignee,
  findSoleAttorneyForAssessment,
} from './sole-firm-attorney'
import { formatClaimType } from '../../../shared/claim-types'

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
  { title: 'Complete conflict check', role: 'attorney', dueInDays: 0, priority: 'high' },
  { title: 'Send retainer to client', role: 'attorney', dueInDays: 1, priority: 'high' },
  { title: 'Confirm signed retainer agreement', role: 'attorney', dueInDays: 2, priority: 'high' },
  { title: 'Obtain signed HIPAA authorization', role: 'paralegal', dueInDays: 2, priority: 'high' },
  { title: 'Verify client contact information', role: 'paralegal', dueInDays: 1, priority: 'medium' },
  { title: 'Confirm scope of representation', role: 'attorney', dueInDays: 2, priority: 'medium' },
  { title: 'Open insurance claim(s)', role: 'paralegal', dueInDays: 3, priority: 'high' },
  { title: 'Identify and log claims adjuster', role: 'paralegal', dueInDays: 3, priority: 'medium' },
  { title: 'Send Letter of Representation (LOR)', role: 'paralegal', dueInDays: 3, priority: 'high' },
  { title: 'Request police / incident report', role: 'paralegal', dueInDays: 5, priority: 'medium' },
  { title: "Confirm client's own applicable coverage (UM/UIM, MedPay, PIP)", role: 'paralegal', dueInDays: 5, priority: 'medium' },
]

const HIPAA_OPENING_TITLE_MATCHERS = [
  /obtain signed hipaa/i,
  /signed hipaa authorization/i,
  /^hipaa authorization$/i,
]

/**
 * Pre-create satisfaction checks for Day-1 docs/work.
 * Prefer creating already-satisfied milestones as `done` (not skipping) so the
 * OPENING → INVESTIGATION stage engine still sees the checklist item.
 */
async function openingTaskSatisfaction(
  assessmentId: string,
  title: string,
): Promise<{ satisfied: boolean; reason?: string }> {
  if (HIPAA_OPENING_TITLE_MATCHERS.some((re) => re.test(title))) {
    if (await assessmentHasHipaaOnFile(assessmentId)) {
      return { satisfied: true, reason: 'HIPAA authorization already on file.' }
    }
  }
  if (/confirm signed (retainer|representation)/i.test(title)) {
    if (await assessmentHasSignedRetainerOnFile(assessmentId)) {
      return { satisfied: true, reason: 'Signed retainer already on file.' }
    }
  }
  if (
    /request police\s*\/\s*incident report/i.test(title) ||
    /collect police\/?incident report/i.test(title)
  ) {
    if (await assessmentHasPoliceReportOnFile(assessmentId)) {
      return { satisfied: true, reason: 'Police/incident report already on file.' }
    }
  }
  return { satisfied: false }
}

async function assessmentHasSignedRetainerOnFile(assessmentId: string): Promise<boolean> {
  const lead = await prisma.leadSubmission
    .findFirst({ where: { assessmentId }, select: { id: true } })
    .catch(() => null)
  if (!lead?.id) return false
  const signed = await prisma.documentEnvelope
    .findFirst({
      where: {
        leadId: lead.id,
        documentType: 'retainer',
        status: 'signed',
      },
      select: { id: true },
    })
    .catch(() => null)
  return Boolean(signed)
}

async function assessmentHasPoliceReportOnFile(assessmentId: string): Promise<boolean> {
  const categories = ['police_report', 'police', 'incident_report']
  const hit = await prisma.evidenceFile
    .findFirst({
      where: {
        assessmentId,
        OR: categories.map((category) => ({
          category: { equals: category, mode: 'insensitive' as const },
        })),
      },
      select: { id: true },
    })
    .catch(() => null)
  return Boolean(hit)
}

/**
 * Create the Day-1 opening checklist + SOL deadline for a retained case.
 * Idempotent: dedupes by title across ALL statuses so completed/deleted items
 * are never recreated. Returns the number of tasks created.
 *
 * Before create, documentation/work already on file is checked — satisfied
 * items are created as `done` so attorneys never see phantom open work.
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
  const sole = await findSoleAttorneyForAssessment(assessmentId)

  for (const def of OPENING_CHECKLIST) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    const isAutoIntake =
      /confirm signed (retainer|representation)/i.test(def.title) ||
      /complete conflict check/i.test(def.title) ||
      /^send retainer to client$/i.test(def.title)
    // Auto intake milestones open with Assignee = Auto (no person until chosen).
    const assignee = isAutoIntake
      ? { assignedUserId: null, assignedTo: null, assignedRole: def.role }
      : applySoleAttorneyAssignee(
          { assignedUserId: null, assignedTo: null, assignedRole: def.role },
          sole,
        )
    const satisfaction = await openingTaskSatisfaction(assessmentId, def.title)
    const baseNotes = def.notes || 'Auto-created Day-1 case opening checklist item.'
    const notes = satisfaction.satisfied
      ? `${baseNotes}\nAuto-completed at create — ${satisfaction.reason}`.trim()
      : baseNotes
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
          status: satisfaction.satisfied ? 'done' : 'open',
          completedAt: satisfaction.satisfied ? now : null,
          assignedRole: assignee.assignedRole || def.role,
          assignedTo: assignee.assignedTo,
          assignedUserId: assignee.assignedUserId,
          notes,
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
  // Check-before-create: require incident/venue/claimType, skip if any SOL already
  // calendared on this case (any title / prior slug), only create after calculateSOL succeeds.
  let facts: any = {}
  try {
    facts = assessment.facts ? JSON.parse(assessment.facts) : {}
  } catch {
    facts = {}
  }
  const incidentDate = facts?.incident?.date
  const existingSol = await prisma.caseTask
    .findFirst({
      where: {
        assessmentId,
        mergedIntoId: null,
        OR: [{ deadlineType: 'sol' }, { taskType: 'statute' }],
      },
      select: { id: true },
    })
    .catch(() => null)

  if (existingSol) {
    // Already calendared — nothing to create.
  } else if (incidentDate && assessment.venueState && assessment.claimType) {
    try {
      const sol = calculateSOL(incidentDate, { state: assessment.venueState }, assessment.claimType)
      const status = getSOLStatus(sol.daysRemaining)
      const claimLabel = formatClaimType(assessment.claimType)
      const title = `Statute of limitations (${assessment.venueState} • ${claimLabel})`
      if (!existingTitles.has(title.trim().toLowerCase())) {
        const solAssignee = applySoleAttorneyAssignee(
          { assignedUserId: null, assignedTo: null, assignedRole: 'attorney' },
          sole,
        )
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
            assignedRole: solAssignee.assignedRole || 'attorney',
            assignedTo: solAssignee.assignedTo,
            assignedUserId: solAssignee.assignedUserId,
            notes:
              sol.rule?.notes ||
              'Auto-created statute-of-limitations deadline — calendared from incident date, venue, and claim type.',
            createdByName,
          },
        })
        created += 1
      }
    } catch (e: any) {
      logger.warn('Opening SOL task create failed — skipped until inputs are valid', {
        assessmentId,
        error: e?.message,
      })
    }
  } else {
    logger.info('Opening SOL task skipped — missing incident date, venue, or claim type', {
      assessmentId,
      hasIncidentDate: Boolean(incidentDate),
      venueState: assessment.venueState,
      claimType: assessment.claimType,
    })
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

  // Platform HIPAA (registration) or a signed firm HIPAA envelope already on file
  // should close "Obtain signed HIPAA authorization" — otherwise Day-1 re-asks work
  // the plaintiff already completed.
  await completeHipaaOpeningTaskIfSatisfied(assessmentId).catch((e: any) =>
    logger.warn('HIPAA opening-task sync failed', { assessmentId, error: e?.message }),
  )

  return created
}

/** True when the case already has HIPAA on file (envelope and/or platform consent). */
export async function assessmentHasHipaaOnFile(assessmentId: string): Promise<boolean> {
  const assessment = await prisma.assessment
    .findUnique({
      where: { id: assessmentId },
      select: { userId: true, facts: true },
    })
    .catch(() => null)
  if (!assessment) return false

  const lead = await prisma.leadSubmission
    .findFirst({ where: { assessmentId }, select: { id: true } })
    .catch(() => null)
  if (lead?.id) {
    const signedEnvelope = await prisma.documentEnvelope
      .findFirst({
        where: {
          leadId: lead.id,
          documentType: 'hipaa_authorization',
          status: 'signed',
        },
        select: { id: true },
      })
      .catch(() => null)
    if (signedEnvelope) return true
  }

  if (assessment.userId) {
    const consent = await prisma.consent
      .findFirst({
        where: {
          userId: assessment.userId,
          consentType: 'hipaa',
          granted: true,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      })
      .catch(() => null)
    if (consent) return true
  }

  try {
    const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
    if (facts?.consents?.hipaa === true) return true
  } catch {
    /* ignore */
  }
  return false
}

/**
 * Mark Day-1 "Obtain signed HIPAA authorization" done when HIPAA is already on file.
 * Idempotent. Returns how many tasks were closed.
 */
export async function completeHipaaOpeningTaskIfSatisfied(assessmentId: string): Promise<number> {
  if (!assessmentId) return 0
  if (!(await assessmentHasHipaaOnFile(assessmentId))) return 0

  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
    select: { id: true, title: true, notes: true },
  })

  let completed = 0
  const note = 'Auto-completed — HIPAA authorization already on file.'
  for (const task of open) {
    if (!HIPAA_OPENING_TITLE_MATCHERS.some((re) => re.test(String(task.title || '')))) continue
    await prisma.caseTask.update({
      where: { id: task.id },
      data: {
        status: 'done',
        completedAt: new Date(),
        notes: task.notes?.includes(note) ? task.notes : `${task.notes || ''}\n${note}`.trim(),
      },
    })
    completed += 1
  }
  if (completed) {
    logger.info('Completed HIPAA opening task(s)', { assessmentId, completed })
  }
  return completed
}
