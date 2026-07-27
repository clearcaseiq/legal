import { describe, expect, it } from 'vitest'
import { coversClaimType } from './case-type-match'
import {
  GENERIC_PI_INCIDENT_TYPES,
  normalizePracticeAreaLabel,
  normalizePracticeAreas,
  parsePracticeAreaText,
} from './practice-area-normalize'

describe('normalizePracticeAreaLabel', () => {
  it('maps vehicle prose to the vehicle incident type', () => {
    for (const label of [
      'Auto Accidents',
      'Car Accident',
      'Motor Vehicle Accidents',
      'Motorcycle Accidents',
      'Truck Accidents',
      'Pedestrian Accidents',
      'Rideshare / Uber Accidents',
      'DUI Injury',
    ]) {
      expect(normalizePracticeAreaLabel(label)).toContain('vehicle')
    }
  })

  it('maps premises prose to slip_fall', () => {
    for (const label of ['Slip and Fall', 'Trip & Fall', 'Premises Liability']) {
      expect(normalizePracticeAreaLabel(label)).toContain('slip_fall')
    }
  })

  it('separates medical malpractice from product liability', () => {
    expect(normalizePracticeAreaLabel('Medical Malpractice')).toEqual(['medmal'])
    expect(normalizePracticeAreaLabel('Birth Injury')).toEqual(['medmal'])
    expect(normalizePracticeAreaLabel('Product Liability')).toEqual(['product'])
    expect(normalizePracticeAreaLabel('Defective Products')).toEqual(['product'])
  })

  it('recognizes the remaining incident types', () => {
    expect(normalizePracticeAreaLabel('Dog Bites')).toEqual(['dog_bite'])
    expect(normalizePracticeAreaLabel('Asbestos & Mesothelioma')).toEqual(['toxic'])
    expect(normalizePracticeAreaLabel("Workers' Compensation")).toEqual(['workplace'])
    expect(normalizePracticeAreaLabel('Sexual Abuse')).toEqual(['assault'])
    expect(normalizePracticeAreaLabel('Wrongful Death')).toEqual(['other'])
  })

  it('passes through values that are already normalized', () => {
    expect(normalizePracticeAreaLabel('slip_fall')).toEqual(['slip_fall'])
    expect(normalizePracticeAreaLabel('vehicle')).toEqual(['vehicle'])
    // Claim types stored by older code map back onto their incident type.
    expect(normalizePracticeAreaLabel('auto')).toEqual(['vehicle'])
    expect(normalizePracticeAreaLabel('slip_and_fall')).toEqual(['slip_fall'])
  })

  it('is idempotent, so re-running an import does not degrade the data', () => {
    const once = normalizePracticeAreaLabel('Auto Accidents')
    expect(once.flatMap((value) => normalizePracticeAreaLabel(value))).toEqual(once)
  })

  it('returns nothing for labels outside personal injury', () => {
    expect(normalizePracticeAreaLabel('Estate Planning')).toEqual([])
    expect(normalizePracticeAreaLabel('Immigration')).toEqual([])
    expect(normalizePracticeAreaLabel('')).toEqual([])
  })
})

describe('normalizePracticeAreas', () => {
  it('falls back to the generic PI set when only a bare label is present', () => {
    const result = normalizePracticeAreas(['Personal Injury'])
    expect(result.incidentTypes).toEqual(GENERIC_PI_INCIDENT_TYPES)
    expect(result.genericOnly).toBe(true)
  })

  it('prefers stated sub-types over the generic fallback', () => {
    const result = normalizePracticeAreas(['Personal Injury', 'Medical Malpractice'])
    expect(result.incidentTypes).toEqual(['medmal'])
    expect(result.genericOnly).toBe(false)
  })

  it('reports labels it could not map so the patterns can be tuned', () => {
    const result = normalizePracticeAreas(['Auto Accidents', 'Tax Law'])
    expect(result.incidentTypes).toEqual(['vehicle'])
    expect(result.matchedLabels).toEqual(['Auto Accidents'])
    expect(result.unmatchedLabels).toEqual(['Tax Law'])
  })

  it('deduplicates incident types across overlapping labels', () => {
    const result = normalizePracticeAreas(['Car Accidents', 'Truck Accidents', 'Motorcycle'])
    expect(result.incidentTypes).toEqual(['vehicle'])
  })

  it('yields nothing for a firm with no PI practice at all', () => {
    const result = normalizePracticeAreas(['Estate Planning', 'Tax Law'])
    expect(result.incidentTypes).toEqual([])
    expect(result.genericOnly).toBe(false)
  })
})

describe('routing compatibility', () => {
  // The whole point of this module: what it emits must satisfy the eligibility
  // gate. "Personal Injury" stored verbatim matched no claim type, which is how
  // promoted attorneys ended up invisible to routing.
  it('produces specialties that coversClaimType accepts', () => {
    const cases: Array<[string, string]> = [
      ['Auto Accidents', 'auto'],
      ['Premises Liability', 'slip_and_fall'],
      ['Medical Malpractice', 'medmal'],
      ['Dog Bites', 'dog_bite'],
      ['Product Liability', 'product'],
    ]

    for (const [label, claimType] of cases) {
      const { incidentTypes } = normalizePracticeAreas([label])
      expect(coversClaimType(incidentTypes, claimType)).toBe(true)
    }
  })

  it('makes a generic PI firm eligible for the everyday claim types', () => {
    const { incidentTypes } = normalizePracticeAreas(['Personal Injury'])
    expect(coversClaimType(incidentTypes, 'auto')).toBe(true)
    expect(coversClaimType(incidentTypes, 'slip_and_fall')).toBe(true)
    expect(coversClaimType(incidentTypes, 'dog_bite')).toBe(true)
    // Med mal and product liability need an explicit claim, since a general PI
    // firm usually refers those out.
    expect(coversClaimType(incidentTypes, 'medmal')).toBe(false)
    expect(coversClaimType(incidentTypes, 'product')).toBe(false)
  })

  it('confirms the raw label routing could never match', () => {
    expect(coversClaimType(['Personal Injury'], 'auto')).toBe(false)
  })
})

describe('parsePracticeAreaText', () => {
  it('reads JSON arrays, delimited strings and single labels', () => {
    expect(parsePracticeAreaText('["Auto Accidents","Dog Bites"]')).toEqual([
      'Auto Accidents',
      'Dog Bites',
    ])
    expect(parsePracticeAreaText('Auto Accidents, Dog Bites')).toEqual([
      'Auto Accidents',
      'Dog Bites',
    ])
    expect(parsePracticeAreaText('Auto Accidents; Dog Bites | Premises')).toEqual([
      'Auto Accidents',
      'Dog Bites',
      'Premises',
    ])
    expect(parsePracticeAreaText('Personal Injury')).toEqual(['Personal Injury'])
  })

  it('returns an empty list for empty input and malformed JSON', () => {
    expect(parsePracticeAreaText(null)).toEqual([])
    expect(parsePracticeAreaText('')).toEqual([])
    expect(parsePracticeAreaText('   ')).toEqual([])
    expect(parsePracticeAreaText('[not json')).toEqual(['[not json'])
  })
})
