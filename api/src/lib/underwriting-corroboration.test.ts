/**
 * An imaging diagnosis typed into a narrative is a claim, not a finding, and
 * until now it was priced as a finding. These cover the gate that separates the
 * two, and the cases it must not touch.
 */
import { describe, it, expect } from 'vitest'
import { calculateSeverity, underwriteCase, type UnderwritingInput } from './underwriting-engine'

/** A case with real billed treatment, so the multiplier is what moves the number. */
function caseWith(overrides: {
  narrative: string
  icdCodes?: string[]
  cptCodes?: string[]
}): UnderwritingInput {
  return {
    id: 'case-1',
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'orange',
    facts: {
      claimType: 'auto',
      incident: {
        narrative: overrides.narrative,
        date: '2026-01-15',
        location: 'Orange County, CA',
      },
      damages: { med_charges: 50000 },
      clinical: {
        icdCodes: overrides.icdCodes ?? [],
        cptCodes: overrides.cptCodes ?? [],
      },
    },
    evidenceFiles: [],
  }
}

const HERNIATION = 'Rear-ended on the freeway. MRI showed a herniated disc at L5-S1 and I have been in pain since.'
const SOFT_TISSUE = 'Rear-ended on the freeway. Neck and back have been sore since.'

describe('narrative-only imaging diagnoses', () => {
  it('keeps the reported injury but prices it at soft tissue', () => {
    const severity = calculateSeverity(caseWith({ narrative: HERNIATION }))

    // The attorney still sees what the claimant reported.
    expect(severity.primaryInjury).toBe('DISC_HERNIATION')
    expect(severity.injurySource).toBe('narrative')
    // The money does not.
    expect(severity.injuryCorroboration).toBe('none')
    expect(severity.valuationInjury).toBe('SOFT_TISSUE')
  })

  it('says why in the factors, so the breakdown explains the number', () => {
    const severity = calculateSeverity(caseWith({ narrative: HERNIATION }))
    expect(severity.factors.join(' ')).toContain('not confirmed by imaging or diagnosis codes')
  })

  it('does not let the claimant corroborate themselves by naming the scan', () => {
    // The narrative above says "MRI showed". That phrase is read elsewhere in
    // the engine, but it is the same text that produced the diagnosis, so it
    // cannot also be the proof of it.
    expect(calculateSeverity(caseWith({ narrative: HERNIATION })).injuryCorroboration).toBe('none')
  })

})

describe('what corroborates a diagnosis', () => {
  it('accepts a diagnosis code off the records', () => {
    // M51.26 — lumbar disc displacement.
    const severity = calculateSeverity(caseWith({ narrative: HERNIATION, icdCodes: ['M51.26'] }))

    expect(severity.injuryCorroboration).toBe('coded')
    expect(severity.valuationInjury).toBe('DISC_HERNIATION')
  })

  it('accepts an advanced-imaging procedure code off the bills', () => {
    // 72148 — MRI of the lumbar spine, billed. The scan happened.
    const severity = calculateSeverity(caseWith({ narrative: HERNIATION, cptCodes: ['72148'] }))

    expect(severity.injuryCorroboration).not.toBe('none')
    expect(severity.valuationInjury).toBe('DISC_HERNIATION')
  })

  it('is worth real money on a case with real bills', () => {
    // Identical narrative and identical $50k of treatment. The only difference
    // is a diagnosis code, which is the whole point: the same claim is worth
    // substantially more once something objective backs it.
    const corroborated = underwriteCase(caseWith({ narrative: HERNIATION, icdCodes: ['M51.26'] }))
    const bare = underwriteCase(caseWith({ narrative: HERNIATION }))

    expect(corroborated.settlement.expected).toBeGreaterThan(bare.settlement.expected * 1.25)
  })

  it('does not treat a coded sprain as proof of a claimed herniation', () => {
    // S13.4 — cervical sprain. It ranks below a herniation, so it corroborates
    // nothing. Consistent with the engine's existing rule that codes upgrade an
    // injury but never downgrade it: the claim survives, the valuation does not.
    const severity = calculateSeverity(caseWith({ narrative: HERNIATION, icdCodes: ['S13.4'] }))

    expect(severity.primaryInjury).toBe('DISC_HERNIATION')
    expect(severity.injuryCorroboration).toBe('none')
    expect(severity.valuationInjury).toBe('SOFT_TISSUE')
  })
})

describe('injuries the gate deliberately leaves alone', () => {
  it('prices a reported fracture at a fracture', () => {
    // A broken bone is not in doubt to the person who broke it.
    const severity = calculateSeverity(
      caseWith({ narrative: 'T-boned at the intersection and fractured my wrist.' }),
    )

    expect(severity.primaryInjury).toBe('BROKEN_BONE')
    expect(severity.valuationInjury).toBe('BROKEN_BONE')
  })

  it('leaves a soft-tissue case exactly where it was', () => {
    const severity = calculateSeverity(caseWith({ narrative: SOFT_TISSUE }))
    expect(severity.valuationInjury).toBe(severity.primaryInjury)
    expect(severity.factors.join(' ')).not.toContain('not confirmed')
  })
})
