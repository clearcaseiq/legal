import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({
  createNotificationEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
}))
vi.mock('./attorney-push', () => ({ notifyAttorneyByUserEmail: vi.fn() }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { createNotificationEvent } from './platform-notifications'
import { notifyAttorneyInApp } from './case-notifications'

const createEvent = vi.mocked(createNotificationEvent)

describe('notifyAttorneyInApp', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    createEvent.mockResolvedValue({ id: 'event-1' } as any)
  })

  it('keys the notification to the attorney login account', async () => {
    const sent = await notifyAttorneyInApp({
      attorneyId: 'att-1',
      userId: 'user-1',
      recipientEmail: 'dana@firm.com',
      eventType: 'attorney.case_routed',
      subject: 'New case match',
      body: 'A case was routed to you.',
    })

    expect(sent).toBe(true)
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', channel: 'in_app', eventType: 'attorney.case_routed' })
    )
  })

  // The bell lists Notification rows whose `type` starts with `attorney.`, and
  // `type` is taken from templateKey when one is set. Sending a templateKey here
  // would file the row under a name the bell does not match.
  it('never sets a templateKey, which would replace the attorney.* type', async () => {
    await notifyAttorneyInApp({
      attorneyId: 'att-1',
      userId: 'user-1',
      recipientEmail: 'dana@firm.com',
      eventType: 'attorney.case_expiring',
      subject: 'Case expiring',
      body: 'Respond soon.',
    })

    expect(createEvent.mock.calls[0][0]).not.toHaveProperty('templateKey')
  })

  // Signup stores an address as typed and the attorney record is entered
  // separately, so the two routinely differ only in capitalization. That used to
  // drop every in-app notification for the attorney while email still arrived.
  it('finds the account when the attorney record differs only in capitalization', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ email: 'Dana@Firm.com' } as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'user-1', email: 'dana@firm.com' } as any)

    const sent = await notifyAttorneyInApp({
      attorneyId: 'att-1',
      eventType: 'attorney.case_routed',
      subject: 'New case match',
      body: 'A case was routed to you.',
    })

    expect(sent).toBe(true)
    expect(vi.mocked(prisma.user.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: 'Dana@Firm.com', mode: 'insensitive' } },
      })
    )
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }))
  })

  it('reports failure rather than writing an unreachable row when no account exists', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ email: 'nobody@firm.com' } as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as any)

    const sent = await notifyAttorneyInApp({
      attorneyId: 'att-1',
      eventType: 'attorney.case_routed',
      subject: 'New case match',
      body: 'A case was routed to you.',
    })

    expect(sent).toBe(false)
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('carries the deep link and lead id the bell navigates with', async () => {
    await notifyAttorneyInApp({
      attorneyId: 'att-1',
      userId: 'user-1',
      recipientEmail: 'dana@firm.com',
      eventType: 'attorney.case_routed',
      subject: 'New case match',
      body: 'A case was routed to you.',
      leadId: 'lead-9',
      link: '/attorney-dashboard/lead/lead-9/overview',
    })

    expect(createEvent.mock.calls[0][0].payload).toMatchObject({
      leadId: 'lead-9',
      link: '/attorney-dashboard/lead/lead-9/overview',
    })
  })

  it('never throws into the caller when the event write fails', async () => {
    createEvent.mockRejectedValue(new Error('db down'))

    await expect(
      notifyAttorneyInApp({
        attorneyId: 'att-1',
        userId: 'user-1',
        recipientEmail: 'dana@firm.com',
        eventType: 'attorney.case_routed',
        subject: 'New case match',
        body: 'A case was routed to you.',
      })
    ).resolves.toBe(false)
  })
})
