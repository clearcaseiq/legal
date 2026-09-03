/**
 * The ordering in `processInboundSmsDecision` is the whole point of these tests.
 *
 * Keywords are handled before the attorney lookup. Claimants are not rows in
 * the `Attorney` table, so a STOP checked after that lookup falls through to
 * "Phone number not recognized" — and claimants are exactly who was promised
 * that STOP works.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

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

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { processInboundSmsDecision } from './sms-inbound'
import { attorneyAcceptCase } from './routing-lifecycle'

const prismaMock = prisma as any

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('inbound STOP', () => {
  it('records the opt-out for a claimant who is not an attorney', async () => {
    prismaMock.attorney.findFirst.mockResolvedValue(null)

    const result = await processInboundSmsDecision({
      fromPhone: '+14155550100',
      body: 'STOP',
      messageId: 'SM_stop_1',
    })

    expect(result.processingStatus).toBe('processed')
    expect(result.optOutKeyword).toBe('stop')
    expect(result.responseMessage).toContain('unsubscribed')
    expect(prismaMock.smsOptOut.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+14155550100' } }),
    )
  })

  it('never reaches the attorney lookup, so a claimant is not told their number is unrecognised', async () => {
    await processInboundSmsDecision({ fromPhone: '+14155550100', body: 'stop', messageId: 'SM_stop_2' })

    expect(prismaMock.attorney.findFirst).not.toHaveBeenCalled()
  })

  it('opts an attorney out too, rather than treating the keyword as a decision reply', async () => {
    prismaMock.attorney.findFirst.mockResolvedValue({ id: 'att-1' })

    const result = await processInboundSmsDecision({
      fromPhone: '+14155550199',
      body: 'UNSUBSCRIBE',
      messageId: 'SM_stop_3',
    })

    expect(result.optOutKeyword).toBe('stop')
    expect(attorneyAcceptCase).not.toHaveBeenCalled()
  })
})

describe('inbound START and HELP', () => {
  it('lifts the opt-out on START', async () => {
    const result = await processInboundSmsDecision({
      fromPhone: '+14155550100',
      body: 'START',
      messageId: 'SM_start_1',
    })

    expect(result.optOutKeyword).toBe('start')
    expect(result.responseMessage).toContain('resubscribed')
    expect(prismaMock.smsOptOut.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+14155550100', optedInAt: null } }),
    )
  })

  it('answers HELP without touching an opt-out already in force', async () => {
    // HELP is a question, not a change of preference. Treating it as one would
    // silently resubscribe someone who asked what the service was.
    const result = await processInboundSmsDecision({
      fromPhone: '+14155550100',
      body: 'HELP',
      messageId: 'SM_help_1',
    })

    expect(result.optOutKeyword).toBe('help')
    expect(result.responseMessage).toContain('STOP')
    expect(prismaMock.smsOptOut.upsert).not.toHaveBeenCalled()
    expect(prismaMock.smsOptOut.updateMany).not.toHaveBeenCalled()
  })
})

describe('attorney decision replies still work', () => {
  it('routes ACCEPT to the decision path, not the keyword path', async () => {
    prismaMock.attorney.findFirst.mockResolvedValue({ id: 'att-1' })
    prismaMock.introduction.findMany.mockResolvedValue([{ id: 'intro-1' }])

    const result = await processInboundSmsDecision({
      fromPhone: '+14155550199',
      body: 'ACCEPT',
      messageId: 'SM_accept_1',
    })

    expect(result.optOutKeyword).toBeUndefined()
    expect(result.decision).toBe('ACCEPTED')
    expect(attorneyAcceptCase).toHaveBeenCalledWith('intro-1', 'att-1')
  })
})
