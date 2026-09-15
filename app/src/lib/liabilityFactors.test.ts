/**
 * No claimant should read a sentence that stops mid-clause.
 *
 * The strings below are the real ones from `prediction.ts`, cut the way the old
 * 40-character cap cut them. The wet-floor case is the one that reached
 * production and prompted this.
 */
import { describe, expect, it } from 'vitest'
import { isDanglingFragment, isLegacyTruncated, presentableFactors } from './liabilityFactors'

const FULL = 'Wet floor/spill - property owner may be liable for maintenance'
/** Exactly what the old `topFactor.substring(0, 40)` produced. */
const TRUNCATED = FULL.substring(0, 40)

describe('isLegacyTruncated', () => {
  it('recognises the cut that shipped to production', () => {
    expect(TRUNCATED).toBe('Wet floor/spill - property owner may be ')
    expect(isLegacyTruncated(TRUNCATED)).toBe(true)
  })

  it('measures before trimming, since the trailing space is the evidence', () => {
    expect(isLegacyTruncated(TRUNCATED.trim())).toBe(false)
    expect(TRUNCATED.trim().length).toBe(39)
  })

  it('passes the full sentence the fix now produces', () => {
    expect(isLegacyTruncated(FULL)).toBe(false)
  })

  it('catches the mid-word cuts a word list cannot', () => {
    // Neither ends on a word, so only the length check can see these.
    expect(isLegacyTruncated('Abuse/neglect indicators - very strong li'.substring(0, 40))).toBe(true)
    expect(isLegacyTruncated('Limited liability indicators in narrative - requires further investigation'.substring(0, 40))).toBe(true)
  })
})

describe('isDanglingFragment', () => {
  it('rejects a sentence ending on an auxiliary verb', () => {
    // "be" was missing from the original list, which is why this one shipped.
    expect(isDanglingFragment('Wet floor/spill - property owner may be')).toBe(true)
  })

  it('rejects the connectives it always did', () => {
    for (const text of ['strict liability may', 'caused by the', 'evidence of']) {
      expect(isDanglingFragment(text)).toBe(true)
    }
  })

  it('accepts complete sentences', () => {
    expect(isDanglingFragment(FULL)).toBe(false)
    expect(isDanglingFragment('Rear-end collision - typically strong liability for rear driver')).toBe(false)
  })

  it('does not trip on a real word that merely contains a connective', () => {
    expect(isDanglingFragment('Injury to the tibia')).toBe(false)
    expect(isDanglingFragment('Treatment was ongoing')).toBe(false)
  })

  it('looks past trailing punctuation', () => {
    expect(isDanglingFragment('property owner may be...')).toBe(true)
    expect(isDanglingFragment('property owner may be\u2026')).toBe(true)
  })
})

describe('presentableFactors', () => {
  it('drops the damaged factor and keeps the sound one', () => {
    expect(presentableFactors([TRUNCATED, 'Police report supports the claim'])).toEqual([
      'Police report supports the claim',
    ])
  })

  it('returns nothing when every factor is damaged, so copy falls back', () => {
    expect(presentableFactors([TRUNCATED, 'strict liability may'])).toEqual([])
  })

  it('ignores non-strings rather than throwing on them', () => {
    expect(presentableFactors([null, 42, undefined, FULL])).toEqual([FULL])
  })

  it('drops blanks', () => {
    expect(presentableFactors(['', '   ', FULL])).toEqual([FULL])
  })
})
