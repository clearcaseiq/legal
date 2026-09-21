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
  treatment?: unknown[]
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
      treatment: overrides.treatment ?? [],
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

describe('the procedure premium', () => {
  const CODED = ['M51.26']
  const surgery = (status: string) => [{ type: 'surgery_status', status }]

  it('pays for a surgery the claimant says they had', () => {
    const severity = calculateSeverity(
      caseWith({ narrative: HERNIATION, icdCodes: CODED, treatment: surgery('completed') }),
    )
    expect(severity.proceduresPerformed.surgery).toBe(true)
  })

  it('pays for one that is scheduled, since they will still undergo it', () => {
    const severity = calculateSeverity(
      caseWith({ narrative: HERNIATION, icdCodes: CODED, treatment: surgery('scheduled') }),
    )
    expect(severity.proceduresPerformed.surgery).toBe(true)
  })

  it('does not pay for a surgery that was only recommended', () => {
    // A recommendation is not a procedure. This raised severity and the
    // multiple identically to a completed surgery, because the premium was
    // applied by substring-matching the factors list for "surgery".
    const recommended = caseWith({
      narrative: HERNIATION, icdCodes: CODED, treatment: surgery('recommended'),
    })
    const completed = caseWith({
      narrative: HERNIATION, icdCodes: CODED, treatment: surgery('completed'),
    })
    const none = caseWith({ narrative: HERNIATION, icdCodes: CODED })

    expect(calculateSeverity(recommended).proceduresPerformed.surgery).toBe(false)
    expect(calculateSeverity(completed).proceduresPerformed.surgery).toBe(true)

    // A recommendation still says the injury is worse than one nobody proposed
    // operating on, so severity and the value rise. What it no longer does is
    // reach the value of having undergone the operation.
    expect(calculateSeverity(recommended).score).toBeGreaterThan(calculateSeverity(none).score)
    expect(underwriteCase(recommended).settlement.expected).toBeLessThan(
      underwriteCase(completed).settlement.expected,
    )
  })

  it('does not pay for a surgery only a regex found in the prose', () => {
    const narrated = caseWith({
      narrative: `${HERNIATION} I had surgery in March.`,
      icdCodes: CODED,
    })
    expect(calculateSeverity(narrated).proceduresPerformed.surgery).toBe(false)
  })

  it('pays when the bills carry a surgical procedure code', () => {
    // 22558 — anterior lumbar interbody fusion.
    const severity = calculateSeverity(
      caseWith({ narrative: HERNIATION, icdCodes: CODED, cptCodes: ['22558'] }),
    )
    expect(severity.proceduresPerformed.surgery).toBe(true)
  })

  it('counts injections from the treatment record, not from keywords in prose', () => {
    // Two mentions of a procedure the claimant is declining previously scored
    // as two injections and took the premium with them.
    const scared = caseWith({
      narrative: `${HERNIATION} I am scared of getting an injection and my doctor keeps pushing an injection.`,
      icdCodes: CODED,
    })
    const recorded = caseWith({
      narrative: HERNIATION,
      icdCodes: CODED,
      treatment: [{ type: 'injection', notes: 'epidural steroid injection' }],
    })

    // No premium on the multiple for a procedure the prose only discusses.
    expect(calculateSeverity(scared).proceduresPerformed.injections).toBe(0)
    expect(calculateSeverity(recorded).proceduresPerformed.injections).toBe(1)
    expect(underwriteCase(scared).settlement.expected).toBeLessThan(
      underwriteCase(recorded).settlement.expected,
    )
  })

  it('pays for injections that are on the treatment record', () => {
    const severity = calculateSeverity(
      caseWith({
        narrative: HERNIATION,
        icdCodes: CODED,
        treatment: [{ type: 'injection', notes: 'epidural steroid injection' }],
      }),
    )
    expect(severity.proceduresPerformed.injections).toBe(1)
  })

  it('caps what the narrative alone can add to severity at a single injection', () => {
    const scared = caseWith({
      narrative: `${HERNIATION} I am scared of getting an injection and my doctor keeps pushing an injection.`,
      icdCodes: CODED,
    })
    expect(calculateSeverity(scared).factors.join(' ')).not.toContain('two injections')
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
