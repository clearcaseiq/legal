import { beforeEach, describe, expect, it, vi } from 'vitest'

const userFindUnique = vi.fn()
const assessmentFindUnique = vi.fn()
vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    assessment: { findUnique: (...args: unknown[]) => assessmentFindUnique(...args) },
  },
}))
vi.mock('./platform-notifications', () => ({
  createNotificationEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
  deliverDirectNotification: vi.fn().mockResolvedValue({ delivered: true }),
}))
vi.mock('./attorney-push', () => ({ notifyAttorneyByUserEmail: vi.fn() }))
vi.mock('./app-url', () => ({ webUrl: (p: string) => `https://app.test${p}` }))

import { createNotificationEvent, deliverDirectNotification } from './platform-notifications'
import { notifyAttorneyByUserEmail } from './attorney-push'
import { notifyTaskAssignee } from './task-assignment-notify'

const createEvent = vi.mocked(createNotificationEvent)
const sendEmail = vi.mocked(deliverDirectNotification)
const push = vi.mocked(notifyAttorneyByUserEmail)

const base = {
  actor: { userId: 'admin-1', name: 'Geoffrey Hinton' },
  leadId: 'lead-1',
  assessmentId: 'assess-1',
  task: { id: 'task-1', title: 'Verify client contact information', dueDate: new Date('2026-10-20T12:00:00Z') },
}

describe('notifyTaskAssignee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userFindUnique.mockResolvedValue({
      id: 'user-2',
      email: 'louis@hintonlaw.com',
      firstName: 'Louis',
      isActive: true,
      role: 'attorney',
    })
    assessmentFindUnique.mockResolvedValue({ caseName: 'Rose v. Doe', user: null })
  })

  it('sends a bell entry, an email and a push to the new assignee', async () => {
    const ok = await notifyTaskAssignee({ ...base, assigneeUserId: 'user-2' })

    expect(ok).toBe(true)
    const event = createEvent.mock.calls[0][0] as any
    expect(event).toMatchObject({ userId: 'user-2', channel: 'in_app', eventType: 'attorney.task_assigned' })
    expect(event.subject).toBe('Geoffrey Hinton assigned you a task')
    expect(event.body).toContain('Rose v. Doe')
    expect(event.payload.link).toBe('/attorney-dashboard/cases/lead-1/tasks')

    const email = sendEmail.mock.calls[0][0] as any
    expect(email.recipient).toBe('louis@hintonlaw.com')
    expect(email.cta).toEqual({ label: 'Open task', url: 'https://app.test/attorney-dashboard/cases/lead-1/tasks' })
    expect(push).toHaveBeenCalledWith('louis@hintonlaw.com', expect.objectContaining({ title: event.subject }))
  })

  it('stays quiet when you assign a task to yourself', async () => {
    const ok = await notifyTaskAssignee({ ...base, assigneeUserId: 'admin-1' })
    expect(ok).toBe(false)
    expect(createEvent).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('skips deactivated accounts', async () => {
    userFindUnique.mockResolvedValue({ id: 'user-2', email: 'x@y.com', isActive: false, role: 'attorney' })
    expect(await notifyTaskAssignee({ ...base, assigneeUserId: 'user-2' })).toBe(false)
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('does nothing for an unassigned task', async () => {
    expect(await notifyTaskAssignee({ ...base, assigneeUserId: null })).toBe(false)
    expect(userFindUnique).not.toHaveBeenCalled()
  })
})
