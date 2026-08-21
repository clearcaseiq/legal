/**
 * The attorney client sends the browser to Stripe BEFORE it calls the decision
 * endpoint, so the routing-fee checkout is the last chance to stop a charge that
 * can never turn into a case. The reported failure: decline a case in one tab,
 * accept it in a second stale tab, get sent to Stripe, pay — and only then does
 * the decision endpoint answer 409, leaving the attorney billed for a case they
 * never receive.
 *
 * Every refusal here therefore also asserts the request never reached the payment
 * stage — no Stripe session and no PlatformPayment row. A 409 that still billed
 * the attorney would not have fixed anything. STRIPE_SECRET_KEY is unset under
 * test, so the route's "stripe not configured" branch records the PlatformPayment
 * instead of calling Stripe; that row is what marks the payment stage here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

const checkoutCreate = vi.fn()
vi.mock('./lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('./lib/stripe')>('./lib/stripe')
  return {
    ...actual,
    getStripe: () => ({
      checkout: { sessions: { create: checkoutCreate } },
      customers: { create: vi.fn().mockResolvedValue({ id: 'cus_1' }), retrieve: vi.fn() },
    }),
  }
})

vi.mock('./lib/matching-rules-config', async () => {
  const actual = await vi.importActual<typeof import('./lib/matching-rules-config')>(
    './lib/matching-rules-config',
  )
  return {
    ...actual,
    getMatchingRules: vi.fn().mockResolvedValue({ routingFeePaymentsEnabled: true }),
    getCaseRoutingFee: () => ({ label: 'Routing fee', priceCents: 50_000 }),
    getAttorneyResponseDeadlineMinutes: () => 60,
  }
})

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  role: 'attorney',
  isActive: true,
}
const auth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const ATTORNEY = { id: 'att-1', email: 'attorney@test.local', attorneyProfile: { attorneyId: 'att-1' } }

const LEAD = {
  id: 'lead-1',
  assessmentId: 'assess-1',
  assignmentType: 'exclusive',
  assignedAttorneyId: 'att-1',
  routingLocked: false,
  assessment: { id: 'assess-1' },
}

/** An offer still inside its response window. */
const freshlyRequested = () => new Date(Date.now() - 5 * 60 * 1000)

function givenIntroduction(intro: Record<string, unknown> | null) {
  vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue(intro as any)
}

async function startCheckout() {
  return request(app).post('/v1/payments/platform/routing-fee-session').set(auth).send({ leadId: 'lead-1' })
}

/** True once the route got past the guards and started charging for the case. */
function reachedPaymentStage() {
  return (
    checkoutCreate.mock.calls.length > 0 ||
    vi.mocked((prisma as any).platformPayment.create).mock.calls.length > 0
  )
}

describe('routing-fee checkout guard', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    checkoutCreate.mockReset()
    checkoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/checkout' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue(ATTORNEY as any)
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue(LEAD as any)
    givenIntroduction({ id: 'intro-1', status: 'PENDING', requestedAt: freshlyRequested() })
  })

  it('refuses to charge for a case this attorney already declined', async () => {
    givenIntroduction({ id: 'intro-1', status: 'DECLINED', requestedAt: freshlyRequested() })

    const res = await startCheckout()

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already declined this case.')
    expect(res.body.code).toBe('ALREADY_RESPONDED')
    expect(reachedPaymentStage()).toBe(false)
  })

  it('refuses a second charge for a case already accepted', async () => {
    givenIntroduction({ id: 'intro-1', status: 'ACCEPTED', requestedAt: freshlyRequested() })

    const res = await startCheckout()

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already accepted this case.')
    expect(reachedPaymentStage()).toBe(false)
  })

  it('refuses once the offer has been released to someone else', async () => {
    givenIntroduction({ id: 'intro-1', status: 'EXPIRED', requestedAt: freshlyRequested() })

    const res = await startCheckout()

    expect(res.status).toBe(409)
    expect(reachedPaymentStage()).toBe(false)
  })

  it('refuses when the response window has lapsed even if the offer still reads pending', async () => {
    // The expiry sweep has not run yet, but the decision endpoint would reject
    // this accept, so taking payment for it would strand the attorney.
    givenIntroduction({
      id: 'intro-1',
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 120 * 60 * 1000),
    })

    const res = await startCheckout()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/response window/i)
    expect(reachedPaymentStage()).toBe(false)
  })

  it('refuses when another attorney already claimed the case', async () => {
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue({
      ...LEAD,
      routingLocked: true,
      assignedAttorneyId: 'att-other',
    } as any)

    const res = await startCheckout()

    expect(res.status).toBe(409)
    expect(reachedPaymentStage()).toBe(false)
  })

  it('still opens checkout for a live pending offer', async () => {
    const res = await startCheckout()

    expect(res.status).toBe(200)
    expect(reachedPaymentStage()).toBe(true)
  })

  it('still opens checkout for a shared lead with no introduction row', async () => {
    // Shared/pool leads reach the attorney without an Introduction; the decision
    // endpoint backfills one on accept, so payment must not be blocked here.
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue({
      ...LEAD,
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    givenIntroduction(null)

    const res = await startCheckout()

    expect(res.status).toBe(200)
    expect(reachedPaymentStage()).toBe(true)
  })
})
