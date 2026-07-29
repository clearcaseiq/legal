import { describe, it, expect } from 'vitest'
import {
  buildCaseTaxonomy,
  CA_COUNTIES,
  INJURY_TO_CLAIM,
  injuryTypeToClaimType,
  normalizeCounty,
  sanitizeDetectedCounty,
} from './intakeQuickHelpers'
import { CLAIM_TYPE_OPTIONS, canonicalClaimType, claimTypeSynonyms, formatClaimType } from './claimTypes'
import { SOL_RULES, normalizeClaimTypeForSOL } from '../../../api/src/lib/solRules'

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

  it('defaults unknown types to other injury rather than a product claim', () => {
    expect(injuryTypeToClaimType('not_a_real_type')).toBe('other_pi')
  })

  // CP-406: these four used to be rewritten to slip_and_fall or product, so a
  // plaintiff reporting a workplace injury was shown to staff as a slip & fall.
  it('keeps every incident type distinct', () => {
    expect(injuryTypeToClaimType('workplace')).toBe('workplace_injury')
    expect(injuryTypeToClaimType('assault')).toBe('intentional_tort')
    expect(injuryTypeToClaimType('toxic')).toBe('toxic_exposure')
    expect(injuryTypeToClaimType('other')).toBe('other_pi')

    const claimTypes = Object.values(INJURY_TO_CLAIM)
    expect(new Set(claimTypes).size).toBe(claimTypes.length)
  })

  it('round-trips every incident type back to its own label', () => {
    const labels = Object.entries(INJURY_TO_CLAIM).map(([, claimType]) => formatClaimType(claimType))
    expect(new Set(labels).size).toBe(labels.length)
    expect(formatClaimType(injuryTypeToClaimType('workplace'))).toBe('Workplace injury')
    expect(formatClaimType(injuryTypeToClaimType('assault'))).toBe('Assault & negligent security')
    expect(formatClaimType(injuryTypeToClaimType('toxic'))).toBe('Toxic exposure')
  })

  it('resolves to a statute-of-limitations rule for every incident type', () => {
    // Widening the stored claim types is only safe while SOL still recognises
    // each one; an unmapped type makes deriveSOLStatus return "unknown".
    for (const claimType of Object.values(INJURY_TO_CLAIM)) {
      const normalized = normalizeClaimTypeForSOL(claimType)
      expect(SOL_RULES.CA[normalized], `no CA SOL rule for ${claimType}`).toBeDefined()
    }
  })
})

describe('claim type filter options', () => {
  it('offers one option per distinct label, covering every stored type', () => {
    const labels = CLAIM_TYPE_OPTIONS.map((o) => o.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toContain('Workplace injury')
    expect(labels).toContain('Assault & negligent security')
    expect(labels).toContain('Toxic exposure')
    expect(labels).toContain('Nursing home abuse')
    expect(labels).toContain('Catastrophic injury')
  })

  it('groups historical spellings so one option matches them all', () => {
    expect(canonicalClaimType('vehicle')).toBe(canonicalClaimType('auto'))
    expect(canonicalClaimType('car_accident')).toBe(canonicalClaimType('motor_vehicle'))
    expect(canonicalClaimType('slip_fall')).toBe(canonicalClaimType('slip_and_fall'))
    expect(canonicalClaimType('workplace')).toBe(canonicalClaimType('workplace_injury'))
    expect(canonicalClaimType('auto')).not.toBe(canonicalClaimType('slip_and_fall'))
  })

  it('expands a selection to every equivalent slug for database filtering', () => {
    expect(claimTypeSynonyms('auto')).toEqual(
      expect.arrayContaining(['auto', 'vehicle', 'motor_vehicle', 'car_accident']),
    )
    expect(claimTypeSynonyms('')).toEqual([])
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
