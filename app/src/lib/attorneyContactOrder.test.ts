/**
 * What the contact-order cards are willing to assert about an attorney.
 *
 * Two of the three facts the old card showed were not facts. "Replies within
 * 24h" was the column default rendered as a promise, and "Serves Los Angeles
 * County" was the *claimant's* county, never checked against the attorney. A
 * claimant choosing counsel was reading both as earned. These pin the narrower
 * claims that replaced them.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RESPONSE_TIME_HOURS,
  attorneyHandlesClaimType,
  buildMatchReasons,
  getDistinguishingLanguages,
  getPublishedRating,
  getResponseSignal,
  getServedVenue,
  promoteToFirst,
  reorderById,
  toContactOrderAttorney,
} from './attorneyContactOrder'

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

const ctx = {
  claimType: 'auto_accident',
  venueState: 'CA',
  formatClaimType: (claimType?: string) => claimType ?? '',
  resolvePhoto: (url?: string | null) => url ?? '',
}

describe('response time', () => {
  it('claims nothing at the column default, which no attorney has demonstrated', () => {
    expect(getResponseSignal({ responseTimeHours: DEFAULT_RESPONSE_TIME_HOURS }, t)).toBeNull()
  })

  it('ignores the server badge, which is derived from that same default', () => {
    const attorney = { responseTimeHours: 24, responseBadge: 'Replies within 24h' }
    expect(getResponseSignal(attorney, t)).toBeNull()
  })

  it('claims a time the attorney actively set below the default', () => {
    expect(getResponseSignal({ responseTimeHours: 4 }, t)).toBe('results.calc.responseSameDay')
    expect(getResponseSignal({ responseTimeHours: 12 }, t)).toBe('results.calc.response24h')
  })

  it('claims nothing when the field is missing or slower than the default', () => {
    expect(getResponseSignal({}, t)).toBeNull()
    expect(getResponseSignal({ responseTimeHours: 72 }, t)).toBeNull()
  })
})

describe('served venue', () => {
  it('claims the claimant\'s state only when the attorney actually lists it', () => {
    expect(getServedVenue({ venues: ['CA', 'NV'] }, 'CA')).toBe('CA')
  })

  it('falls back to the attorney\'s own venue rather than asserting the claimant\'s', () => {
    expect(getServedVenue({ venues: ['NV'] }, 'CA')).toBe('NV')
  })

  it('never invents a county, because no county-level coverage is available', () => {
    expect(getServedVenue({ venues: ['CA'] }, 'CA')).not.toMatch(/county/i)
  })

  it('falls back to the firm address, then to nothing', () => {
    expect(getServedVenue({ venues: [], law_firm: { state: 'TX' } }, 'CA')).toBe('TX')
    expect(getServedVenue({}, 'CA')).toBeNull()
  })
})

describe('practice area', () => {
  it('matches a claim type against the attorney\'s own specialties', () => {
    expect(attorneyHandlesClaimType(['auto_accident', 'premises'], 'auto_accident')).toBe(true)
    expect(attorneyHandlesClaimType(['Auto Accident'], 'auto_accident')).toBe(true)
    expect(attorneyHandlesClaimType(['medical_malpractice'], 'auto_accident')).toBe(false)
  })

  it('does not let a stray short token match everything', () => {
    expect(attorneyHandlesClaimType(['a'], 'auto_accident')).toBe(false)
  })

  it('reports the attorney\'s own practice when they do not cover this case', () => {
    const reasons = buildMatchReasons({ specialties: ['medical_malpractice'], venues: ['CA'] }, ctx, t)
    expect(reasons[0]).toBe('results.calc.handlesCases:{"specialty":"medical_malpractice"}')
  })

  it('reports this case\'s claim type when the attorney does cover it', () => {
    const reasons = buildMatchReasons({ specialties: ['auto_accident'], venues: ['CA'] }, ctx, t)
    expect(reasons[0]).toBe('results.calc.handlesCases:{"specialty":"auto_accident"}')
  })
})

describe('rating', () => {
  it('publishes nothing until a verified review backs it', () => {
    expect(getPublishedRating({ averageRating: 4.8, verifiedReviewCount: 0 })).toBeNull()
    expect(getPublishedRating({ averageRating: 0, verifiedReviewCount: 3 })).toBeNull()
  })

  it('publishes a rating backed by a verified review', () => {
    expect(getPublishedRating({ averageRating: 4.75, verifiedReviewCount: 1 })).toBe(4.8)
  })
})

describe('languages', () => {
  it('drops English, which every row defaults to and so distinguishes nobody', () => {
    expect(getDistinguishingLanguages({ languages: ['English'] })).toEqual([])
    expect(getDistinguishingLanguages({ languages: ['English', 'Spanish'] })).toEqual(['Spanish'])
  })
})

describe('a new attorney', () => {
  it('makes no unearned claim, leaving only what is really known', () => {
    const card = toContactOrderAttorney(
      {
        id: 'a1',
        name: 'Bobby Smith',
        specialties: ['auto_accident'],
        venues: ['CA'],
        responseTimeHours: 24,
        responseBadge: 'Replies within 24h',
        yearsExperience: 0,
        languages: ['English'],
        averageRating: 0,
        verifiedReviewCount: 0,
        law_firm: { name: 'Bobby Law Firm' },
      },
      ctx,
      t,
    )

    expect(card.responseSignal).toBeNull()
    expect(card.rating).toBeNull()
    expect(card.languages).toEqual([])
    expect(card.initials).toBe('BS')
    expect(card.reasons).toEqual([
      'results.calc.handlesCases:{"specialty":"auto_accident"}',
      'results.calc.servesVenue:{"venue":"CA"}',
    ])
  })
})

describe('ordering', () => {
  const order = ['a', 'b', 'c', 'd']

  it('drops a downward drag after its target', () => {
    expect(reorderById(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('drops an upward drag before its target', () => {
    expect(reorderById(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('leaves the order alone for an unknown or self target', () => {
    expect(reorderById(order, 'a', 'a')).toEqual(order)
    expect(reorderById(order, 'z', 'b')).toEqual(order)
  })

  it('promotes a first choice without disturbing the rest', () => {
    expect(promoteToFirst(order, 'c')).toEqual(['c', 'a', 'b', 'd'])
    expect(promoteToFirst(order, 'a')).toEqual(order)
  })
})
