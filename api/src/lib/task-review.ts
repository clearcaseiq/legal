/**
 * Human-in-the-loop review gate for AI-generated tasks.
 *
 * While enabled, tasks the AI creates (Case Coach next-best-actions and
 * Intelligent-Question tasks) are held as `reviewStatus: 'pending'` and left
 * unassigned until a firm case manager approves them. Case managers on the
 * case's firm are notified to review. Flip AI_TASK_REVIEW_GATE=off to let AI
 * tasks run live once the AI is trusted.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { createNotificationEvent } from './platform-notifications'
import { AI_AUTHOR_SHORT_NAME } from './ai-author'

/** Default ON. Set AI_TASK_REVIEW_GATE to off/false/0 to let AI tasks run live. */
export function isReviewGateEnabled(): boolean {
  const v = String(process.env.AI_TASK_REVIEW_GATE ?? '').trim().toLowerCase()
  return !(v === 'off' || v === 'false' || v === '0' || v === 'no')
}

export interface ReviewActor {
  id?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

interface Reviewer {
  userId: string
  name: string
  email: string | null
}

async function firmCaseManagers(lawFirmId: string | null): Promise<Reviewer[]> {
  if (!lawFirmId) return []
  const rows = await (prisma as any).firmMember
    .findMany({
      where: { lawFirmId, role: 'case_manager', status: { in: ['active', 'invited'] } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    .catch(() => [])
  return (rows as any[])
    .filter((m) => m.userId && m.user)
    .map((m) => ({
      userId: m.userId as string,
      name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' ').trim() || m.user.email || 'Case manager',
      email: (m.user.email as string) || null,
    }))
}

/**
 * Who can sign off on AI work for this case: the firm's case managers, falling
 * back to the acting attorney so pending work always has an approver.
 */
async function resolveReviewers(lawFirmId: string | null, actor?: ReviewActor | null): Promise<Reviewer[]> {
  const reviewers = await firmCaseManagers(lawFirmId)
  if (reviewers.length > 0) return reviewers
  if (!actor?.id) return []
  return [
    {
      userId: actor.id,
      name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'Reviewer',
      email: actor.email || null,
    },
  ]
}

/** In-app plus email to each reviewer, never failing the caller. */
async function fanOutToReviewers(
  reviewers: Reviewer[],
  message: { assessmentId: string; eventType: string; subject: string; body: string },
): Promise<void> {
  for (const r of reviewers) {
    const base = {
      userId: r.userId,
      assessmentId: message.assessmentId,
      role: 'attorney' as const,
      eventType: message.eventType,
      subject: message.subject,
      body: message.body,
    }
    try {
      await createNotificationEvent({ ...base, channel: 'in_app', recipient: r.email || `user:${r.userId}` })
      if (r.email) {
        await createNotificationEvent({ ...base, channel: 'email', recipient: r.email })
      }
    } catch (e: any) {
      logger.warn('Failed to notify reviewer', { assessmentId: message.assessmentId, userId: r.userId, error: e?.message })
    }
  }
}

/**
 * Notify the case's firm case managers that the AI created tasks awaiting review.
 * Falls back to the acting attorney when the lead has no firm case manager, so
 * pending tasks always have someone who can approve them.
 */
export async function notifyTaskReviewers(params: {
  assessmentId: string
  lawFirmId: string | null
  taskTitles: string[]
  caseLabel?: string | null
  actor?: ReviewActor | null
}): Promise<void> {
  const titles = params.taskTitles.filter(Boolean)
  if (titles.length === 0) return

  const reviewers = await resolveReviewers(params.lawFirmId, params.actor)
  if (reviewers.length === 0) {
    logger.warn('No reviewer found for AI-generated tasks', { assessmentId: params.assessmentId })
    return
  }

  const count = titles.length
  const preview = titles.slice(0, 5).map((t) => `• ${t}`).join('\n')
  const subject = `Review ${count} task${count > 1 ? 's' : ''} from ${AI_AUTHOR_SHORT_NAME}`
  const body =
    `${AI_AUTHOR_SHORT_NAME}, your AI Case Manager, raised ${count} task${count > 1 ? 's' : ''} for ${params.caseLabel || 'a case'} that need your review before they go live:\n\n` +
    `${preview}${count > 5 ? `\n…and ${count - 5} more` : ''}\n\n` +
    `Open the case Tasks to approve or edit them.`

  await fanOutToReviewers(reviewers, { assessmentId: params.assessmentId, eventType: 'ai_tasks.review', subject, body })

  logger.info('Notified reviewers of AI tasks', { assessmentId: params.assessmentId, reviewers: reviewers.length, count })
}

/**
 * Notify reviewers that the AI drafted a demand letter on its own.
 *
 * Separate from the task notification on purpose: a drafted demand is a single,
 * heavier item that someone should actually read, not another line on a
 * to-approve list, and it links to the editor rather than the task board.
 */
export async function notifyDemandDraftReviewers(params: {
  assessmentId: string
  lawFirmId: string | null
  caseLabel?: string | null
  actor?: ReviewActor | null
}): Promise<void> {
  const reviewers = await resolveReviewers(params.lawFirmId, params.actor)
  if (reviewers.length === 0) {
    logger.warn('No reviewer found for AI demand draft', { assessmentId: params.assessmentId })
    return
  }

  const subject = `Review the demand letter ${AI_AUTHOR_SHORT_NAME} drafted`
  const body =
    `${AI_AUTHOR_SHORT_NAME}, your AI Case Manager, drafted a demand letter for ${params.caseLabel || 'a case'} that reached demand-ready.\n\n` +
    `It is held as a draft and will not be finalized until someone approves it. Open the case Demand tab to read, edit, and approve it.`

  await fanOutToReviewers(reviewers, {
    assessmentId: params.assessmentId,
    eventType: 'ai_demand.review',
    subject,
    body,
  })

  logger.info('Notified reviewers of AI demand draft', {
    assessmentId: params.assessmentId,
    reviewers: reviewers.length,
  })
}
