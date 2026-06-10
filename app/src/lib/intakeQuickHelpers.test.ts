import { describe, it, expect } from 'vitest'
import {
  buildCaseTaxonomy,
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

  it('keeps valid Colorado counties', () => {
    expect(sanitizeDetectedCounty('CO', 'Denver County')).toBe('Denver')
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

describe('buildCaseTaxonomy', () => {
  it('classifies rideshare and commercial auto details without changing the broad claim type', () => {
    const taxonomy = buildCaseTaxonomy({
      injuryType: 'vehicle',
      claimType: 'auto',
      branch: {
        crashType: 'rear_end',
        defendantType: 'uber_lyft',
      },
      insuranceCoverage: {
        umUimCoverage: 'yes',
        defendantCoverageLimits: 'commercial_policy',
      },
    })

    expect(taxonomy.caseSubtype).toBe('rideshare_accident')
    expect(taxonomy.taxonomyPath).toEqual(['auto', 'rideshare_accident'])
    expect(taxonomy.incidentTags).toEqual(expect.arrayContaining(['vehicle', 'auto', 'rear_end', 'uber_lyft', 'rideshare', 'um_uim_available']))
  })

  it('captures premises subtypes and hazards', () => {
    const taxonomy = buildCaseTaxonomy({
      injuryType: 'slip_fall',
      claimType: 'slip_and_fall',
      branch: {
        propertyType: 'grocery',
        hazardType: 'wet_floor',
      },
    })

    expect(taxonomy.caseSubtype).toBe('grocery_premises')
    expect(taxonomy.incidentTags).toEqual(expect.arrayContaining(['grocery', 'wet_floor', 'hazard_wet_floor', 'retail_store']))
  })

  it('preserves medical malpractice subtypes like birth injury and nursing home', () => {
    expect(buildCaseTaxonomy({
      injuryType: 'medmal',
      claimType: 'medmal',
      branch: { errorType: 'birth_injury', providerType: 'hospital' },
    }).caseSubtype).toBe('birth_injury')

    const nursingHome = buildCaseTaxonomy({
      injuryType: 'medmal',
      claimType: 'medmal',
      branch: { errorType: 'treatment', providerType: 'nursing_home' },
    })

    expect(nursingHome.caseSubtype).toBe('nursing_home_abuse')
    expect(nursingHome.incidentTags).toContain('provider_nursing_home')
  })
})

describe('CA_COUNTIES', () => {
  it('includes Los Angeles and San Francisco', () => {
    expect(CA_COUNTIES).toContain('Los Angeles')
    expect(CA_COUNTIES).toContain('San Francisco')
  })
})
