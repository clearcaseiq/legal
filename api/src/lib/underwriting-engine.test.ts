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

  it('uses the Liability-tab record strength when present', () => {
    const result = calculateLiability({
      claimType: 'auto',
      facts: {
        liability: { crashType: 'rear_end' },
        incident: { narrative: 'Rear-end with police report and clear liability.' },
        liabilityRecord: {
          id: 'lr-1',
          strength: 22,
          strengthBasis: ['Fault disputed', 'No police report'],
        },
      },
      evidenceFiles: [{ category: 'police_report' }],
    })

    expect(result.score).toBe(22)
    expect(result.grade).toBe('Weak')
    expect(result.positives).toEqual(expect.arrayContaining(['Fault disputed']))
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

describe('calculateSettlement policy limits', () => {
  const seriousCase = (insurance: Record<string, any>) => ({
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'Los Angeles',
    facts: {
      claimType: 'auto',
      liability: { crashType: 'rear_end', comparativeNegligence: 0 },
      incident: { date: '2026-01-01', narrative: 'Rear-ended at a red light. MRI shows a herniation and an epidural injection was performed.' },
      injuries: [{ diagnoses: ['herniation'], lifestyleImpact: ['daily_pain'] }],
      treatment: [{ type: 'physical_therapy' }, { type: 'injection' }, { type: 'orthopedist' }],
      damages: { med_charges: 60000 },
      insurance,
    },
    evidenceFiles: [{ category: 'medical_records' }, { category: 'bills' }],
  })

  it('caps the estimate at coverage the claim cannot recover past', () => {
    // Without this the claimant is shown a six-figure estimate on a claim that
    // can pay at most $25k, and the number reads as a promise.
    const uncapped = underwriteCase(seriousCase({}))
    const capped = underwriteCase(seriousCase({ policy_limit: 25000 }))

    expect(uncapped.settlement.expected).toBeGreaterThan(25000)
    expect(capped.settlement.high).toBe(25000)
    expect(capped.settlement.expected).toBeLessThanOrEqual(25000)
    expect(capped.settlement.policyLimitConstrained).toBe(true)
    // The underlying valuation is preserved, so the demand and the negotiation
    // posture still know what the case is actually worth.
    expect(capped.settlement.uncappedExpected).toBe(uncapped.settlement.expected)
  })

  it('leaves the estimate alone when no limit is known', () => {
    const result = underwriteCase(seriousCase({}))
    expect(result.settlement.policyLimitConstrained).toBe(false)
    expect(result.settlement.expected).toBe(result.settlement.uncappedExpected)
  })

  it('does not cap a claimant who carries UM/UIM of an unknown amount', () => {
    const result = underwriteCase(seriousCase({ policy_limit: 25000, has_um_uim_coverage: true }))
    expect(result.settlement.policyLimitConstrained).toBe(false)
    expect(result.settlement.expected).toBeGreaterThan(25000)
  })

  it('caps at the combined limit once UM/UIM is confirmed', () => {
    const result = underwriteCase({
      ...seriousCase({ policy_limit: 25000, has_um_uim_coverage: true }),
      insuranceDetails: [
        { insuredParty: 'defendant', policyLimit: 25000 },
        { insuredParty: 'client', coverageType: 'uim', policyLimit: 50000, coverageConfirmed: true },
      ],
    })
    expect(result.settlement.high).toBe(75000)
    expect(result.settlement.policyLimitConstrained).toBe(true)
  })
})

describe('clinical codes reach the settlement figure', () => {
  const softTissueCase = (facts: Record<string, any> = {}) => ({
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'Los Angeles',
    facts: {
      claimType: 'auto',
      liability: { crashType: 'rear_end', comparativeNegligence: 0 },
      incident: { date: '2026-01-01', narrative: 'Rear-ended at a light. Neck and back pain.' },
      injuries: [{ diagnoses: ['neck strain'] }],
      treatment: [{ type: 'physical_therapy' }, { type: 'physical_therapy' }],
      damages: { med_charges: 30000 },
      ...facts,
    },
    evidenceFiles: [{ category: 'medical_records' }, { category: 'bills' }],
  })

  it('upgrades the injury when records prove worse than the narrative said', () => {
    // The narrative describes a strain. The records carry a disc herniation
    // with radiculopathy, which is what the case is actually worth.
    const narrativeOnly = underwriteCase(softTissueCase())
    const coded = underwriteCase(softTissueCase({ clinical: { icdCodes: ['M51.1'] } }))

    expect(narrativeOnly.severity.primaryInjury).toBe('SOFT_TISSUE')
    expect(coded.severity.primaryInjury).toBe('RADICULOPATHY')
    expect(coded.severity.injurySource).toBe('clinical_codes')
    expect(coded.settlement.expected).toBeGreaterThan(narrativeOnly.settlement.expected)
  })

  it('never downgrades an injury the narrative documented', () => {
    // A coded sprain does not disprove the herniation a treating physician
    // described in a report nobody has coded yet.
    const result = underwriteCase({
      ...softTissueCase({ clinical: { icdCodes: ['S33.5'] } }),
      facts: {
        ...softTissueCase().facts,
        injuries: [{ diagnoses: ['disc herniation'] }],
        clinical: { icdCodes: ['S33.5'] },
      },
    })

    expect(result.severity.primaryInjury).toBe('DISC_HERNIATION')
    expect(result.severity.injurySource).toBe('narrative')
  })

  it('separates a haemorrhage from a concussion in dollars', () => {
    const concussion = underwriteCase(softTissueCase({ clinical: { icdCodes: ['S06.0X0A'] } }))
    const haemorrhage = underwriteCase(softTissueCase({ clinical: { icdCodes: ['S06.5X0A'] } }))

    expect(haemorrhage.settlement.expected).toBeGreaterThan(concussion.settlement.expected)
  })

  it('credits imaging, which the engine used to ignore entirely', () => {
    const without = underwriteCase(softTissueCase())
    const withImaging = underwriteCase(softTissueCase({ clinical: { cptCodes: ['72148'] } }))

    expect(withImaging.treatment.score).toBeGreaterThan(without.treatment.score)
    expect(withImaging.treatment.positives).toContain('Objective imaging (MRI or CT)')
  })
})

describe('treatment chronology reaches the settlement figure', () => {
  const withVisits = (dates: string[]) => ({
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'Los Angeles',
    facts: {
      claimType: 'auto',
      liability: { crashType: 'rear_end', comparativeNegligence: 0 },
      incident: { date: '2026-01-01', narrative: 'Rear-ended at a light. Neck and back pain.' },
      injuries: [{ diagnoses: ['neck strain'] }],
      treatment: dates.map((date) => ({ type: 'physical_therapy', date })),
      damages: { med_charges: 30000 },
    },
    evidenceFiles: [{ category: 'medical_records' }, { category: 'bills' }],
  })

  it('penalises a real gap in care', () => {
    const continuous = underwriteCase(withVisits(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05']))
    const gapped = underwriteCase(withVisits(['2026-01-05', '2026-02-05', '2026-08-05', '2026-11-05']))

    expect(gapped.treatment.chronology.gapCount).toBeGreaterThan(0)
    expect(gapped.treatment.score).toBeLessThan(continuous.treatment.score)
    expect(gapped.settlement.expected).toBeLessThan(continuous.settlement.expected)
  })

  it('penalises a delayed start, which weakens causation', () => {
    const prompt = underwriteCase(withVisits(['2026-01-04', '2026-02-04', '2026-03-04']))
    const delayed = underwriteCase(withVisits(['2026-06-04', '2026-07-04', '2026-08-04']))

    expect(delayed.settlement.expected).toBeLessThan(prompt.settlement.expected)
  })

  it('does not read a gap into a record that says there was none', () => {
    // The old check was a bare /gap/ over a text blob, so this narrative
    // scored a treatment-gap penalty for saying the opposite.
    const facts = {
      claimType: 'auto',
      liability: { crashType: 'rear_end' },
      incident: { narrative: 'Treated consistently with no gap in care throughout.' },
      injuries: [{ diagnoses: ['neck strain'] }],
      treatment: [{ type: 'physical_therapy' }, { type: 'physical_therapy' }],
      damages: { med_charges: 30000 },
    }
    const result = underwriteCase({ claimType: 'auto', venueState: 'CA', venueCounty: 'Los Angeles', facts })

    expect(result.treatment.negatives).not.toContain('Possible treatment gap')
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
