import { describe, it, expect } from 'vitest'
import {
  MAX_CASE_NAME_LENGTH,
  normalizeCaseName,
  plaintiffNameOf,
  resolveCaseName,
  suggestedCaseName,
} from './case-name'

describe('normalizeCaseName', () => {
  it('trims and collapses the whitespace a paste tends to carry', () => {
    expect(normalizeCaseName('  Rivera   v.  Delgado Trucking \n')).toBe('Rivera v. Delgado Trucking')
  })

  it('treats blank input as unset so the case falls back to its derived label', () => {
    expect(normalizeCaseName('')).toBeNull()
    expect(normalizeCaseName('   ')).toBeNull()
    expect(normalizeCaseName(null)).toBeNull()
    expect(normalizeCaseName(undefined)).toBeNull()
  })

  it('caps length rather than rejecting, so a long caption still saves', () => {
    const name = normalizeCaseName('A'.repeat(500))
    expect(name).toHaveLength(MAX_CASE_NAME_LENGTH)
  })
})

describe('resolveCaseName', () => {
  const plaintiff = { firstName: 'Marisol', lastName: 'Rivera' }

  it('prefers the caption the attorney typed', () => {
    expect(
      resolveCaseName({ caseName: 'Rivera v. Delgado Trucking', claimType: 'motor_vehicle', user: plaintiff })
    ).toBe('Rivera v. Delgado Trucking')
  })

  it('falls back to the plaintiff name, which is how cases read before captions existed', () => {
    expect(resolveCaseName({ caseName: null, claimType: 'motor_vehicle', user: plaintiff })).toBe('Marisol Rivera')
  })

  it('falls back to the claim type when the case has no plaintiff account', () => {
    // Assessment.userId is nullable, so a case genuinely can have no user.
    expect(resolveCaseName({ caseName: null, claimType: 'slip_and_fall', user: null })).toBe('Slip And Fall')
  })

  it('falls back to the generic label when nothing at all is known', () => {
    expect(resolveCaseName({})).toBe('Case')
    expect(resolveCaseName({}, 'Untitled case')).toBe('Untitled case')
  })

  it('ignores a caption that is only whitespace', () => {
    expect(resolveCaseName({ caseName: '   ', user: plaintiff })).toBe('Marisol Rivera')
  })

  it('uses a partial plaintiff name rather than skipping to the claim type', () => {
    expect(resolveCaseName({ claimType: 'motor_vehicle', user: { firstName: 'Marisol', lastName: null } })).toBe(
      'Marisol'
    )
  })
})

describe('plaintiffNameOf', () => {
  it('stays available so salutations do not start greeting people by caption', () => {
    expect(plaintiffNameOf({ caseName: 'Rivera v. Delgado', user: { firstName: 'Marisol', lastName: 'Rivera' } })).toBe(
      'Marisol Rivera'
    )
  })

  it('returns null when there is no plaintiff', () => {
    expect(plaintiffNameOf({ user: null })).toBeNull()
    expect(plaintiffNameOf({ user: { firstName: '', lastName: '' } })).toBeNull()
  })
})

describe('suggestedCaseName', () => {
  it('prefills the surname and leaves the defendant to be typed', () => {
    expect(suggestedCaseName({ user: { firstName: 'Marisol', lastName: 'Rivera' } })).toBe('Rivera v. ')
  })

  it('uses the last word of a multi-part surname', () => {
    expect(suggestedCaseName({ user: { firstName: 'Ana', lastName: 'de la Cruz' } })).toBe('Cruz v. ')
  })

  it('falls back to a first name when that is all there is', () => {
    expect(suggestedCaseName({ user: { firstName: 'Marisol', lastName: null } })).toBe('Marisol v. ')
  })

  it('offers nothing to prefill when the case has no plaintiff', () => {
    expect(suggestedCaseName({ user: null })).toBeNull()
  })
})
