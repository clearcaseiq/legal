/**
 * What the claimant hears after a call they did not take.
 *
 * The two failures that matter: silence, which is what this replaced, and the
 * opposite — a specialist working the phones sending the same apology three
 * times in an afternoon.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({ deliverDirectNotification: vi.fn() }))
vi.mock('./sms', () => ({ sendSms: vi.fn() }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { deliverDirectNotification } from './platform-notifications'
import { sendSms } from './sms'
import { sendMissedCallFollowUp } from './missed-call-followup'

const SPECIALIST = { id: 'spec-1', name: 'Sri Reddy', email: 'sri@clearcaseiq.com' }

function call(overrides: Record<string, unknown> = {}) {
  return sendMissedCallFollowUp({
    assistanceId: 'ca-1',
    assessmentId: 'assess-1',
    contact: { email: 'claimant@example.com', phone: '+15551230000' },
    specialist: SPECIALIST,
    ...overrides,
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
  // No follow-up on record, and a claimant with a first name.
  prisma.caseInteraction.findFirst.mockResolvedValue(null)
  prisma.assessment.findUnique.mockResolvedValue({
    id: 'assess-1',
    user: { id: 'user-1', firstName: 'Dana' },
  })
  ;(deliverDirectNotification as any).mockResolvedValue(undefined)
  ;(sendSms as any).mockResolvedValue(true)
})

describe('sendMissedCallFollowUp', () => {
  it('emails and texts the claimant, and logs it on the case', async () => {
    await call()

    const email = (deliverDirectNotification as any).mock.calls[0][0]
    expect(email.recipient).toBe('claimant@example.com')
    expect(email.assessmentId).toBe('assess-1')
    expect(email.message).toContain('Dana')
    // Replies have to reach the person who actually called.
    expect(email.replyTo).toBe('sri@clearcaseiq.com')
    expect(email.fromName).toBe('Sri Reddy')

    expect(sendSms).toHaveBeenCalledWith('+15551230000', expect.stringContaining('ClearCaseIQ'))

    expect(prisma.caseInteraction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assistanceId: 'ca-1',
        channel: 'email',
        direction: 'outbound',
        outcome: 'sent',
      }),
    })
  })

  it('does not repeat itself when the same case is marked again straight away', async () => {
    // A second call the same afternoon, or a mis-clicked status being re-saved.
    prisma.caseInteraction.findFirst.mockResolvedValue({ id: 'ci-1' })

    await call()

    expect(deliverDirectNotification).not.toHaveBeenCalled()
    expect(sendSms).not.toHaveBeenCalled()
    expect(prisma.caseInteraction.create).not.toHaveBeenCalled()
  })

  it('still texts a claimant with no email on file', async () => {
    await call({ contact: { email: null, phone: '+15551230000' } })

    expect(deliverDirectNotification).not.toHaveBeenCalled()
    expect(sendSms).toHaveBeenCalled()
    expect(prisma.caseInteraction.create.mock.calls[0][0].data.channel).toBe('sms')
  })

  it('does nothing at all when there is no way to reach them', async () => {
    await call({ contact: { email: null, phone: null } })

    expect(prisma.caseInteraction.findFirst).not.toHaveBeenCalled()
    expect(deliverDirectNotification).not.toHaveBeenCalled()
    expect(sendSms).not.toHaveBeenCalled()
  })

  it('logs nothing when every channel failed, so the cooldown does not block a retry', async () => {
    ;(deliverDirectNotification as any).mockRejectedValue(new Error('ses down'))
    ;(sendSms as any).mockResolvedValue(false)

    await call()

    expect(prisma.caseInteraction.create).not.toHaveBeenCalled()
  })

  it('never lets its own failure escape into the status update', async () => {
    prisma.caseInteraction.findFirst.mockRejectedValue(new Error('db down'))

    await expect(call()).resolves.toBeUndefined()
  })
})
