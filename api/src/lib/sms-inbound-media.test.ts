/**
 * Where the media branch sits in `processInboundSmsDecision` is the whole point
 * of these tests.
 *
 * It goes after the STOP/START check, so someone who opted out is still opted
 * out even if they attach a file. And it goes before the attorney lookup,
 * because claimants are not rows in the `Attorney` table — a texted photo
 * checked after that lookup gets "Phone number not recognized", which is the
 * right answer for a stranger and the wrong one for the client who just sent
 * their medical bills.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('./routing-lifecycle', () => ({
  attorneyAcceptCase: vi.fn().mockResolvedValue({ success: true }),
  attorneyDeclineCase: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('./offer-reference', () => ({
  selectOfferForReply: vi.fn().mockReturnValue({ ok: true, introductionId: 'intro-1' }),
}))
vi.mock('./sms-media-intake', () => ({
  ingestSmsMedia: vi.fn().mockResolvedValue({
    outcome: 'filed',
    assessmentId: 'asm-1',
    filed: 1,
    duplicates: 0,
    rejected: 0,
    replyMessage: 'Got it — 1 document added to your case.',
  }),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { processInboundSmsDecision } from './sms-inbound'
import { ingestSmsMedia } from './sms-media-intake'

const prismaMock = prisma as any
const MEDIA = [{ url: 'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1', contentType: 'image/jpeg' }]

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('a photo with no caption', () => {
  it('is not thrown away as an empty message', async () => {
    // People photograph a bill and hit send. They do not write anything.
    const result = await processInboundSmsDecision({
      fromPhone: '+14155550100',
      body: '',
      messageId: 'MM_1',
      media: MEDIA,
    })

    expect(result.processingStatus).toBe('processed')
    expect(ingestSmsMedia).toHaveBeenCalled()
  })

  it('is filed without ever asking whether the sender is an attorney', async () => {
    await processInboundSmsDecision({ fromPhone: '+14155550100', body: '', messageId: 'MM_2', media: MEDIA })

    expect(prismaMock.attorney.findFirst).not.toHaveBeenCalled()
  })

  it('records the case on the receipt', async () => {
    await processInboundSmsDecision({ fromPhone: '+14155550100', body: '', messageId: 'MM_3', media: MEDIA })

    expect(prismaMock.smsWebhookReceipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assessmentId: 'asm-1' }) }),
    )
  })

  it('notes how many attachments arrived', async () => {
    await processInboundSmsDecision({ fromPhone: '+14155550100', body: '', messageId: 'MM_4', media: MEDIA })

    expect(prismaMock.smsWebhookReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ numMedia: 1 }) }),
    )
  })
})

describe('STOP still wins', () => {
  it('opts the sender out rather than filing what they attached', async () => {
    const result = await processInboundSmsDecision({
      fromPhone: '+14155550100',
      body: 'STOP',
      messageId: 'MM_stop',
      media: MEDIA,
    })

    // Someone who has asked us to stop has asked us to stop. Filing their
    // attachments anyway is the same failure in a new place.
    expect(result.optOutKeyword).toBe('stop')
    expect(ingestSmsMedia).not.toHaveBeenCalled()
  })
})

describe('an unrecognised number', () => {
  it('is answered with the decline, not an attorney error', async () => {
    vi.mocked(ingestSmsMedia).mockResolvedValueOnce({
      outcome: 'no_binding',
      assessmentId: null,
      filed: 0,
      duplicates: 0,
      rejected: 0,
      replyMessage: 'We could not match this number to a case.',
    })

    const result = await processInboundSmsDecision({
      fromPhone: '+15559999999',
      body: '',
      messageId: 'MM_unknown',
      media: MEDIA,
    })

    expect(result.responseMessage).toContain('could not match this number')
    expect(result.responseMessage).not.toMatch(/not recognized/i)
    expect(result.processingStatus).toBe('ignored')
  })
})

describe('a plain text reply', () => {
  it('still takes the attorney decision path', async () => {
    prismaMock.attorney.findFirst.mockResolvedValue({ id: 'att-1', name: 'Rama', email: 'r@firm.com' })

    await processInboundSmsDecision({ fromPhone: '+14155550100', body: 'ACCEPT 1234', messageId: 'SM_1' })

    expect(ingestSmsMedia).not.toHaveBeenCalled()
    expect(prismaMock.attorney.findFirst).toHaveBeenCalled()
  })
})
