/**
 * An attorney pays on Stripe before the accept runs. These pin that the accept
 * sees the payment even before the webhook lands, and that a lost race hands
 * the money (or the included case) back.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

const stripe = vi.hoisted(() => ({
  retrieve: vi.fn(),
  refund: vi.fn(),
}))
vi.mock('./stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { retrieve: stripe.retrieve } },
    refunds: { create: stripe.refund },
  }),
}))
vi.mock('../env', () => ({ ENV: { STRIPE_SECRET_KEY: 'sk_test_x' } }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { hasSettledRoutingFee, refundRoutingFee } from './routing-fee'

const db = prisma as any

beforeEach(() => {
  resetUniversalPrismaMock()
  stripe.retrieve.mockReset()
  stripe.refund.mockReset()
  stripe.refund.mockResolvedValue({ id: 're_1' })
})

describe('hasSettledRoutingFee', () => {
  it('is false when the attorney never paid', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([])
    expect(await hasSettledRoutingFee('att-1', 'lead-1')).toBe(false)
  })

  it('accepts an included subscription case', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([
      { id: 'p1', type: 'routing_fee_subscription_credit', status: 'applied' },
    ])
    expect(await hasSettledRoutingFee('att-1', 'lead-1')).toBe(true)
  })

  it('confirms a paid checkout with Stripe before the webhook arrives', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([
      { id: 'p1', type: 'routing_fee', status: 'checkout_created', stripeCheckoutSessionId: 'cs_1' },
    ])
    stripe.retrieve.mockResolvedValue({ payment_status: 'paid', payment_intent: 'pi_1' })

    expect(await hasSettledRoutingFee('att-1', 'lead-1')).toBe(true)
    expect(vi.mocked(db.platformPayment.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ status: 'paid' }) }),
    )
  })

  it('is false for a checkout the attorney abandoned', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([
      { id: 'p1', type: 'routing_fee', status: 'checkout_created', stripeCheckoutSessionId: 'cs_1' },
    ])
    stripe.retrieve.mockResolvedValue({ payment_status: 'unpaid' })
    expect(await hasSettledRoutingFee('att-1', 'lead-1')).toBe(false)
  })
})

describe('refundRoutingFee', () => {
  it('refunds a card payment', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([
      { id: 'p1', type: 'routing_fee', status: 'paid', stripePaymentIntentId: 'pi_1' },
    ])

    expect(await refundRoutingFee('att-1', 'lead-1', 'CASE_ALREADY_CLAIMED')).toEqual({ refunded: true })
    expect(stripe.refund).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: 'pi_1' }))
  })

  it('returns an included case to a capped subscription', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([
      {
        id: 'p1',
        type: 'routing_fee_subscription_credit',
        status: 'applied',
        metadata: JSON.stringify({ remainingCasesAfterAcceptance: 3 }),
      },
    ])

    expect(await refundRoutingFee('att-1', 'lead-1', 'WINDOW_EXPIRED')).toEqual({ refunded: true })
    expect(vi.mocked(db.attorneyProfile.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionRemainingCases: { increment: 1 } } }),
    )
  })

  it('does nothing when nothing was paid', async () => {
    vi.mocked(db.platformPayment.findMany).mockResolvedValue([])
    expect(await refundRoutingFee('att-1', 'lead-1', 'x')).toEqual({ refunded: false })
    expect(stripe.refund).not.toHaveBeenCalled()
  })
})
