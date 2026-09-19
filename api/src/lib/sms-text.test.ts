/**
 * The encoding rule is invisible in review — an en dash and a hyphen look alike
 * — so it needs a test that states the cost rather than the appearance.
 */
import { describe, expect, it } from 'vitest'
import { isGsm7, smsCost, toGsm7 } from './sms-text'

describe('toGsm7', () => {
  it('rewrites the en dash that doubled the cost of every case offer', () => {
    expect(toGsm7('Est. Value: $17k\u2013$37k')).toBe('Est. Value: $17k-$37k')
  })

  it('handles the rest of the smart punctuation an editor produces', () => {
    expect(toGsm7('\u201cdon\u2019t\u201d\u2026 100\u00a0ft \u2022 half is \u00bd')).toBe(
      '"don\'t"... 100 ft - half is 1/2'
    )
  })

  it('leaves a character it cannot map, because mangling is worse than paying', () => {
    // An emoji has no ASCII equivalent that means the same thing.
    expect(toGsm7('done \u2705')).toBe('done \u2705')
    expect(isGsm7(toGsm7('done \u2705'))).toBe(false)
  })

  it('leaves GSM-7 text untouched', () => {
    const text = 'ClearCaseIQ: New case, Los Angeles, CA.'
    expect(toGsm7(text)).toBe(text)
  })
})

describe('smsCost', () => {
  it('prices the message Mike Pence actually received', () => {
    const sent = [
      'CaseIQ: New case routed to you.',
      'Claim: Motor vehicle',
      'Location: CA, Los Angeles',
      'Est. Value: $17k\u2013$37k',
      'Evidence: See case file',
      'Liability: Moderate',
      'Reply ACCEPT CMU7Y2 to accept or DECLINE CMU7Y2 to decline. (1 hour)',
    ].join('\n')

    expect(smsCost(sent)).toEqual({ encoding: 'UCS-2', characters: 213, segments: 4 })
    // The same text, one character different, at half the price.
    expect(smsCost(toGsm7(sent))).toEqual({ encoding: 'GSM-7', characters: 213, segments: 2 })
  })

  it('uses the single-segment limit until the message needs a second', () => {
    expect(smsCost('a'.repeat(160)).segments).toBe(1)
    // Past 160 every segment gives up seven characters to the concatenation header.
    expect(smsCost('a'.repeat(161)).segments).toBe(2)
    expect(smsCost('a'.repeat(306)).segments).toBe(2)
    expect(smsCost('a'.repeat(307)).segments).toBe(3)
  })

  it('counts UCS-2 segments at 70 and then 67', () => {
    expect(smsCost('\u2705'.repeat(70)).segments).toBe(1)
    expect(smsCost('\u2705'.repeat(71)).segments).toBe(2)
  })
})
