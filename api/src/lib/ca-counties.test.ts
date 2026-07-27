import { describe, expect, it } from 'vitest'
import {
  ambiguousCountiesForCaCity,
  CA_COUNTIES,
  CENSUS_OVERRIDES,
  countyForCaCity,
  isCaCounty,
  normalizeCaCounty,
  resolveCaCounty,
} from './ca-counties'
import {
  CENSUS_AMBIGUOUS_PLACES,
  CENSUS_PLACE_TO_COUNTY,
} from './ca-county-crosswalk.generated'

describe('CA_COUNTIES', () => {
  it('lists all 58 counties exactly once', () => {
    expect(CA_COUNTIES).toHaveLength(58)
    expect(new Set(CA_COUNTIES).size).toBe(58)
  })
})

describe('normalizeCaCounty', () => {
  it('canonicalizes casing, the County suffix and punctuation', () => {
    for (const input of [
      'Los Angeles',
      'los angeles',
      'LOS ANGELES COUNTY',
      'Los Angeles Co.',
      '  los angeles county  ',
    ]) {
      expect(normalizeCaCounty(input)).toBe('Los Angeles')
    }
  })

  it('resolves the abbreviations that appear in directory data', () => {
    expect(normalizeCaCounty('LA')).toBe('Los Angeles')
    expect(normalizeCaCounty('SF')).toBe('San Francisco')
    expect(normalizeCaCounty('OC')).toBe('Orange')
    expect(normalizeCaCounty('San Bernadino')).toBe('San Bernardino')
  })

  it('handles the multi-word counties that are easy to truncate', () => {
    expect(normalizeCaCounty('Contra Costa County')).toBe('Contra Costa')
    expect(normalizeCaCounty('san luis obispo')).toBe('San Luis Obispo')
    expect(normalizeCaCounty('DEL NORTE')).toBe('Del Norte')
  })

  it('returns null rather than guessing', () => {
    expect(normalizeCaCounty(null)).toBeNull()
    expect(normalizeCaCounty('')).toBeNull()
    expect(normalizeCaCounty('Clark')).toBeNull()
    expect(normalizeCaCounty('Maricopa County')).toBeNull()
  })

  it('round-trips every canonical name', () => {
    for (const county of CA_COUNTIES) {
      expect(normalizeCaCounty(county)).toBe(county)
      expect(normalizeCaCounty(`${county} County`)).toBe(county)
      expect(isCaCounty(county)).toBe(true)
    }
  })
})

describe('countyForCaCity', () => {
  it('maps the major legal markets to their county', () => {
    expect(countyForCaCity('Los Angeles')).toBe('Los Angeles')
    expect(countyForCaCity('Santa Monica')).toBe('Los Angeles')
    expect(countyForCaCity('Irvine')).toBe('Orange')
    expect(countyForCaCity('San Diego')).toBe('San Diego')
    expect(countyForCaCity('Oakland')).toBe('Alameda')
    expect(countyForCaCity('San Jose')).toBe('Santa Clara')
    expect(countyForCaCity('Walnut Creek')).toBe('Contra Costa')
    expect(countyForCaCity('Sacramento')).toBe('Sacramento')
    expect(countyForCaCity('Riverside')).toBe('Riverside')
    expect(countyForCaCity('Fresno')).toBe('Fresno')
  })

  it('does not confuse a city with the same-named county elsewhere', () => {
    // Ontario is in San Bernardino County, not its own.
    expect(countyForCaCity('Ontario')).toBe('San Bernardino')
    // Pasadena is in LA County despite the name having no county twin.
    expect(countyForCaCity('Pasadena')).toBe('Los Angeles')
  })

  it('tolerates casing, punctuation and diacritics', () => {
    expect(countyForCaCity('  santa monica ')).toBe('Los Angeles')
    expect(countyForCaCity('LA CANADA FLINTRIDGE')).toBe('Los Angeles')
  })

  it('returns null for unmapped cities so callers flag them', () => {
    expect(countyForCaCity('Nowhereville')).toBeNull()
    expect(countyForCaCity(null)).toBeNull()
    expect(countyForCaCity('')).toBeNull()
  })

  it('resolves the small unincorporated communities the Census file adds', () => {
    // These are not incorporated cities, so a city-only crosswalk misses them.
    expect(countyForCaCity('Castro Valley')).toBe('Alameda')
    expect(countyForCaCity('Altadena')).toBe('Los Angeles')
    expect(countyForCaCity('Isla Vista')).toBe('Santa Barbara')
  })

  it('prefers the incorporated city when a CDP shares its name', () => {
    // Burbank is a city in LA County and a tiny CDP in Santa Clara County.
    expect(countyForCaCity('Burbank')).toBe('Los Angeles')
    expect(countyForCaCity('Mountain View')).toBe('Santa Clara')
    expect(countyForCaCity('Paradise')).toBe('Butte')
  })

  it('only ever returns a canonical county name', () => {
    for (const city of ['Los Angeles', 'Irvine', 'Oakland', 'Ukiah', 'Hollister']) {
      const county = countyForCaCity(city)
      expect(county).not.toBeNull()
      expect(isCaCounty(county!)).toBe(true)
    }
  })
})

describe('resolveCaCounty', () => {
  it('prefers an explicit county over the city lookup', () => {
    expect(resolveCaCounty({ county: 'Orange', city: 'Los Angeles' })).toEqual({
      county: 'Orange',
      via: 'county',
    })
  })

  it('derives from the city when no county is given', () => {
    expect(resolveCaCounty({ city: 'Santa Monica' })).toEqual({
      county: 'Los Angeles',
      via: 'city',
    })
  })

  it('falls back to the city when the county value is unusable', () => {
    expect(resolveCaCounty({ county: 'N/A', city: 'Irvine' })).toEqual({
      county: 'Orange',
      via: 'city',
    })
  })

  it('reports unresolved rather than picking something', () => {
    expect(resolveCaCounty({ county: null, city: 'Nowhereville' })).toEqual({
      county: null,
      via: 'none',
    })
    expect(resolveCaCounty({})).toEqual({ county: null, via: 'none' })
  })

  it('reports ambiguity instead of guessing between counties', () => {
    // Bayview exists in both Contra Costa and Humboldt as unrelated communities.
    const result = resolveCaCounty({ city: 'Bayview' })
    expect(result.county).toBeNull()
    expect(result.via).toBe('ambiguous')
    expect(result.candidates).toEqual(['Contra Costa', 'Humboldt'])
  })

  it('distinguishes ambiguous from simply unknown', () => {
    expect(resolveCaCounty({ city: 'Bayview' }).via).toBe('ambiguous')
    expect(resolveCaCounty({ city: 'Nowhereville' }).via).toBe('none')
  })
})

describe('curated map versus Census data', () => {
  // The curated layer wins over the authoritative Census file, so it must not
  // diverge from it by accident. Every disagreement needs a documented reason.
  it('only contradicts the Census file where an override is documented', () => {
    const undocumented: string[] = []

    for (const [key, census] of Object.entries(CENSUS_PLACE_TO_COUNTY)) {
      const curated = countyForCaCity(key)
      if (!curated || curated === census) continue
      const override = CENSUS_OVERRIDES[key]
      if (!override || override.curated !== curated || override.census !== census) {
        undocumented.push(`${key}: curated=${curated} census=${census}`)
      }
    }

    expect(undocumented).toEqual([])
  })

  it('gives every documented override a reason', () => {
    for (const [key, override] of Object.entries(CENSUS_OVERRIDES)) {
      expect(override.why.length, `${key} needs a reason`).toBeGreaterThan(20)
      expect(CENSUS_PLACE_TO_COUNTY[key]).toBe(override.census)
      expect(countyForCaCity(key)).toBe(override.curated)
    }
  })

  it('never emits a county outside the canonical 58', () => {
    const counties = new Set([
      ...Object.values(CENSUS_PLACE_TO_COUNTY),
      ...Object.values(CENSUS_AMBIGUOUS_PLACES).flat(),
    ])
    const invalid = Array.from(counties).filter((county) => !isCaCounty(county))
    expect(invalid).toEqual([])
  })

  it('covers all 58 counties and a meaningful share of the state', () => {
    const covered = new Set(Object.values(CENSUS_PLACE_TO_COUNTY))
    expect(covered.size).toBe(58)
    expect(Object.keys(CENSUS_PLACE_TO_COUNTY).length).toBeGreaterThan(1500)
  })

  it('keeps ambiguous names out of the lookup map', () => {
    for (const key of Object.keys(CENSUS_AMBIGUOUS_PLACES)) {
      expect(CENSUS_PLACE_TO_COUNTY[key]).toBeUndefined()
      // Unless a curated entry settles it, the name stays ambiguous.
      if (!CENSUS_OVERRIDES[key]) {
        expect(ambiguousCountiesForCaCity(key).length).toBeGreaterThan(1)
      }
    }
  })
})
