/**
 * Display labels for stored claim-type slugs.
 *
 * These are the strings claimants and staff read on every case surface, and the
 * bug they guard against is a screen printing the raw database slug — the case
 * snapshot showed "auto" where the rest of the app said "Motor vehicle".
 */
import { describe, expect, it } from 'vitest'

import { formatCaseSubtype, formatCaseTypeWithSubtype, formatClaimType } from './claim-types'

describe('formatClaimType', () => {
  it('maps a stored slug to its curated label', () => {
    expect(formatClaimType('auto')).toBe('Motor vehicle')
    expect(formatClaimType('slip_and_fall')).toBe('Slip & fall')
  })

  it('reads the same for every legacy slug that means the same thing', () => {
    for (const slug of ['auto', 'vehicle', 'motor_vehicle', 'car_accident']) {
      expect(formatClaimType(slug)).toBe('Motor vehicle')
    }
  })

  it('sentence-cases an unmapped slug rather than showing it raw', () => {
    expect(formatClaimType('some_new_type')).toBe('Some new type')
  })

  it('names the default when the case carries no type', () => {
    expect(formatClaimType(null)).toBe('Personal injury')
    expect(formatClaimType('   ')).toBe('Personal injury')
  })
})

describe('formatCaseTypeWithSubtype', () => {
  it('narrows the claim type with the subtype intake captured', () => {
    expect(formatCaseTypeWithSubtype('auto', 'rear_end_collision')).toBe(
      'Motor vehicle (Rear-end collision)',
    )
  })

  it('falls back to the claim type alone when there is no subtype', () => {
    expect(formatCaseTypeWithSubtype('auto', null)).toBe('Motor vehicle')
    expect(formatCaseTypeWithSubtype('auto', '  ')).toBe('Motor vehicle')
  })

  it('drops a subtype that just repeats its parent', () => {
    // "Workplace injury (Workplace injury)" tells a specialist nothing.
    expect(formatCaseTypeWithSubtype('workplace', 'workplace_injury')).toBe('Workplace injury')
  })

  it('still labels the subtype when the claim type is missing', () => {
    expect(formatCaseTypeWithSubtype(null, 'bicycle_accident')).toBe(
      'Personal injury (Bicycle accident)',
    )
  })
})

describe('formatCaseSubtype', () => {
  it('is empty for no subtype, so callers can omit the bracket', () => {
    expect(formatCaseSubtype(null)).toBe('')
    expect(formatCaseSubtype('')).toBe('')
  })

  it('sentence-cases an unmapped subtype', () => {
    expect(formatCaseSubtype('scooter_accident')).toBe('Scooter accident')
  })
})
