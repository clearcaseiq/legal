import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('./prisma', () => import('../test/universalPrismaMock'))
import {
  checkAttorneyEligibility,
  calculateMatchScore,
  type AttorneyForRouting,
  type CaseForRouting,
} from './routing'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'

function profile(
  jurisdictions: Array<{ state: string; counties?: string[] }>,
  excluded: string[] | null = null
): AttorneyForRouting['attorneyProfile'] {
  return {
    jurisdictions: JSON.stringify(jurisdictions),
    excludedCaseTypes: excluded ? JSON.stringify(excluded) : null,
    minInjurySeverity: 0,
    minDamagesRange: null,
    maxDamagesRange: null,
    maxCasesPerWeek: null,
    maxCasesPerMonth: null,
  }
}

function attorney(overrides: Partial<AttorneyForRouting> = {}): AttorneyForRouting {
  return {
    id: 'att-1',
    isActive: true,
    isVerified: true,
    specialties: JSON.stringify(['auto']),
    responseTimeHours: 24,
    averageRating: 4.5,
    totalReviews: 20,
    subscriptionTier: 'premium',
    pricingModel: 'fixed_price',
    paymentModel: 'subscription',
    attorneyProfile: profile([{ state: 'CA', counties: [] }]),
    ...overrides,
  }
}

const caAutoCase: CaseForRouting = {
  id: 'asm-1',
  claimType: 'auto',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
}

describe('checkAttorneyEligibility', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.ethicalWall.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)
  })

  it('accepts active verified attorney serving state and specialty', async () => {
    const r = await checkAttorneyEligibility(attorney(), caAutoCase)
    expect(r.eligible).toBe(true)
  })

  it('rejects inactive attorney', async () => {
    const r = await checkAttorneyEligibility(attorney({ isActive: false }), caAutoCase)
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/active/i)
  })

  it('rejects unverified attorney', async () => {
    const r = await checkAttorneyEligibility(attorney({ isVerified: false }), caAutoCase)
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/verified/i)
  })

  it('rejects when no jurisdictions configured', async () => {
    const r = await checkAttorneyEligibility(attorney({ attorneyProfile: null }), caAutoCase)
    expect(r.eligible).toBe(false)
  })

  it('rejects wrong state', async () => {
    const r = await checkAttorneyEligibility(attorney({ attorneyProfile: profile([{ state: 'NY' }]) }), caAutoCase)
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/state/i)
  })

  it('rejects when county required but not served', async () => {
    const r = await checkAttorneyEligibility(
      attorney({ attorneyProfile: profile([{ state: 'CA', counties: ['Orange'] }]) }),
      caAutoCase
    )
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/county/i)
  })

  it('accepts county when listed', async () => {
    const r = await checkAttorneyEligibility(
      attorney({ attorneyProfile: profile([{ state: 'CA', counties: ['Los Angeles'] }]) }),
      caAutoCase
    )
    expect(r.eligible).toBe(true)
  })

  it('rejects missing specialties', async () => {
    const r = await checkAttorneyEligibility(attorney({ specialties: null }), caAutoCase)
    expect(r.eligible).toBe(false)
  })

  it('rejects wrong case type specialty', async () => {
    const r = await checkAttorneyEligibility(
      attorney({ specialties: JSON.stringify(['medmal']) }),
      caAutoCase
    )
    expect(r.eligible).toBe(false)
  })

  it('rejects excluded case type', async () => {
    const r = await checkAttorneyEligibility(
      attorney({ attorneyProfile: profile([{ state: 'CA' }], ['auto']) }),
      caAutoCase
    )
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/excluded/i)
  })

  it('rejects malformed jurisdictions JSON', async () => {
    const r = await checkAttorneyEligibility(
      attorney({
        attorneyProfile: {
          jurisdictions: '{not-json',
          excludedCaseTypes: null,
          minInjurySeverity: null,
          minDamagesRange: null,
          maxDamagesRange: null,
          maxCasesPerWeek: null,
          maxCasesPerMonth: null,
        },
      }),
      caAutoCase
    )
    expect(r.eligible).toBe(false)
  })
})

describe('calculateMatchScore', () => {
  it('returns bounded overall score', () => {
    const s = calculateMatchScore(attorney(), caAutoCase)
    expect(s.overall).toBeGreaterThanOrEqual(0)
    expect(s.overall).toBeLessThanOrEqual(1)
    expect(s.fitScore).toBeDefined()
    expect(s.breakdown.fit).toBeDefined()
  })
})
