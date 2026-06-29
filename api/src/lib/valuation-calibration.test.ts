import { describe, it, expect, afterEach } from 'vitest'
import { backtest, calibrate, type OutcomeSample } from './valuation-calibration'
import {
  getValuationCalibration,
  setValuationCalibration,
  resetValuationCalibration,
  isIdentity,
  IDENTITY_CALIBRATION,
} from './valuation-config'
import { calculateInjurySeverity, calculateLiabilityScore, computeFeatures, predictViabilityHeuristic } from './prediction'

function sampleFeatures(overrides: Record<string, unknown> = {}) {
  // Build a realistic feature vector via computeFeatures, then allow overrides.
  const base = computeFeatures({
    id: 'x', userId: null, claimType: 'auto', venueState: 'CA', venueCounty: null,
    status: 'DRAFT', chatgptAnalysis: null, chatgptAnalysisDate: null, similarCases: null,
    similarCasesUpdatedAt: null, caseTierId: null, createdAt: new Date(), updatedAt: new Date(),
    facts: JSON.stringify({
      claimType: 'auto',
      incident: { narrative: 'I was stopped and rear-ended by a distracted driver.' },
      injuries: [{ description: 'neck and back' }],
      treatment: [{ type: 'pt' }, { type: 'pt' }],
      damages: { med_charges: 18000, wage_loss: 5000 },
    }),
  } as any)
  return { ...base, ...overrides }
}

function highValueFeatures() {
  return computeFeatures({
    id: 'hv', userId: null, claimType: 'auto', venueState: 'CA', venueCounty: null,
    status: 'DRAFT', chatgptAnalysis: null, chatgptAnalysisDate: null, similarCases: null,
    similarCasesUpdatedAt: null, caseTierId: null, createdAt: new Date(), updatedAt: new Date(),
    facts: JSON.stringify({
      claimType: 'auto',
      incident: { narrative: 'Stopped at a red light and rear-ended by a distracted driver; surgery required.' },
      injuries: [{ bodyParts: ['neck', 'lower_back'], lifestyleImpact: ['unable_to_work_normally', 'sleep_disruption'] }],
      treatment: [{ type: 'pt' }, { type: 'pt' }, { type: 'surgery_status', status: 'completed' }],
      damages: { med_charges: 120000, wage_loss: 40000 },
    }),
  } as any)
}

describe('valuation-config defaults', () => {
  afterEach(() => resetValuationCalibration())

  it('defaults to identity calibration', () => {
    resetValuationCalibration()
    expect(isIdentity(getValuationCalibration())).toBe(true)
  })

  it('can be overridden in-process and reset', () => {
    setValuationCalibration({ ...IDENTITY_CALIBRATION, version: 'test', settlementScale: 1.25 })
    expect(getValuationCalibration().settlementScale).toBe(1.25)
    expect(isIdentity(getValuationCalibration())).toBe(false)
    resetValuationCalibration()
    expect(isIdentity(getValuationCalibration())).toBe(true)
  })
})

describe('calibration is behavior-preserving at identity', () => {
  it('identity calibration reproduces the default prediction exactly', () => {
    const f = sampleFeatures()
    const a = predictViabilityHeuristic(f) // uses global (identity) config
    const b = predictViabilityHeuristic(f, IDENTITY_CALIBRATION)
    expect(b.value_bands.settlement.median).toBe(a.value_bands.settlement.median)
    expect(b.value_bands.settlement.p25).toBe(a.value_bands.settlement.p25)
    expect(b.value_bands.settlement.p75).toBe(a.value_bands.settlement.p75)
  })

  it('settlementScale > 1 raises the settlement median', () => {
    // High-value case so the median (not the floor) drives the band and is sensitive to scaling.
    const f = highValueFeatures()
    const baseMedian = predictViabilityHeuristic(f, IDENTITY_CALIBRATION).value_bands.settlement.median
    const scaled = predictViabilityHeuristic(f, { ...IDENTITY_CALIBRATION, version: 't', settlementScale: 1.3 })
    expect(scaled.value_bands.settlement.median).toBeGreaterThan(baseMedian)
    expect(isIdentity({ ...IDENTITY_CALIBRATION, settlementScale: 1.3 })).toBe(false)
  })
})

function makeSamples(): OutcomeSample[] {
  // Synthetic outcomes whose actuals sit consistently ABOVE the model's median, so the
  // calibrator should recommend settlementScale > 1.
  const out: OutcomeSample[] = []
  for (let i = 0; i < 12; i++) {
    const f = sampleFeatures()
    const predicted = predictViabilityHeuristic(f, IDENTITY_CALIBRATION).value_bands.settlement.median
    out.push({ features: f, actualAmount: predicted * 1.4, outcomeType: 'settlement' })
  }
  return out
}

describe('backtest', () => {
  it('computes error, bias and coverage over labeled outcomes', () => {
    const samples = makeSamples()
    const m = backtest(samples)
    expect(m.n).toBe(12)
    expect(m.medianAbsPctError).toBeGreaterThan(0)
    // Model under-predicts vs the inflated actuals → negative bias.
    expect(m.bias).toBeLessThan(0)
    expect(m.bandCoverage).toBeGreaterThanOrEqual(0)
    expect(m.bandCoverage).toBeLessThanOrEqual(1)
  })

  it('ignores non-monetary outcomes', () => {
    const samples: OutcomeSample[] = [
      { features: sampleFeatures(), actualAmount: 0, outcomeType: 'dismissed' },
    ]
    expect(backtest(samples).n).toBe(0)
  })
})

describe('calibrate', () => {
  it('recommends a higher settlement scale when actuals exceed predictions', () => {
    const samples = makeSamples()
    const result = calibrate(samples)
    expect(result.evaluated).toBeGreaterThan(0)
    expect(result.recommended.settlementScale).toBeGreaterThan(1)
    // Calibration should not make the error worse than baseline.
    expect(result.after.medianAbsPctError).toBeLessThanOrEqual(result.before.medianAbsPctError)
  })
})
