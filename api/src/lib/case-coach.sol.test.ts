import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-intelligence', () => ({
  buildCaseIntelligence: vi.fn(),
  FIRST_PARTY_COVERAGE_GAP_KEY: 'first_party_coverage',
}))
vi.mock('./demand-readiness', () => ({
  deriveTreatmentPosture: vi.fn(() => ({ posture: 'unknown', detail: 'No treatment history on file.' })),
  evaluateDemandGate: vi.fn(() => ({ ready: false, detail: '', blockers: [] })),
  hasTreatmentCompletionSignal: vi.fn().mockResolvedValue(false),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { buildCaseIntelligence } from './case-intelligence'
import { buildCaseCoach } from './case-coach'

const intelMock = vi.mocked(buildCaseIntelligence)

function intelligence(daysRemaining: number | null) {
  return {
    gaps: [],
    summary: {
      sol: {
        daysRemaining,
        expiresAt: daysRemaining == null ? null : new Date(Date.now() + daysRemaining * 24 * 3600 * 1000),
      },
      economic: { medicalBills: 0, wageLoss: 0 },
      readiness: { score: 20 },
      documentation: { score: 20 },
    },
  }
}

describe('case coach SOL insights', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    intelMock.mockReset()
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'assess-1', facts: '{}' } as any)
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as any)
  })

  it('reports a lapsed deadline as expired rather than counting down past zero', async () => {
    intelMock.mockResolvedValue(intelligence(-412) as any)

    const result = await buildCaseCoach('assess-1')
    const sol = result?.insights.find((i) => i.key === 'sol_expired')

    expect(sol).toBeDefined()
    expect(sol?.priority).toBe('critical')
    expect(sol?.why).toContain('ran 412 days ago')
    expect(sol?.why).not.toContain('-412')
    expect(result?.insights.some((i) => i.key === 'sol_urgency')).toBe(false)
  })

  it('still counts down a deadline that has not passed', async () => {
    intelMock.mockResolvedValue(intelligence(45) as any)

    const result = await buildCaseCoach('assess-1')
    const sol = result?.insights.find((i) => i.key === 'sol_urgency')

    expect(sol).toBeDefined()
    expect(sol?.why).toContain('leaves 45 days')
    expect(result?.insights.some((i) => i.key === 'sol_expired')).toBe(false)
  })

  it('raises no deadline insight when the filing date is comfortably out', async () => {
    intelMock.mockResolvedValue(intelligence(600) as any)

    const result = await buildCaseCoach('assess-1')

    expect(result?.insights.some((i) => i.key === 'sol_urgency' || i.key === 'sol_expired')).toBe(false)
  })
})
