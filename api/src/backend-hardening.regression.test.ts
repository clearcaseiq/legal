import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

const { checkoutCreate, applyFirmWorkflowToCase, recordCaseChange } = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  applyFirmWorkflowToCase: vi.fn().mockResolvedValue({ created: false, reason: 'no_workflow' }),
  recordCaseChange: vi.fn().mockResolvedValue({
    id: 'change-1',
    revision: 2,
    seq: 2,
    lawFirmId: 'firm-1',
  }),
}))

vi.mock('./lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('./lib/stripe')>('./lib/stripe')
  return {
    ...actual,
    getStripe: () => ({
      checkout: { sessions: { create: checkoutCreate } },
      customers: { create: vi.fn(), retrieve: vi.fn() },
    }),
  }
})

vi.mock('./lib/matching-rules-config', async () => {
  const actual = await vi.importActual<typeof import('./lib/matching-rules-config')>(
    './lib/matching-rules-config',
  )
  return {
    ...actual,
    getMatchingRules: vi.fn().mockResolvedValue({
      ...actual.DEFAULT_MATCHING_RULES,
      attorneySubscriptionTiers: [
        {
          id: 'growth',
          label: 'Growth',
          monthlyPriceCents: 99_900,
          includedCasesPerMonth: 5,
          description: 'Server configured growth tier',
          features: [],
          enabled: true,
        },
      ],
    }),
  }
})

vi.mock('./lib/case-workflow', () => ({ applyFirmWorkflowToCase }))

vi.mock('./lib/data-authority', () => ({ recordCaseChange }))

import { buildApp } from './build-app'
import { generateToken } from './lib/auth'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const app = buildApp()
const attorneyUser = { id: 'user-att', email: 'attorney@test.local', role: 'attorney', isActive: true }
const attorneyAuth = { Authorization: `Bearer ${generateToken(attorneyUser.id, { mfa: true })}` }
const firmUser = { id: 'user-admin', email: 'admin@test.local', role: 'attorney', isActive: true }
const firmAuth = { Authorization: `Bearer ${generateToken(firmUser.id, { mfa: true })}` }

beforeEach(() => {
  resetUniversalPrismaMock()
  checkoutCreate.mockReset()
  checkoutCreate.mockResolvedValue({ id: 'cs-1', url: 'https://stripe.test/checkout' })
  applyFirmWorkflowToCase.mockClear()
  recordCaseChange.mockClear()
})

describe('document case authorization', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      name: 'Attorney One',
      email: attorneyUser.email,
      lawFirmId: null,
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'assessment-1',
      assignedAttorneyId: null,
      assessment: { lawFirmId: null },
    } as any)
    vi.mocked((prisma as any).firmMember.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).caseShare.findFirst).mockResolvedValue(null)
  })

  it('does not expose an unassigned lead on a pending introduction', async () => {
    vi.mocked((prisma as any).introduction.findFirst).mockImplementation(async (args: any) =>
      args?.where?.status === 'ACCEPTED' ? null : { id: 'intro-pending', status: 'PENDING' },
    )

    const res = await request(app)
      .get('/v1/documents/leads/lead-1/envelopes')
      .set(attorneyAuth)

    expect(res.status).toBe(403)
    expect((prisma as any).documentEnvelope.findMany).not.toHaveBeenCalled()
  })

  it('allows the same lead after the introduction is accepted', async () => {
    vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue({
      id: 'intro-accepted',
      status: 'ACCEPTED',
    } as any)
    vi.mocked((prisma as any).documentEnvelope.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/v1/documents/leads/lead-1/envelopes')
      .set(attorneyAuth)

    expect(res.status).toBe(200)
    expect(res.body.envelopes).toEqual([])
  })
})

describe('shared marketplace lead authorization', () => {
  it('does not let marketplace visibility authorize prediction-review writes', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      name: 'Attorney One',
      email: attorneyUser.email,
      lawFirmId: null,
      isVerified: true,
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-shared',
      assessmentId: 'assessment-shared',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).ethicalWall.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).caseShare.findFirst).mockResolvedValue(null)

    const res = await request(app)
      .put('/v1/attorney-dashboard/leads/lead-shared/prediction-review')
      .set(attorneyAuth)
      .send({ predictionId: 'prediction-1', acceptCase: true })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Not authorized to modify this lead')
    expect((prisma as any).attorneyCaseReview.upsert).not.toHaveBeenCalled()
  })

  it('does not let marketplace visibility download the accepted-case ZIP', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      name: 'Attorney One',
      email: attorneyUser.email,
      lawFirmId: null,
      isVerified: true,
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-shared',
      assessmentId: 'assessment-shared',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).ethicalWall.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).caseShare.findFirst).mockResolvedValue(null)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-shared/case-file')
      .set(attorneyAuth)

    expect(res.status).toBe(403)
    expect(prisma.assessment.findUnique).not.toHaveBeenCalled()
  })
})

describe('firm case assignment ownership', () => {
  const firmMember = {
    id: 'member-admin',
    userId: firmUser.id,
    lawFirmId: 'firm-1',
    role: 'firm_admin',
    permissions: null,
    status: 'active',
    lawFirm: { id: 'firm-1', rolePermissions: null },
    user: firmUser,
  }

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(firmUser as any)
    vi.mocked((prisma as any).firmMember.findFirst).mockImplementation(async (args: any) => {
      if (args?.where?.userId === firmUser.id) return firmMember
      if (
        args?.where?.attorneyId === 'att-target' &&
        args?.where?.lawFirmId === 'firm-1' &&
        args?.where?.status === 'active'
      ) {
        return { id: 'member-target' }
      }
      return null
    })
    vi.mocked(prisma.attorney.findFirst).mockImplementation(async (args: any) =>
      args?.where?.id === 'att-target'
        ? { id: 'att-target', lawFirmId: 'firm-1', name: 'Target Attorney' }
        : { id: 'att-admin', lawFirmId: 'firm-1', email: firmUser.email },
    )
  })

  const assign = () =>
    request(app)
      .post('/v1/firm-dashboard/cases/assessment-1/assignments')
      .set(firmAuth)
      .send({ role: 'lead_attorney', assignedAttorneyId: 'att-target' })

  it.each(['PENDING', 'DECLINED', 'EXPIRED'])(
    'does not let a %s offer establish firm ownership',
    async (status) => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
        id: 'assessment-1',
        lawFirmId: null,
        leadSubmission: { assignedAttorneyId: null, assignedAttorney: null },
        introductions: [
          { id: 'intro-1', status, attorneyId: 'att-target', attorney: { id: 'att-target', lawFirmId: 'firm-1' } },
        ],
      } as any)

      const res = await assign()

      expect(res.status).toBe(403)
      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(recordCaseChange).not.toHaveBeenCalled()
    },
  )

  it('atomically stamps ownership, deactivates the old assignee, and upserts the accepted assignment', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'assessment-1',
      lawFirmId: null,
      leadSubmission: { assignedAttorneyId: null, assignedAttorney: null },
      introductions: [
        {
          id: 'intro-1',
          status: 'ACCEPTED',
          attorneyId: 'att-target',
          attorney: { id: 'att-target', lawFirmId: 'firm-1' },
        },
      ],
    } as any)
    vi.mocked((prisma as any).firmCaseAssignment.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).firmCaseAssignment.create).mockResolvedValue({ id: 'assignment-1' })

    const res = await assign()

    expect(res.status).toBe(201)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.assessment.update).mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'assessment-1' },
      data: { lawFirmId: 'firm-1' },
    })
    expect((prisma as any).firmCaseAssignment.updateMany).toHaveBeenCalled()
    expect((prisma as any).firmCaseAssignment.create).toHaveBeenCalled()
    expect(applyFirmWorkflowToCase.mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(prisma.$transaction).mock.invocationCallOrder[0],
    )
    expect(recordCaseChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'assessment-1',
        action: 'assigned',
        entityType: 'firm_case_assignment',
        entityId: 'assignment-1',
      }),
    )
  })
})

describe('subscription checkout pricing', () => {
  it('ignores a client priceId and derives price and entitlements from the server tier', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      email: attorneyUser.email,
      attorneyProfile: { attorneyId: 'att-1', stripeCustomerId: 'cus-1' },
    } as any)

    const res = await request(app)
      .post('/v1/payments/platform/subscription-checkout-session')
      .set(attorneyAuth)
      .send({ tierId: 'growth', priceId: 'price_attacker_controlled' })

    expect(res.status).toBe(200)
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          tierId: 'growth',
          tierLabel: 'Growth',
          includedCasesPerMonth: '5',
        }),
        line_items: [
          {
            quantity: 1,
            price_data: expect.objectContaining({
              unit_amount: 99_900,
              recurring: { interval: 'month' },
            }),
          },
        ],
      }),
    )
    expect(JSON.stringify(checkoutCreate.mock.calls[0]?.[0])).not.toContain('price_attacker_controlled')
    expect((prisma as any).platformPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripePriceId: null }) }),
    )
  })
})
