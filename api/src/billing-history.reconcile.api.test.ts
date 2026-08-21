/**
 * The billing ledger row is written when the Stripe checkout session is created,
 * before any money moves, so it starts life as "Pending". Two ways that goes wrong:
 *
 *  1. The attorney abandons the checkout. Stripe expires the session, but nothing
 *     on our side noticed, so the row read "Pending" forever (the reported bug:
 *     a $99 featured placement stuck pending next to paid routing fees).
 *  2. The webhook delivery is missed for a purchase that DID succeed. The reconcile
 *     used to only flip the row to "paid" — for featured placement that charged the
 *     attorney and never granted the placement, because the grant lives in the
 *     webhook handler.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

const sessionsRetrieve = vi.fn()
vi.mock('./lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('./lib/stripe')>('./lib/stripe')
  return {
    ...actual,
    getStripe: () => ({ checkout: { sessions: { retrieve: sessionsRetrieve } } }),
  }
})

vi.mock('../src/env', async () => {
  const actual = await vi.importActual<typeof import('./env')>('./env')
  return { ...actual, ENV: { ...actual.ENV, STRIPE_SECRET_KEY: 'sk_test_123' } }
})

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { ENV } from './env'

const app = buildApp()

const attorneyUser = { id: 'user-att-1', email: 'attorney@test.local', role: 'attorney', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const FEATURED_ROW = {
  id: 'pay-featured-1',
  attorneyId: 'att-1',
  type: 'featured_placement',
  amount: 99,
  status: 'checkout_created',
  stripeCheckoutSessionId: 'cs_featured_1',
  stripeCustomerId: 'cus_1',
  metadata: JSON.stringify({ kind: 'featured_placement', attorneyId: 'att-1', boostLevel: '1', duration: '30' }),
  createdAt: new Date('2026-08-20'),
}

const payments = () => (prisma as any).platformPayment

function givenStripeSession(session: Record<string, unknown>) {
  sessionsRetrieve.mockResolvedValue({
    id: 'cs_featured_1',
    customer: 'cus_1',
    metadata: { kind: 'featured_placement', attorneyId: 'att-1', boostLevel: '1', duration: '30' },
    amount_total: 9900,
    ...session,
  })
}

/** The status the ledger row was written to, if it was touched at all. */
function writtenStatus() {
  const calls = vi.mocked(payments().updateMany).mock.calls
  if (!calls.length) return null
  return (calls[0][0] as any).data.status
}

async function loadHistory() {
  return request(app).get('/v1/payments/platform/history').set(auth)
}

describe('billing history reconcile', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    sessionsRetrieve.mockReset()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      email: 'attorney@test.local',
      attorneyProfile: { attorneyId: 'att-1' },
    } as any)
    // The route mutates the row it read so the same response reflects the fix, so
    // hand every test its own copy rather than a shared reference.
    vi.mocked(payments().findMany).mockResolvedValue([{ ...FEATURED_ROW }] as any)
    vi.mocked(payments().updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(payments().findFirst).mockResolvedValue({ ...FEATURED_ROW } as any)
  })

  it('is wired to reconcile at all', () => {
    expect(ENV.STRIPE_SECRET_KEY).toBeTruthy()
  })

  it('retires an abandoned checkout instead of leaving it pending forever', async () => {
    givenStripeSession({ payment_status: 'unpaid', status: 'expired' })

    const res = await loadHistory()

    expect(res.status).toBe(200)
    expect(writtenStatus()).toBe('expired')
    expect(res.body.payments[0].status).toBe('expired')
  })

  it('leaves a checkout the attorney could still complete alone', async () => {
    givenStripeSession({ payment_status: 'unpaid', status: 'open' })

    const res = await loadHistory()

    expect(writtenStatus()).toBeNull()
    expect(res.body.payments[0].status).toBe('checkout_created')
  })

  it('grants the featured placement when it settles a missed webhook', async () => {
    givenStripeSession({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_1' })

    await loadHistory()

    // Marking the row paid without this leaves the attorney charged for a
    // placement they never receive.
    const grant = vi.mocked((prisma as any).attorneyProfile.update).mock.calls[0][0] as any
    expect(grant.where).toMatchObject({ attorneyId: 'att-1' })
    expect(grant.data).toMatchObject({ isFeatured: true, boostLevel: 1 })
    expect(grant.data.featuredUntil).toBeInstanceOf(Date)
  })

  it('settles the row as paid and reports it in the same response', async () => {
    givenStripeSession({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_1' })

    const res = await loadHistory()

    expect(writtenStatus()).toBe('paid')
    expect(res.body.payments[0].paid).toBe(true)
  })

  it('does not grant twice when another request settled the row first', async () => {
    givenStripeSession({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_1' })
    vi.mocked(payments().updateMany).mockResolvedValue({ count: 0 } as any)

    await loadHistory()

    // Losing the claim must stop before the grant, or concurrent page loads
    // double-count the attorney's platform spend.
    expect(vi.mocked((prisma as any).attorneyProfile.update)).not.toHaveBeenCalled()
  })

  it('does not blow up the page when Stripe cannot be reached', async () => {
    sessionsRetrieve.mockRejectedValue(new Error('stripe down'))

    const res = await loadHistory()

    expect(res.status).toBe(200)
    expect(res.body.payments[0].status).toBe('checkout_created')
  })
})
