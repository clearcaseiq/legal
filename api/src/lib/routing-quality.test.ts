import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import {
  checkQualityGate,
  filterEligibleAttorneys,
  filterQualifiedAttorneys,
  routeCaseToAttorneys,
  scoreAndRankAttorneys,
  type AttorneyForRouting,
  type CaseForRouting,
} from './routing'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'

function att(
  id: string,
  opts: Partial<AttorneyForRouting> & { state?: string; counties?: string[] } = {}
): AttorneyForRouting {
  const state = opts.state ?? 'CA'
  const counties = opts.counties ?? ([] as string[])
  const { state: _s, counties: _c, ...rest } = opts
  return {
    id,
    isActive: true,
    isVerified: true,
    specialties: JSON.stringify(['auto']),
    responseTimeHours: 24,
    averageRating: 4.6,
    totalReviews: 8,
    attorneyProfile: {
      jurisdictions: JSON.stringify([{ state, counties }]),
      excludedCaseTypes: null,
      minInjurySeverity: 0,
      minDamagesRange: null,
      maxDamagesRange: null,
      maxCasesPerWeek: null,
      maxCasesPerMonth: null,
    },
    ...rest,
  }
}

const caAuto: CaseForRouting = {
  id: 'asm-q',
  claimType: 'auto',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
}

function gateDefaults() {
  vi.mocked(prisma.introduction.count).mockResolvedValue(0)
  vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
  vi.mocked(prisma.introduction.groupBy).mockResolvedValue([] as any)
  vi.mocked(prisma.attorneyReview.count).mockResolvedValue(0)
  vi.mocked(prisma.attorneyDashboard.findMany).mockResolvedValue([] as any)
  vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue(null)
}

describe('checkQualityGate', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    gateDefaults()
  })

  it('qualifies responsive attorney with default metrics', async () => {
    const r = await checkQualityGate(att('a1'), caAuto)
    expect(r.qualified).toBe(true)
  })

  it('disqualifies slow response for regular case', async () => {
    const r = await checkQualityGate(att('a2', { responseTimeHours: 72 }), caAuto, {
      maxResponseTimeHours: 48,
    })
    expect(r.qualified).toBe(false)
    expect(r.reason).toMatch(/Response time/i)
  })

  it('uses tighter SLA for hot cases', async () => {
    const hotCase: CaseForRouting = {
      ...caAuto,
      prediction: { viability: { overall: 0.9 }, bands: { median: 100000 } },
    }
    const r = await checkQualityGate(att('a3', { responseTimeHours: 30 }), hotCase)
    expect(r.qualified).toBe(false)
    expect(r.reason).toMatch(/24h|hot/i)
  })

  it('disqualifies low contact rate', async () => {
    vi.mocked(prisma.introduction.count)
      .mockReset()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)

    const r = await checkQualityGate(att('a4'), caAuto, { minContactRate: 0.8 })
    expect(r.qualified).toBe(false)
    expect(r.reason).toMatch(/Contact rate/i)
  })

  it('disqualifies high complaint rate', async () => {
    vi.mocked(prisma.introduction.count)
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0)
    vi.mocked(prisma.attorneyReview.count).mockResolvedValue(3)

    const r = await checkQualityGate(att('a5'), caAuto, { maxComplaintRate: 0.1 })
    expect(r.qualified).toBe(false)
    expect(r.reason).toMatch(/Complaint rate/i)
  })
})

describe('filterEligibleAttorneys', () => {
  it('splits eligible vs ineligible', async () => {
    const { eligible, ineligible } = await filterEligibleAttorneys(
      [att('ok', { state: 'CA' }), att('bad', { state: 'NY' })],
      caAuto
    )
    expect(eligible.map((a) => a.id)).toEqual(['ok'])
    expect(ineligible).toHaveLength(1)
    expect(ineligible[0].attorney.id).toBe('bad')
  })
})

describe('filterQualifiedAttorneys', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.attorneyReview.count).mockResolvedValue(0)
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue(null)
  })

  it('filters using quality gate', async () => {
    const { qualified, disqualified } = await filterQualifiedAttorneys(
      [att('good'), att('slow', { responseTimeHours: 100 })],
      caAuto,
      { maxResponseTimeHours: 48 }
    )
    expect(qualified.map((a) => a.id)).toEqual(['good'])
    expect(disqualified).toHaveLength(1)
  })
})

describe('routeCaseToAttorneys pipeline', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.attorneyReview.count).mockResolvedValue(0)
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue(null)
  })

  it('produces scored list for one eligible qualified attorney', async () => {
    const out = await routeCaseToAttorneys([att('solo')], caAuto)
    expect(out.stats.eligible).toBe(1)
    expect(out.stats.qualified).toBe(1)
    expect(out.scored).toHaveLength(1)
    expect(out.scored[0].attorney.id).toBe('solo')
    expect(out.scored[0].score.overall).toBeGreaterThanOrEqual(0)
  })
})

describe('scoreAndRankAttorneys', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    gateDefaults()
  })

  it('batches intro conversion and dashboard revenue data', async () => {
    vi.mocked(prisma.introduction.groupBy).mockResolvedValue([
      { attorneyId: 'a1', status: 'ACCEPTED', _count: { _all: 2 } },
      { attorneyId: 'a1', status: 'REJECTED', _count: { _all: 2 } },
      { attorneyId: 'a2', status: 'RETAINED', _count: { _all: 1 } },
    ] as any)
    vi.mocked(prisma.attorneyDashboard.findMany).mockResolvedValue([
      { attorneyId: 'a1', totalPlatformSpend: 5000 },
      { attorneyId: 'a2', totalPlatformSpend: 500 },
    ] as any)

    const scored = await scoreAndRankAttorneys([att('a1'), att('a2')], caAuto)

    expect(prisma.introduction.groupBy).toHaveBeenCalledTimes(1)
    expect(prisma.attorneyDashboard.findMany).toHaveBeenCalledTimes(1)
    expect(scored).toHaveLength(2)
    expect(scored.find((entry) => entry.attorney.id === 'a1')?.attorney.conversionRate).toBe(50)
    expect(scored.find((entry) => entry.attorney.id === 'a1')?.attorney.platformRevenue).toBe(5000)
    expect(scored.find((entry) => entry.attorney.id === 'a2')?.attorney.conversionRate).toBe(100)
    expect(scored.find((entry) => entry.attorney.id === 'a2')?.attorney.platformRevenue).toBe(500)
  })
})
