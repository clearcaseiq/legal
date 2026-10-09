import { describe, expect, it } from 'vitest'
import { caseOriginFromIp, formatCaseOrigin, normalizeIp } from './case-origin'

describe('normalizeIp', () => {
  it('unwraps IPv4 addresses reported on a dual-stack socket', () => {
    expect(normalizeIp('::ffff:73.70.0.1')).toBe('73.70.0.1')
  })

  it('returns null for a missing address', () => {
    expect(normalizeIp(undefined)).toBeNull()
    expect(normalizeIp('  ')).toBeNull()
  })
})

describe('caseOriginFromIp', () => {
  it('resolves a public address to an approximate location', () => {
    const origin = caseOriginFromIp('::ffff:73.70.0.1')
    expect(origin.createdIp).toBe('73.70.0.1')
    expect(origin.createdCountry).toBe('US')
    expect(origin.createdRegion).toBe('CA')
  })

  it('keeps the IP but no location for private addresses', () => {
    expect(caseOriginFromIp('127.0.0.1')).toEqual({
      createdIp: '127.0.0.1',
      createdCity: null,
      createdRegion: null,
      createdCountry: null,
    })
  })
})

describe('formatCaseOrigin', () => {
  it('joins the parts that were resolved', () => {
    expect(formatCaseOrigin({ createdCity: 'San Rafael', createdRegion: 'CA', createdCountry: 'US' })).toBe('San Rafael, CA, US')
    expect(formatCaseOrigin({ createdCountry: 'US' })).toBe('US')
    expect(formatCaseOrigin({})).toBeNull()
  })
})
