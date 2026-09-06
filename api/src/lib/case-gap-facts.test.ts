import { describe, expect, it } from 'vitest'
import { GAP_FACT_PATHS, factPathsForGap, isAnswerableGap, unproposableMappedPaths } from './case-gap-facts'
import { PROPOSABLE_FACT_PATHS, applyFactPath } from './case-fact-paths'

describe('the gap-to-fact mapping', () => {
  // The mapping is only useful if the proposal endpoint accepts what it points
  // at. Removing a path from the allowlist without touching this map would
  // otherwise leave a gap offering a field that every proposal rejects.
  it('only points at paths the allowlist accepts', () => {
    expect(unproposableMappedPaths()).toEqual([])
  })

  it('treats document and structured-record gaps as unanswerable', () => {
    // These close when a file lands.
    expect(isAnswerableGap('medical_records')).toBe(false)
    expect(isAnswerableGap('police_report')).toBe(false)
    expect(isAnswerableGap('photos')).toBe(false)
    // These read the InsuranceDetail and liability records, not facts, so no
    // proposal against the facts document could ever close them.
    expect(isAnswerableGap('first_party_coverage')).toBe(false)
    expect(isAnswerableGap('coverage_unconfirmed')).toBe(false)
    expect(isAnswerableGap('comparative_negligence_theory')).toBe(false)
  })

  it('maps the gaps a claimant can simply answer', () => {
    expect(factPathsForGap('defendant_identity')).toContain('defendant.name')
    expect(factPathsForGap('prior_injuries')).toContain('injuryDetails.priorInjury')
    expect(factPathsForGap('claim_not_opened')).toContain('insurance.claim_number')
  })

  it('returns an empty list rather than undefined for an unknown gap', () => {
    expect(factPathsForGap('not_a_real_gap')).toEqual([])
  })
})

/**
 * Each of these mirrors what the gap's detector in `case-intelligence.ts` reads.
 * A mapped path that writes somewhere the detector does not look produces a gap
 * that stays open no matter how many times a specialist asks the question, which
 * is exactly what `employer_info` did before this mapping existed.
 */
describe('recording the answer writes where the detector reads', () => {
  it('closes employer_info, which reads employment.employer', () => {
    const facts = applyFactPath({}, 'caseAcceleration.wageLoss.employerName', 'Acme Corp')
    expect((facts as any).employment?.employer).toBe('Acme Corp')
    expect((facts as any).damages?.employer).toBe('Acme Corp')
    expect((facts as any).caseAcceleration?.wageLoss?.employerName).toBe('Acme Corp')
  })

  it('closes defendant_carrier, which reads insurance.carrier as an alias', () => {
    const facts = applyFactPath({}, 'insurance.defendant_carrier', 'State Farm')
    expect((facts as any).insurance?.defendant_carrier).toBe('State Farm')
    expect((facts as any).insurance?.carrier).toBe('State Farm')
  })

  it('closes claim_not_opened, which reads claim_number or claimNumber', () => {
    const facts = applyFactPath({}, 'insurance.claim_number', 'CLM-1')
    expect((facts as any).insurance?.claim_number).toBe('CLM-1')
    expect((facts as any).insurance?.claimNumber).toBe('CLM-1')
  })

  it('closes defendant_identity, which accepts liability.defendantName', () => {
    const facts = applyFactPath({}, 'defendant.name', 'Jane Roe')
    expect((facts as any).defendant?.name).toBe('Jane Roe')
    expect((facts as any).liability?.defendantName).toBe('Jane Roe')
  })
})

describe('the new answer paths', () => {
  it('are all on the allowlist with a label', () => {
    for (const path of ['defendant.name', 'injuryDetails.priorInjury', 'product.manufacturer', 'liability.hasWitnesses']) {
      expect(PROPOSABLE_FACT_PATHS[path]?.label).toBeTruthy()
    }
  })

  it('keeps consent and derived fields out of the mapping', () => {
    for (const path of Object.values(GAP_FACT_PATHS).flat()) {
      expect(path.startsWith('consents')).toBe(false)
      expect(path.startsWith('plaintiffMedicalReview')).toBe(false)
    }
  })
})
