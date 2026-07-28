import { describe, expect, it } from 'vitest'
import {
  countyFromPlace,
  evaluatePlace,
  filterPlaces,
  groupByFirmDomain,
  stateFromPlace,
} from './places-firm-filter'
import type { PlaceResult } from './google-places'

function firm(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return {
    id: 'ChIJtest',
    displayName: { text: 'Smith Injury Law' },
    formattedAddress: '123 Main St, Los Angeles, CA 90012, USA',
    addressComponents: [
      { longText: 'Los Angeles', shortText: 'Los Angeles', types: ['locality'] },
      { longText: 'Los Angeles County', shortText: 'Los Angeles County', types: ['administrative_area_level_2'] },
      { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
      { longText: '90012', shortText: '90012', types: ['postal_code'] },
    ],
    location: { latitude: 34.05, longitude: -118.24 },
    businessStatus: 'OPERATIONAL',
    primaryType: 'lawyer',
    types: ['lawyer', 'point_of_interest'],
    websiteUri: 'https://smithinjurylaw.com',
    nationalPhoneNumber: '(213) 555-0100',
    rating: 4.8,
    userRatingCount: 327,
    ...overrides,
  }
}

describe('stateFromPlace', () => {
  it('prefers the structured component', () => {
    expect(stateFromPlace(firm())).toBe('CA')
  })

  it('falls back to parsing the formatted address', () => {
    const place = firm({ addressComponents: undefined })
    expect(stateFromPlace(place)).toBe('CA')
  })

  it('returns null when the state cannot be determined', () => {
    expect(stateFromPlace(firm({ addressComponents: undefined, formattedAddress: 'Somewhere' }))).toBeNull()
  })
})

describe('countyFromPlace', () => {
  it('strips the County suffix to match how routing stores counties', () => {
    expect(countyFromPlace(firm())).toBe('Los Angeles')
  })

  it('returns null when Google did not supply a county', () => {
    expect(countyFromPlace(firm({ addressComponents: [] }))).toBeNull()
  })
})

describe('evaluatePlace', () => {
  it('keeps a straightforward California law firm', () => {
    const outcome = evaluatePlace(firm())
    expect(outcome.kept).toBe(true)
    if (!outcome.kept) return

    expect(outcome.location).toMatchObject({
      placeId: 'ChIJtest',
      name: 'Smith Injury Law',
      city: 'Los Angeles',
      county: 'Los Angeles',
      state: 'CA',
      websiteDomain: 'smithinjurylaw.com',
      phone: '(213) 555-0100',
      rating: 4.8,
      reviewCount: 327,
    })
  })

  it('drops permanently closed listings', () => {
    const outcome = evaluatePlace(firm({ businessStatus: 'CLOSED_PERMANENTLY' }))
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('not_operational')
  })

  it('keeps a temporarily closed firm, which is still a firm', () => {
    expect(evaluatePlace(firm({ businessStatus: 'CLOSED_TEMPORARILY' })).kept).toBe(true)
  })

  it('drops out-of-state offices', () => {
    const outcome = evaluatePlace(
      firm({
        addressComponents: [
          { longText: 'Reno', shortText: 'Reno', types: ['locality'] },
          { longText: 'Nevada', shortText: 'NV', types: ['administrative_area_level_1'] },
        ],
      })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('outside_california')
  })

  it('drops listings with no website', () => {
    // Places gives no attorney names, so the website is the only route to them.
    const outcome = evaluatePlace(firm({ websiteUri: undefined }))
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('no_website')
  })

  it('deduplicates across batches when given a shared seen set', () => {
    // The discovery script filters and stages one query at a time so an
    // interrupted run keeps its work, which only holds together if a firm already
    // staged under an earlier keyword is recognised in a later batch.
    const seen = new Set<string>()
    const first = filterPlaces([firm({ id: 'ChIJa' }), firm({ id: 'ChIJb' })], { seen })
    const second = filterPlaces([firm({ id: 'ChIJb' }), firm({ id: 'ChIJc' })], { seen })

    expect(first.kept).toHaveLength(2)
    expect(first.duplicatePlaceIds).toBe(0)
    expect(second.kept).toHaveLength(1)
    expect(second.duplicatePlaceIds).toBe(1)
    expect(seen.size).toBe(3)
  })

  it('drops directories and lead marketplaces that pose as firms', () => {
    // These rank extremely well for exactly the queries we run, and often carry
    // the `lawyer` type, so the name and domain are what separate them.
    for (const [name, website] of [
      ['Avvo', 'https://www.avvo.com'],
      ['LegalMatch', 'https://legalmatch.com'],
      ['Find A Lawyer Los Angeles', 'https://findalawyerla.example.com'],
      ['Best Lawyers Directory', 'https://bestlawyersdir.example.com'],
      ['1-800-INJURED', 'https://1800injured.example.com'],
      ['Accident Attorney Referral Network', 'https://referralnet.example.com'],
    ]) {
      const outcome = evaluatePlace(firm({ displayName: { text: name }, websiteUri: website }))
      expect(outcome.kept, name).toBe(false)
      if (outcome.kept) continue
      expect(outcome.reason, name).toBe('directory_or_aggregator')
    }
  })

  it('keeps a partner-named firm that Google failed to type as a lawyer', () => {
    // Verbatim from a live run, where this was wrongly dropped as not a law
    // office: nothing in the name said "law" and Google's typing was unhelpful.
    const outcome = evaluatePlace(
      firm({
        displayName: { text: 'Kampf, Schiavone & Associates' },
        primaryType: 'point_of_interest',
        types: ['point_of_interest', 'establishment'],
        websiteUri: 'https://kampfschiavone.example.com',
      })
    )
    expect(outcome.kept).toBe(true)
  })

  it('keeps a Spanish-language firm', () => {
    // California personal injury is heavily Spanish-language, and an English-only
    // pattern list discards these silently.
    for (const name of [
      'Abogados de Accidentes Los Angeles',
      'Bufete Jurídico Ramirez',
      'Lesiones Personales Sanchez',
    ]) {
      const outcome = evaluatePlace(
        firm({
          displayName: { text: name },
          primaryType: 'point_of_interest',
          types: ['point_of_interest'],
        })
      )
      expect(outcome.kept, name).toBe(true)
    }
  })

  it('keeps a firm that stuffs search bait into its listing name', () => {
    // Also from a live run. Keyword-stuffing a Google Business Profile breaches
    // Google's guidelines and is rife in this practice area, so it marks an
    // aggressive marketer rather than a directory.
    for (const name of [
      'Abogados de Accidentes Near Me',
      'Best Lawyers Injury Law Firm',
      'Top Attorneys Personal Injury Law',
    ]) {
      const outcome = evaluatePlace(firm({ displayName: { text: name } }))
      expect(outcome.kept, name).toBe(true)
    }
  })

  it('still drops search bait when nothing else says law firm', () => {
    const outcome = evaluatePlace(
      firm({
        displayName: { text: 'Injured Near Me' },
        primaryType: 'point_of_interest',
        types: ['point_of_interest'],
      })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('directory_or_aggregator')
  })

  it('drops a known directory domain however firm-like the name', () => {
    // The domain blocklist has to outrank the name, or a directory operating
    // under a firm-sounding brand walks straight through.
    const outcome = evaluatePlace(
      firm({ displayName: { text: 'Miller Injury Law Group' }, websiteUri: 'https://www.avvo.com/x' })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('directory_or_aggregator')
  })

  it('drops medical and chiropractic clinics that advertise to accident victims', () => {
    // These compete for the same accident victims and show up constantly in
    // injury searches.
    const outcome = evaluatePlace(
      firm({
        displayName: { text: 'Downtown Accident Injury Chiropractic' },
        primaryType: 'chiropractor',
        types: ['chiropractor', 'health'],
      })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('not_a_law_office')
  })

  it('keeps a firm typed as a lawyer alongside an unrelated type', () => {
    // Google's typing is noisy; a legal type present anywhere should win.
    const outcome = evaluatePlace(
      firm({ types: ['lawyer', 'insurance_agency'], primaryType: 'lawyer' })
    )
    expect(outcome.kept).toBe(true)
  })

  it('keeps a firm whose Google typing is thin but whose name is clearly legal', () => {
    const outcome = evaluatePlace(
      firm({
        displayName: { text: 'Rodriguez & Chen LLP' },
        primaryType: undefined,
        types: ['point_of_interest', 'establishment'],
      })
    )
    expect(outcome.kept).toBe(true)
  })

  it('drops a business with neither legal typing nor a legal name', () => {
    const outcome = evaluatePlace(
      firm({
        displayName: { text: 'Sunrise Auto Body' },
        primaryType: undefined,
        types: ['establishment'],
      })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('not_a_law_office')
  })

  it('drops listings with no name', () => {
    const outcome = evaluatePlace(firm({ displayName: undefined }))
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('missing_name')
  })

  it('reports the most decisive reason first', () => {
    // Closed and websiteless: closed is the more informative answer.
    const outcome = evaluatePlace(
      firm({ businessStatus: 'CLOSED_PERMANENTLY', websiteUri: undefined })
    )
    expect(outcome.kept).toBe(false)
    if (outcome.kept) return
    expect(outcome.reason).toBe('not_operational')
  })
})

describe('filterPlaces', () => {
  it('deduplicates by Place ID', () => {
    const summary = filterPlaces([firm(), firm(), firm({ id: 'other' })])
    expect(summary.kept).toHaveLength(2)
    expect(summary.duplicatePlaceIds).toBe(1)
  })

  it('keeps every office of a multi-office firm', () => {
    // A firm with offices in five counties is more valuable for routing, not
    // less; collapsing them here would throw away that county coverage.
    const summary = filterPlaces([
      firm({ id: 'la', addressComponents: firm().addressComponents }),
      firm({
        id: 'sd',
        addressComponents: [
          { longText: 'San Diego', shortText: 'San Diego', types: ['locality'] },
          { longText: 'San Diego County', types: ['administrative_area_level_2'] },
          { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
        ],
      }),
    ])
    expect(summary.kept).toHaveLength(2)
    expect(summary.kept.map((l) => l.county).sort()).toEqual(['Los Angeles', 'San Diego'])
  })

  it('counts rejections by reason with examples for tuning', () => {
    const summary = filterPlaces([
      firm(),
      firm({ id: 'x1', displayName: { text: 'Avvo' }, websiteUri: 'https://avvo.com' }),
      firm({ id: 'x2', websiteUri: undefined, displayName: { text: 'No Site Law' } }),
      firm({ id: 'x3', businessStatus: 'CLOSED_PERMANENTLY', displayName: { text: 'Gone Law' } }),
    ])

    expect(summary.kept).toHaveLength(1)
    expect(summary.rejectedByReason.directory_or_aggregator).toBe(1)
    expect(summary.rejectedByReason.no_website).toBe(1)
    expect(summary.rejectedByReason.not_operational).toBe(1)
    expect(summary.rejectedExamples.no_website).toEqual(['No Site Law'])
  })

  it('ignores malformed entries without an id', () => {
    const summary = filterPlaces([firm(), { id: '' } as PlaceResult])
    expect(summary.kept).toHaveLength(1)
  })
})

describe('groupByFirmDomain', () => {
  it('groups offices of one firm under a single domain', () => {
    const summary = filterPlaces([
      firm({ id: 'a', websiteUri: 'https://smithinjurylaw.com/la' }),
      firm({ id: 'b', websiteUri: 'https://www.smithinjurylaw.com/sd' }),
      firm({ id: 'c', displayName: { text: 'Other Law' }, websiteUri: 'https://otherlaw.com' }),
    ])
    const grouped = groupByFirmDomain(summary.kept)

    expect(grouped.size).toBe(2)
    expect(grouped.get('smithinjurylaw.com')).toHaveLength(2)
    expect(grouped.get('otherlaw.com')).toHaveLength(1)
  })
})
