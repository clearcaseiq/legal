import { describe, expect, it } from 'vitest'
import {
  calculateAttorneyConsensus,
  calculateLiability,
  calculateSeverity,
  underwriteCase,
} from './underwriting-engine'

describe('calculateLiability', () => {
  it('scores classic California rear-end facts as strong liability', () => {
    const result = calculateLiability({
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: {
        claimType: 'auto',
        liability: { crashType: 'rear_end', comparativeNegligence: 0 },
        incident: { narrative: 'I was stopped and hit from behind. Police report was taken.' },
      },
      evidenceFiles: [{ category: 'police_report' }],
    })

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.grade).toBe('Strong')
    expect(result.positives).toEqual(expect.arrayContaining(['Rear-end facts', 'Police or incident report']))
  })

  it('reduces score for comparative fault', () => {
    const result = calculateLiability({
      claimType: 'auto',
      facts: {
        liability: { crashType: 'rear_end', comparativeNegligence: 0.35 },
        incident: { narrative: 'Rear-end crash but I may have stopped suddenly.' },
      },
    })

    expect(result.score).toBeLessThan(80)
    expect(result.negatives.some((item) => item.includes('comparative fault'))).toBe(true)
  })
})

describe('calculateSeverity', () => {
  it('uses herniation plus injections and surgery recommendation', () => {
    const result = calculateSeverity({
      claimType: 'auto',
      facts: {
        incident: { narrative: 'MRI showed disc herniation. Surgery recommended.' },
        injuries: [{ diagnoses: ['herniation'] }],
        treatment: [
          { type: 'imaging', imaging: 'mri' },
          { type: 'procedure', procedure: 'epidural_injections' },
          { type: 'surgery_status', status: 'recommended' },
        ],
      },
    })

    expect(result.primaryInjury).toBe('DISC_HERNIATION')
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.tier).toBe('Moderate-Severe')
  })
})

describe('underwriteCase', () => {
  it('produces settlement band and high attorney acceptance for strong herniation case', () => {
    const result = underwriteCase({
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: {
        claimType: 'auto',
        caseSubtype: 'rideshare_accident',
        liability: { crashType: 'rear_end', defendantType: 'uber_lyft' },
        incident: { date: '2026-01-01', narrative: 'Stopped at a red light and rear-ended by an Uber driver. MRI shows herniation. Epidural injection done.' },
        injuries: [{ diagnoses: ['herniation'], lifestyleImpact: ['daily_pain'] }],
        treatment: [
          { type: 'imaging', imaging: 'mri' },
          { type: 'procedure', procedure: 'epidural_injections' },
        ],
        damages: { med_charges: 30000, wage_loss: 10000 },
        insurance: { defendant_coverage_limits: 'commercial_policy' },
      },
      evidenceFiles: [
        { category: 'medical_records' },
        { category: 'bills' },
        { category: 'police_report' },
        { category: 'photos' },
      ],
    })

    expect(result.settlement.low).toBeGreaterThan(0)
    expect(result.settlement.expected).toBeGreaterThan(result.settlement.low)
    expect(result.settlement.high).toBeGreaterThan(result.settlement.expected)
    expect(result.attorneyAcceptance.probability).toBeGreaterThanOrEqual(70)
    expect(result.normalizedCase.accidentSubtype).toBe('rideshare_accident')
  })
})

describe('calculateSettlement general damages', () => {
  it('values a treated soft-tissue case well above 1x the medical specials (so the plaintiff nets a real recovery)', () => {
    const medCharges = 25000
    const result = underwriteCase({
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: {
        claimType: 'auto',
        liability: { crashType: 'rear_end', comparativeNegligence: 0 },
        incident: { date: '2026-01-01', narrative: 'Stopped at a light and rear-ended. Neck and back pain with ongoing physical therapy.' },
        injuries: [{ diagnoses: ['neck strain', 'back sprain'], lifestyleImpact: ['daily_pain'] }],
        treatment: [
          { type: 'physical_therapy' },
          { type: 'physical_therapy' },
          { type: 'chiropractic' },
        ],
        damages: { med_charges: medCharges },
      },
      evidenceFiles: [{ category: 'medical_records' }, { category: 'bills' }],
    })

    expect(result.severity.primaryInjury).toBe('SOFT_TISSUE')
    // Non-economic damages should lift the settlement clearly above the bills, not ~1x them.
    expect(result.settlement.expected).toBeGreaterThan(medCharges)
    expect(result.settlement.expected).toBeGreaterThanOrEqual(medCharges * 1.5)
  })
})

describe('calculateAttorneyConsensus', () => {
  it('returns median values when three attorneys review', () => {
    const consensus = calculateAttorneyConsensus([
      { settlementLow: 100000, settlementExpected: 150000, settlementHigh: 200000, trialLow: 200000, trialHigh: 400000 },
      { settlementLow: 120000, settlementExpected: 170000, settlementHigh: 220000, trialLow: 240000, trialHigh: 440000 },
      { settlementLow: 90000, settlementExpected: 140000, settlementHigh: 180000, trialLow: 180000, trialHigh: 360000 },
    ])

    expect(consensus).toMatchObject({
      settlementLow: 100000,
      settlementExpected: 150000,
      settlementHigh: 200000,
      trialLow: 200000,
      trialHigh: 400000,
      reviewCount: 3,
      confidence: 'high',
    })
  })
})
