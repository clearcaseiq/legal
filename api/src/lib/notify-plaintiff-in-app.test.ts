import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({
  createNotificationEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
}))
vi.mock('./attorney-push', () => ({ notifyAttorneyByUserEmail: vi.fn() }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { createNotificationEvent } from './platform-notifications'
import { notifyPlaintiffInApp } from './case-notifications'

const createEvent = vi.mocked(createNotificationEvent)

describe('notifyPlaintiffInApp', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    createEvent.mockReset()
    createEvent.mockResolvedValue({ id: 'event-1' } as any)
  })

  it('writes an in-app event under the plaintiff type prefix', async () => {
    const ok = await notifyPlaintiffInApp({
      userId: 'user-1',
      recipientEmail: 'plaintiff@example.com',
      attorneyId: 'att-1',
      assessmentId: 'assess-1',
      eventType: 'consult_cancelled',
      subject: 'Your consultation was cancelled',
      body: 'Ari cancelled your consultation.',
      link: '/dashboard',
    })

    expect(ok).toBe(true)
    const event = createEvent.mock.calls[0][0] as any
    expect(event.channel).toBe('in_app')
    expect(event.role).toBe('plaintiff')
    // The feed lists rows whose `type` starts with `plaintiff.`, and `type` is
    // taken from templateKey when present — so setting one would silently hide
    // the notification.
    expect(event.eventType).toBe('plaintiff.consult_cancelled')
    expect(event.templateKey).toBeUndefined()
    expect(event.payload).toMatchObject({ link: '/dashboard', assessmentId: 'assess-1' })
  })

  it('does not double-prefix a type that already carries it', async () => {
    await notifyPlaintiffInApp({
      userId: 'user-1',
      recipientEmail: 'plaintiff@example.com',
      eventType: 'plaintiff.task_assigned',
      subject: 'New task',
      body: 'Upload your medical records.',
    })

    expect((createEvent.mock.calls[0][0] as any).eventType).toBe('plaintiff.task_assigned')
  })

  it('looks up the recipient email when the caller does not supply one', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'looked-up@example.com' } as any)

    const ok = await notifyPlaintiffInApp({
      userId: 'user-1',
      eventType: 'task_assigned',
      subject: 'New task',
      body: 'Upload your medical records.',
    })

    expect(ok).toBe(true)
    expect((createEvent.mock.calls[0][0] as any).recipient).toBe('looked-up@example.com')
  })

  it('reports failure rather than success when there is no recipient', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)

    const ok = await notifyPlaintiffInApp({
      userId: 'user-1',
      eventType: 'task_assigned',
      subject: 'New task',
      body: 'Upload your medical records.',
    })

    // The in-app writer drops events with no recipient, so returning true here
    // would report a delivery that never happened.
    expect(ok).toBe(false)
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('never throws into the caller when the event write fails', async () => {
    createEvent.mockRejectedValue(new Error('db down'))

    await expect(
      notifyPlaintiffInApp({
        userId: 'user-1',
        recipientEmail: 'plaintiff@example.com',
        eventType: 'task_assigned',
        subject: 'New task',
        body: 'Upload your medical records.',
      })
    ).resolves.toBe(false)
  })
})
