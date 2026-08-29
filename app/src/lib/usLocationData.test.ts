import { describe, it, expect } from 'vitest'
import { getCountiesForState, isKnownCounty, normalizeCountyName } from './usLocationData'

describe('getCountiesForState', () => {
  it('returns counties for California and Colorado', () => {
    expect(getCountiesForState('CA')).toContain('Los Angeles')
    expect(getCountiesForState('CO')).toContain('Denver')
    expect(getCountiesForState('CO').length).toBeGreaterThan(50)
  })

  it('normalizes state codes', () => {
    expect(getCountiesForState(' co ')).toContain('Denver')
  })

  it('covers every state, not just the ones with plain "County" names', () => {
    expect(getCountiesForState('LA')).toContain('Orleans')
    expect(getCountiesForState('AK')).toContain('Juneau')
    expect(getCountiesForState('HI')).toContain('Honolulu')
    expect(getCountiesForState('DC')).toEqual(['District of Columbia'])
  })

  it('lists each county once', () => {
    for (const state of ['VA', 'MD', 'MO', 'AK', 'CA']) {
      const counties = getCountiesForState(state)
      expect(new Set(counties.map((c) => c.toLowerCase())).size).toBe(counties.length)
    }
  })

  it('keeps independent cities distinct from the county of the same name', () => {
    // Virginia's Bedford County and City of Bedford are separate venues; so are
    // Baltimore County/City and St. Louis County/City.
    expect(getCountiesForState('VA')).toContain('Bedford')
    expect(getCountiesForState('VA')).toContain('Bedford City')
    expect(getCountiesForState('MD')).toContain('Baltimore')
    expect(getCountiesForState('MD')).toContain('Baltimore City')
    expect(getCountiesForState('MO')).toContain('St. Louis City')
  })
})

describe('normalizeCountyName', () => {
  // Routing compares an attorney's stored county to the assessment's venueCounty
  // as a case-insensitive string, so both sides have to land on the same form.
  it.each([
    ['Los Angeles County', 'Los Angeles'],
    ['Acadia Parish', 'Acadia'],
    ['Aleutians West Census Area', 'Aleutians West'],
    ['Lake and Peninsula Borough', 'Lake and Peninsula'],
    ['Anchorage, Municipality of', 'Anchorage'],
    ['Juneau, City and Borough', 'Juneau'],
    ['Sitka, City and Borough of', 'Sitka'],
    ['Skagway Borough, Municipality of', 'Skagway'],
    ['San Francisco, City and County of', 'San Francisco'],
    ['Nantucket, Town and County of', 'Nantucket'],
    ['Carson City, Consolidated Municipality of', 'Carson City'],
    ['District of Columbia', 'District of Columbia'],
  ])('reduces %s to %s', (input, expected) => {
    expect(normalizeCountyName(input)).toBe(expected)
  })

  it.each([
    ['Baltimore, City of', 'Baltimore City'],
    ['St. Louis, City of', 'St. Louis City'],
    ['Alexandria, City of', 'Alexandria City'],
  ])('keeps %s an independent city', (input, expected) => {
    expect(normalizeCountyName(input)).toBe(expected)
  })
})

describe('isKnownCounty', () => {
  it('accepts a stored county whether or not it carries its legal suffix', () => {
    expect(isKnownCounty('CA', 'Los Angeles')).toBe(true)
    expect(isKnownCounty('CA', 'Los Angeles County')).toBe(true)
    expect(isKnownCounty('LA', 'Orleans Parish')).toBe(true)
    expect(isKnownCounty('AK', 'Denali Borough')).toBe(true)
  })

  it('rejects a county from a different state', () => {
    expect(isKnownCounty('CA', 'Denver')).toBe(false)
    expect(isKnownCounty('CA', '')).toBe(false)
  })
})
