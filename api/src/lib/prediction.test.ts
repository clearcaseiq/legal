import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Assessment } from '@prisma/client'
import {
  calculateInjurySeverity,
  calculateLiabilityScore,
  computeFeatures,
  predictViability,
  simulateScenario,
} from './prediction'

function mockAssessment(overrides: Partial<Assessment> & { factsObj?: Record<string, unknown> }): Assessment {
  const { factsObj, ...rest } = overrides
  const base = {
    id: 'test-id',
    userId: null,
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: null,
    status: 'DRAFT',
    facts: JSON.stringify(factsObj ?? {}),
    chatgptAnalysis: null,
    chatgptAnalysisDate: null,
    similarCases: null,
    similarCasesUpdatedAt: null,
    caseTierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const a = { ...base, ...rest } as Assessment
  if (factsObj !== undefined) {
    ;(a as unknown as { facts: unknown }).facts = factsObj as unknown
  }
  return a
}

describe('calculateInjurySeverity', () => {
  it('returns none when no injuries and no medical spend', () => {
    const r = calculateInjurySeverity({ injuries: [], damages: {} })
    expect(r.level).toBe(0)
    expect(r.label).toBe('none')
  })

  it('returns catastrophic for wrongful_death claimType', () => {
    const r = calculateInjurySeverity({ claimType: 'wrongful_death', injuries: [{}] })
    expect(r.level).toBe(4)
    expect(r.label).toBe('catastrophic')
  })

  it('returns catastrophic when narrative contains death keyword', () => {
    const r = calculateInjurySeverity({
      injuries: [{ description: 'x' }],
      incident: { narrative: 'wrongful death of passenger' },
    })
    expect(r.level).toBe(4)
  })

  it('upgrades level for high med charges', () => {
    const r = calculateInjurySeverity({
      injuries: [{ description: 'back' }],
      damages: { med_charges: 60000 },
    })
    expect(r.level).toBeGreaterThanOrEqual(2)
  })

  it('uses mild keywords in narrative', () => {
    const r = calculateInjurySeverity({
      injuries: [{ description: 'soft tissue' }],
      incident: { narrative: 'Minor bruise to shoulder' },
    })
    expect(r.level).toBeGreaterThanOrEqual(1)
  })
})

describe('calculateLiabilityScore', () => {
  it('returns factors and bounded score for minimal facts', () => {
    const r = calculateLiabilityScore({}, 'TX')
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.factors.length).toBeGreaterThan(0)
    expect(r.strength).toBeDefined()
  })

  it('boosts score for auto rear-end narrative', () => {
    const r = calculateLiabilityScore(
      {
        claimType: 'auto',
        incident: { narrative: 'I was stopped at a light and was rear-ended by another driver.' },
      },
      'CA'
    )
    expect(r.score).toBeGreaterThan(0.5)
    expect(r.factors.some((f) => f.includes('Rear-end'))).toBe(true)
  })

  it('handles slip_and_fall wet floor narrative', () => {
    const r = calculateLiabilityScore(
      {
        claimType: 'slip_and_fall',
        incident: { narrative: 'Slipped on wet floor with no warning sign at store.' },
      },
      'NY'
    )
    expect(r.factors.some((f) => f.toLowerCase().includes('wet') || f.includes('maintenance'))).toBe(true)
  })
})

describe('computeFeatures', () => {
  it('aggregates severity, liability, and damage fields', () => {
    const a = mockAssessment({
      claimType: 'auto',
      venueState: 'CA',
      factsObj: {
        claimType: 'auto',
        incident: { narrative: 'Rear-end collision downtown.' },
        injuries: [{ description: 'whiplash' }],
        damages: { med_paid: 5000, med_charges: 8000 },
        treatment: [{ type: 'chiro' }],
      },
    })
    const f = computeFeatures(a)
    expect(f.venue).toBe('CA')
    expect(f.claimType).toBe('auto')
    expect(f.medPaid).toBe(5000)
    expect(f.hasTreatment).toBe(true)
    expect(f.severityScore.level).toBeGreaterThanOrEqual(0)
    expect(f.liabilityScore.score).toBeGreaterThan(0.5)
  })
})

describe('predictViability', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns structured viability and value_bands', async () => {
    const features = {
      venue: 'CA',
      claimType: 'auto',
      severity: 2 as const,
      severityScore: calculateInjurySeverity({
        injuries: [{}],
        damages: { med_paid: 20000 },
      }),
      liabilityScore: calculateLiabilityScore(
        { claimType: 'auto', incident: { narrative: 'rear-ended' } },
        'CA'
      ),
      medPaid: 20000,
      medCharges: 25000,
      wageLoss: 0,
      hasTreatment: true,
      narrativeLength: 5,
    }
    const r = await predictViability(features)
    expect(r.viability.overall).toBeGreaterThanOrEqual(0.05)
    expect(r.viability.overall).toBeLessThanOrEqual(0.95)
    expect(r.value_bands.median).toBeGreaterThan(0)
    expect(Array.isArray(r.explainability)).toBe(true)
    expect(r.caveats.length).toBeGreaterThan(0)
  })
})

describe('simulateScenario', () => {
  it('returns empty deltas when no toggles', () => {
    expect(simulateScenario({}, {})).toEqual({ deltas: {} })
  })

  it('returns medical delta when increased_medical', () => {
    const r = simulateScenario({}, { increased_medical: true })
    expect(r.deltas.overall).toBe(0.07)
    expect(r.deltas.damages).toBe(0.12)
  })

  it('returns evidence delta when additional_evidence', () => {
    const r = simulateScenario({}, { additional_evidence: true })
    expect(r.deltas.overall).toBe(0.05)
    expect(r.deltas.liability).toBe(0.08)
  })

  it('returns expert witness delta when expert_witness', () => {
    const r = simulateScenario({}, { expert_witness: true })
    expect(r.deltas.overall).toBe(0.06)
    expect(r.deltas.causation).toBe(0.1)
  })

  it('applies last matching toggle for overall delta (current implementation)', () => {
    const r = simulateScenario({}, { increased_medical: true, expert_witness: true })
    expect(r.deltas.overall).toBe(0.06)
    expect(r.deltas.damages).toBe(0.12)
    expect(r.deltas.causation).toBe(0.1)
  })
})
