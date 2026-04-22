import { describe, it, expect } from 'vitest'
import {
  CA_COUNTIES,
  INJURY_TO_CLAIM,
  injuryTypeToClaimType,
  normalizeCounty,
  sanitizeDetectedCounty,
} from './intakeQuickHelpers'

describe('normalizeCounty', () => {
  it('strips County suffix and canonicalizes CA names', () => {
    expect(normalizeCounty('los angeles county')).toBe('Los Angeles')
    expect(normalizeCounty('  Orange County ')).toBe('Orange')
  })

  it('returns trimmed input when not in CA list', () => {
    expect(normalizeCounty('Cook County')).toBe('Cook')
  })
})

describe('sanitizeDetectedCounty', () => {
  it('rejects CA state names accidentally used as counties', () => {
    expect(sanitizeDetectedCounty('CA', 'California')).toBe('')
  })

  it('keeps valid CA counties', () => {
    expect(sanitizeDetectedCounty('CA', 'los angeles county')).toBe('Los Angeles')
  })

  it('preserves non-CA counties', () => {
    expect(sanitizeDetectedCounty('IL', 'Cook County')).toBe('Cook')
  })
})

describe('injuryTypeToClaimType', () => {
  it('maps each injury type key', () => {
    for (const k of Object.keys(INJURY_TO_CLAIM)) {
      expect(injuryTypeToClaimType(k)).toBe(INJURY_TO_CLAIM[k])
    }
  })

  it('defaults unknown types to product', () => {
    expect(injuryTypeToClaimType('not_a_real_type')).toBe('product')
  })
})

describe('CA_COUNTIES', () => {
  it('includes Los Angeles and San Francisco', () => {
    expect(CA_COUNTIES).toContain('Los Angeles')
    expect(CA_COUNTIES).toContain('San Francisco')
  })
})
