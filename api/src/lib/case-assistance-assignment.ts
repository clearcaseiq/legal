/**
 * Getting a newly assessed case in front of a specialist.
 *
 * Called fire-and-forget when a report generates, so it never throws: a failed
 * assignment leaves the case in the unassigned queue, which is visible and
 * workable. Losing the valuation the plaintiff is waiting on because nobody was
 * available to call them would be the worse trade.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { createNotificationEvent } from './platform-notifications'
import { SPECIALIST_EVENTS } from './notification-events'
import { SPECIALIST_ROLE } from './specialist-access'
import { ACTIVE_ASSISTANCE_STATUSES, reviewDueFrom } from './case-assistance'

/**
 * Round-robin over active specialists, by current workload rather than a stored
 * rotation pointer.
 *
 * A pointer has to be kept in step with the roster, and gets it wrong exactly
 * when it matters: after someone joins, leaves or comes back from a week off,
 * the next several cases land on whoever the pointer happens to be at.
 * Least-loaded-first reaches the same even distribution on a stable roster and
 * self-corrects on a changing one, and it fills a returning specialist's empty
 * queue instead of skipping them.
 *
 * Ties break on who was assigned longest ago, so two specialists at the same
 * count still alternate rather than one of them taking every case.
 */
export async function pickNextSpecialist(): Promise<string | null> {
  const specialists = await prisma.user.findMany({
    where: { role: SPECIALIST_ROLE, isActive: true },
    select: { id: true },
  })
  if (specialists.length === 0) return null

  const [loads, lastAssigned] = await Promise.all([
    prisma.caseAssistance.groupBy({
      by: ['assignedSpecialistId'],
      where: {
        assignedSpecialistId: { in: specialists.map((s) => s.id) },
        status: { in: ACTIVE_ASSISTANCE_STATUSES },
      },
      _count: { _all: true },
    }),
    prisma.caseAssistance.groupBy({
      by: ['assignedSpecialistId'],
      where: { assignedSpecialistId: { in: specialists.map((s) => s.id) } },
      _max: { assignedAt: true },
    }),
  ])

  const loadById = new Map(loads.map((row) => [row.assignedSpecialistId, row._count._all]))
  const lastById = new Map(lastAssigned.map((row) => [row.assignedSpecialistId, row._max.assignedAt]))

  return specialists
    .map((specialist) => ({
      id: specialist.id,
      load: loadById.get(specialist.id) ?? 0,
      // Never assigned sorts first, which is what puts a new hire's first case
      // ahead of a colleague who was assigned one a minute ago.
      lastAt: lastById.get(specialist.id)?.getTime() ?? 0,
    }))
    .sort((a, b) => a.load - b.load || a.lastAt - b.lastAt)[0].id
}

/**
 * Create the CaseAssistance row for an assessment and assign it. Idempotent: a
 * second report on the same case does not reassign it or reset its SLA, because
 * `/predict` can be called again and the specialist already working the case
 * should keep it.
 */
export async function assignCaseAssistance(assessmentId: string): Promise<void> {
  try {
    const existing = await prisma.caseAssistance.findUnique({
      where: { assessmentId },
      select: { id: true, assignedSpecialistId: true },
    })
    if (existing?.assignedSpecialistId) return

    const specialistId = await pickNextSpecialist()
    const now = new Date()

    // No specialists configured yet is the normal state before the first hire.
    // The row is still created so the case appears in the unassigned queue the
    // moment someone is available, rather than being invisible until then.
    const assignment = specialistId
      ? {
          assignedSpecialistId: specialistId,
          status: 'needs_review',
          assignedAt: now,
          reviewDueAt: reviewDueFrom(now),
        }
      : { status: 'new_submission' }

    const assistance = existing
      ? await prisma.caseAssistance.update({ where: { id: existing.id }, data: assignment })
      : await prisma.caseAssistance.create({ data: { assessmentId, ...assignment } })

    if (!specialistId) {
      logger.info('Case assistance queued unassigned: no active specialists', { assessmentId })
      return
    }

    logger.info('Case assigned to specialist', {
      assessmentId,
      assistanceId: assistance.id,
      specialistId,
    })

    await notifySpecialistOfAssignment(specialistId, assessmentId)
  } catch (error: any) {
    logger.warn('assignCaseAssistance failed', { assessmentId, error: error?.message })
  }
}

async function notifySpecialistOfAssignment(specialistId: string, assessmentId: string) {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { caseName: true, claimType: true },
    })
    const label = assessment?.caseName || assessment?.claimType || 'A new case'

    await createNotificationEvent({
      userId: specialistId,
      assessmentId,
      // The event log has no `specialist` role. `admin` keeps these visible in
      // the admin communications log, which is where an ops lead looks when a
      // specialist says they never got the case.
      role: 'admin',
      channel: 'in_app',
      eventType: SPECIALIST_EVENTS.case_assigned,
      templateKey: 'specialist_case_assigned',
      subject: 'New case assigned',
      body: `${label} is assigned to you for review.`,
      payload: { assessmentId },
    })
  } catch (error: any) {
    // The case is assigned either way; it will be found in the queue.
    logger.warn('Specialist assignment notification failed', { specialistId, error: error?.message })
  }
}

/**
 * Reassign a case by hand. Resets the review clock, because the new owner
 * inherits the case rather than the previous owner's remaining minutes.
 */
export async function reassignCaseAssistance(
  assistanceId: string,
  specialistId: string | null,
): Promise<void> {
  const now = new Date()
  await prisma.caseAssistance.update({
    where: { id: assistanceId },
    data: specialistId
      ? { assignedSpecialistId: specialistId, assignedAt: now, reviewDueAt: reviewDueFrom(now) }
      : { assignedSpecialistId: null, assignedAt: null, reviewDueAt: null, status: 'new_submission' },
  })

  if (specialistId) {
    const assistance = await prisma.caseAssistance.findUnique({
      where: { id: assistanceId },
      select: { assessmentId: true },
    })
    if (assistance) await notifySpecialistOfAssignment(specialistId, assistance.assessmentId)
  }
}
