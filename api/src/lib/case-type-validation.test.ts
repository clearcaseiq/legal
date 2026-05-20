import { describe, expect, it } from 'vitest'
import { validateCaseTypeFromFacts } from './case-type-validation'

describe('validateCaseTypeFromFacts', () => {
  it('enriches auto cases with vehicle subtypes', () => {
    const result = validateCaseTypeFromFacts('auto', {
      incident: { narrative: 'I was rear-ended by a Lyft driver at an intersection.' },
      liability: { crashType: 'rear_end', defendantType: 'uber_lyft' },
      intakeData: { injuryType: 'vehicle' },
    })

    expect(result.validatedClaimType).toBe('auto')
    expect(result.subtypes).toContain('rear_end')
    expect(result.subtypes).toContain('rideshare')
    expect(result.conflicts).toEqual([])
  })

  it('flags rough workplace mapping as workplace injury', () => {
    const result = validateCaseTypeFromFacts('high_severity_surgery', {
      incident: { narrative: 'I was injured on the job at a construction site by unsafe equipment.' },
      intakeData: { injuryType: 'workplace' },
    })

    expect(result.validatedClaimType).toBe('workplace_injury')
    expect(result.subtypes).toContain('on_the_job')
    expect(result.conflicts).toEqual([])
  })

  it('flags assault selected as wrongful death when no death facts exist', () => {
    const result = validateCaseTypeFromFacts('wrongful_death', {
      incident: { narrative: 'I was attacked during a bar fight and suffered a broken nose.' },
      intakeData: { injuryType: 'assault', branch: { assaultType: 'bar_fight' } },
    })

    expect(result.validatedClaimType).toBe('intentional_tort')
    expect(result.conflicts.length).toBeGreaterThan(0)
  })
})
