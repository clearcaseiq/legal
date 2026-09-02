import { describe, it, expect } from 'vitest'
import {
  buildCaseTaxonomy,
  CA_COUNTIES,
  INJURY_TO_CLAIM,
  injuryTypeToClaimType,
  normalizeCounty,
  planDetectionFill,
  sanitizeDetectedCounty,
  type DetectionFillSnapshot,
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

  it('prefers the subtype the claimant picked over one inferred from other answers', () => {
    const taxonomy = buildCaseTaxonomy({
      injuryType: 'vehicle',
      claimType: 'auto',
      incidentSubtype: 'motorcycle_accident',
      // A rear-end collision with a rideshare driver would otherwise classify as
      // a rideshare case. The claimant said they were on a motorcycle, which is
      // an answer to the question rather than an inference from a neighbouring
      // one, so it wins.
      branch: { crashType: 'rear_end', defendantType: 'uber_lyft' },
    })

    expect(taxonomy.caseSubtype).toBe('motorcycle_accident')
    expect(taxonomy.taxonomyPath).toEqual(['auto', 'motorcycle_accident'])
    expect(taxonomy.incidentTags).toContain('motorcycle')
  })

  it('carries the tags that valuation rules match on across from the subtype', () => {
    // These tags used to come from the defendant-type question, which the subtype
    // question replaces. Losing them would silently stop the commercial-vehicle
    // rules firing.
    expect(
      buildCaseTaxonomy({ injuryType: 'vehicle', claimType: 'auto', incidentSubtype: 'truck_accident' }).incidentTags
    ).toContain('commercial_vehicle')
    expect(
      buildCaseTaxonomy({ injuryType: 'vehicle', claimType: 'auto', incidentSubtype: 'rideshare_accident' }).incidentTags
    ).toContain('rideshare')
  })

  it('falls back to the derived subtype for a case saved before the question existed', () => {
    const taxonomy = buildCaseTaxonomy({
      injuryType: 'vehicle',
      claimType: 'auto',
      branch: { defendantType: 'trucking' },
    })

    expect(taxonomy.caseSubtype).toBe('truck_accident')
  })
})

describe('CA_COUNTIES', () => {
  it('includes Los Angeles and San Francisco', () => {
    expect(CA_COUNTIES).toContain('Los Angeles')
    expect(CA_COUNTIES).toContain('San Francisco')
  })
})

describe('planDetectionFill', () => {
  const emptyForm = (): DetectionFillSnapshot => ({
    incidentDatePreset: '',
    incidentDate: '',
    venue: { state: '', county: '' },
    injurySeverity: '',
    medicalTreatmentCount: 0,
    initialCareTiming: '',
    emsResponded: '',
    bodyParts: [],
    branch: {},
  })

  const fullResult = {
    incidentDate: '2026-03-14',
    state: 'CA',
    county: 'Los Angeles',
    injurySeverity: 'serious',
    firstCare: 'er',
    careTiming: 'same_day',
    emsResponded: 'yes' as const,
    bodyParts: ['neck', 'lower_back'],
    crashType: 'rear_end',
    atFault: 'other_driver',
    policeReport: 'yes' as const,
    witnesses: 'yes' as const,
    photos: 'yes' as const,
  }

  const keysOf = (snapshot: DetectionFillSnapshot, result: Parameters<typeof planDetectionFill>[1]) =>
    planDetectionFill(snapshot, result).map(f => f.key)

  it('fills every empty field it has an answer for', () => {
    expect(keysOf(emptyForm(), fullResult)).toEqual([
      'incidentDate',
      'venue',
      'injurySeverity',
      'medicalTreatment',
      'initialCareTiming',
      'emsResponded',
      'bodyParts',
      'crashType',
      'faultParty',
      'policeReport',
      'witnesses',
      'photosVideo',
    ])
  })

  it('never overwrites an answer the claimant already gave', () => {
    const answered: DetectionFillSnapshot = {
      incidentDatePreset: 'custom',
      incidentDate: '2026-01-02',
      venue: { state: 'NV', county: 'Clark' },
      injurySeverity: 'minor',
      medicalTreatmentCount: 1,
      initialCareTiming: 'within_week',
      emsResponded: 'no',
      bodyParts: ['neck', 'lower_back'],
      branch: { crashType: 'side_impact', faultParty: 'shared', policeReport: true, witnesses: true, photosVideo: true },
    }
    expect(planDetectionFill(answered, fullResult)).toEqual([])
  })

  it('only ever turns evidence flags on, never off', () => {
    // "no" is a real answer from the narrative, but writing it would clear a box
    // the claimant cannot tell was cleared.
    const result = { ...fullResult, policeReport: 'no' as const, witnesses: 'unknown' as const }
    const keys = keysOf(emptyForm(), result)
    expect(keys).not.toContain('policeReport')
    expect(keys).not.toContain('witnesses')
    expect(keys).toContain('photosVideo')
  })

  it('drops a county that does not belong to the detected state', () => {
    const fills = planDetectionFill(emptyForm(), { state: 'CA', county: 'Clark' })
    expect(fills).toEqual([{ key: 'venue', state: 'CA', county: '' }])
  })

  it('keeps a county the state really has, however it was written', () => {
    const fills = planDetectionFill(emptyForm(), { state: 'CA', county: 'los angeles county' })
    expect(fills).toEqual([{ key: 'venue', state: 'CA', county: 'Los Angeles' }])
  })

  it('reports only the body parts it added, so undo removes only those', () => {
    const snapshot = { ...emptyForm(), bodyParts: ['neck'] }
    const fills = planDetectionFill(snapshot, { bodyParts: ['neck', 'knee'] })
    expect(fills).toEqual([{ key: 'bodyParts', parts: ['knee'] }])
  })

  it('adds nothing when every detected body part is already listed', () => {
    const snapshot = { ...emptyForm(), bodyParts: ['neck', 'knee'] }
    expect(planDetectionFill(snapshot, { bodyParts: ['knee', 'neck'] })).toEqual([])
  })

  it('survives an API still returning the older extraction shape', () => {
    // No bodyParts key at all — the previous server response.
    expect(() => planDetectionFill(emptyForm(), { crashType: 'rear_end' })).not.toThrow()
    expect(keysOf(emptyForm(), { crashType: 'rear_end' })).toEqual(['crashType'])
  })

  it('finds nothing to do in an empty extraction', () => {
    expect(planDetectionFill(emptyForm(), {})).toEqual([])
  })
})
