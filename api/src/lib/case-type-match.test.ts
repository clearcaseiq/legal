import { describe, it, expect } from 'vitest'
import { caseTypeMatches, coversClaimType, toClaimType } from './case-type-match'

describe('toClaimType', () => {
  it('maps client-facing incident types into claim-type space', () => {
    expect(toClaimType('vehicle')).toBe('auto')
    expect(toClaimType('slip_fall')).toBe('slip_and_fall')
    expect(toClaimType('workplace')).toBe('workplace_injury')
    expect(toClaimType('assault')).toBe('intentional_tort')
    expect(toClaimType('toxic')).toBe('toxic_exposure')
    expect(toClaimType('other')).toBe('other_pi')
  })

  it('passes claim types through unchanged', () => {
    expect(toClaimType('auto')).toBe('auto')
    expect(toClaimType('dog_bite')).toBe('dog_bite')
  })

  it('normalizes spacing and case before mapping', () => {
    expect(toClaimType('Slip Fall')).toBe('slip_and_fall')
    expect(toClaimType('  MEDICAL-MALPRACTICE ')).toBe('medmal')
  })
})

describe('caseTypeMatches', () => {
  it('matches a practice area stored as an incident type against a claim type', () => {
    expect(caseTypeMatches('vehicle', 'auto')).toBe(true)
    expect(caseTypeMatches('slip_fall', 'slip_and_fall')).toBe(true)
  })

  // CP-406 widened the stored claim types. Attorneys whose practice areas were
  // saved under the old spellings must keep matching cases already in the
  // database, or routing silently stops offering them work.
  it('matches legacy spellings on either side', () => {
    expect(caseTypeMatches('premises_liability', 'slip_and_fall')).toBe(true)
    expect(caseTypeMatches('slip_and_fall', 'premises')).toBe(true)
    expect(caseTypeMatches('workers_comp', 'workplace_injury')).toBe(true)
    expect(caseTypeMatches('auto', 'motor_vehicle')).toBe(true)
    expect(caseTypeMatches('med_mal', 'medical_malpractice')).toBe(true)
  })

  // The point of CP-406: workplace, assault and other used to collapse onto
  // slip_and_fall, so a premises-only practice was routed assault cases.
  it('no longer routes distinct incident types to a slip & fall practice', () => {
    expect(caseTypeMatches('slip_fall', 'workplace_injury')).toBe(false)
    expect(caseTypeMatches('slip_fall', 'intentional_tort')).toBe(false)
    expect(caseTypeMatches('slip_fall', 'other_pi')).toBe(false)
    expect(caseTypeMatches('product', 'toxic_exposure')).toBe(false)
  })

  it('treats an empty claim type as no match rather than a wildcard', () => {
    expect(caseTypeMatches('auto', '')).toBe(false)
    expect(caseTypeMatches('', '')).toBe(false)
  })
})

describe('coversClaimType', () => {
  it('is true when any stored value covers the claim type', () => {
    expect(coversClaimType(['medmal', 'vehicle'], 'auto')).toBe(true)
    expect(coversClaimType(['medmal', 'dog_bite'], 'auto')).toBe(false)
    expect(coversClaimType([], 'auto')).toBe(false)
  })
})
