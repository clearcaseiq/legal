import { prisma } from './prisma'
import { logger } from './logger'
import { ATTORNEY_EVENTS } from './notification-events'
import { createNotificationEvent, deliverDirectNotification } from './platform-notifications'
import { notifyAttorneyByUserEmail } from './attorney-push'
import { webUrl } from './app-url'

/**
 * Tell a firm teammate a task was handed to them: a bell entry, an email, and a
 * push to their devices. Assigning a task to yourself is not news, so it is
 * skipped, as are inactive accounts and client (plaintiff) tasks, which have
 * their own notice.
 */
export async function notifyTaskAssignee(params: {
  assigneeUserId: string | null | undefined
  actor: { userId?: string | null; name?: string | null }
  leadId: string
  assessmentId: string
  task: { id: string; title: string; dueDate?: Date | null; priority?: string | null }
}): Promise<boolean> {
  const { assigneeUserId, actor, leadId, assessmentId, task } = params
  if (!assigneeUserId || assigneeUserId === actor.userId) return false
  try {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, email: true, firstName: true, isActive: true, role: true },
    })
    if (!assignee || assignee.isActive === false || assignee.role === 'plaintiff') return false

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { caseName: true, user: { select: { firstName: true, lastName: true } } },
    })
    const plaintiffName = [assessment?.user?.firstName, assessment?.user?.lastName].filter(Boolean).join(' ')
    const caseLabel = assessment?.caseName || plaintiffName || 'a case'

    const actorName = actor.name?.trim() || 'A teammate'
    const dueText = task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString('en-US')})` : ''
    const link = `/attorney-dashboard/cases/${leadId}/tasks`
    const subject = `${actorName} assigned you a task`
    const body = `${task.title}${dueText} — ${caseLabel}`

    await createNotificationEvent({
      userId: assignee.id,
      assessmentId,
      role: 'attorney',
      channel: 'in_app',
      eventType: ATTORNEY_EVENTS.task_assigned,
      subject,
      body,
      recipient: assignee.email || undefined,
      payload: { eventType: ATTORNEY_EVENTS.task_assigned, leadId, assessmentId, taskId: task.id, link },
    })

    if (assignee.email) {
      const greeting = assignee.firstName ? `Hi ${assignee.firstName},` : 'Hi,'
      await deliverDirectNotification({
        type: 'email',
        recipient: assignee.email,
        subject: `New task: ${task.title}`,
        message: `${greeting}\n\n${actorName} assigned you a task on ${caseLabel}${dueText}:\n\n• ${task.title}\n\nIt is also listed under Tasks in your ClearCaseIQ dashboard.`,
        userId: assignee.id,
        assessmentId,
        role: 'attorney',
        cta: { label: 'Open task', url: webUrl(link) },
        metadata: { eventType: ATTORNEY_EVENTS.task_assigned, leadId, assessmentId, taskId: task.id },
      })
      await notifyAttorneyByUserEmail(assignee.email, {
        title: subject,
        body,
        data: { leadId, taskId: task.id, type: ATTORNEY_EVENTS.task_assigned },
      })
    }
    return true
  } catch (err) {
    logger.warn('Failed to notify task assignee', {
      taskId: task.id,
      assigneeUserId,
      error: (err as Error).message,
    })
    return false
  }
}
