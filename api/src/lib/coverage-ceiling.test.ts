import { describe, expect, it } from 'vitest'
import { applyCoverageCeiling, parsePolicyLimit, resolveCoverageCeiling } from './coverage-ceiling'

describe('parsePolicyLimit', () => {
  it('reads the per-person figure from split notation', () => {
    // "100/300" is $100k per person, $300k per accident. A single claimant is
    // bounded by the first number, not the second.
    expect(parsePolicyLimit('100/300')).toBe(100000)
    expect(parsePolicyLimit('50 / 100')).toBe(50000)
    expect(parsePolicyLimit('25/50')).toBe(25000)
  })

  it('reads plain amounts however they are formatted', () => {
    expect(parsePolicyLimit(100000)).toBe(100000)
    expect(parsePolicyLimit('100000')).toBe(100000)
    expect(parsePolicyLimit('$100,000')).toBe(100000)
  })

  it('treats tokens that are not amounts as unknown', () => {
    // `state_minimum` varies by state and by year. Coercing it to a number
    // would put a made-up ceiling on a real claim.
    expect(parsePolicyLimit('state_minimum')).toBeNull()
    expect(parsePolicyLimit('commercial_policy')).toBeNull()
    expect(parsePolicyLimit('unknown')).toBeNull()
    expect(parsePolicyLimit('')).toBeNull()
    expect(parsePolicyLimit(null)).toBeNull()
    expect(parsePolicyLimit(0)).toBeNull()
  })
})

describe('resolveCoverageCeiling', () => {
  it('does not cap when no limit is known', () => {
    // The carrier is not obliged to disclose limits until a written request,
    // so most cases sit here for weeks. An unknown limit must mean no cap.
    const result = resolveCoverageCeiling({ insurance: {} })
    expect(result.ceiling).toBeNull()
    expect(result.basis).toContain('not capped')
  })

  it('caps at the defendant limit when that is all the coverage there is', () => {
    const result = resolveCoverageCeiling({ insurance: { policy_limit: 50000 } })
    expect(result.ceiling).toBe(50000)
    expect(result.defendantLimit).toBe(50000)
  })

  it('adds confirmed UM/UIM on top of the defendant limit', () => {
    // The guide's ACL example: a $120k case against a $50k policy still
    // recovers $95k when the claimant carries $45k of UIM.
    const result = resolveCoverageCeiling({ insurance: { policy_limit: 50000 } }, [
      { insuredParty: 'defendant', policyLimit: 50000 },
      { insuredParty: 'client', coverageType: 'uim', policyLimit: 45000, coverageConfirmed: true },
    ])
    expect(result.ceiling).toBe(95000)
    expect(result.underinsuredLimit).toBe(45000)
  })

  it('refuses to cap when UM/UIM exists but its amount is unknown', () => {
    // Intake captures UM/UIM as a yes/no with no figure. Capping at the
    // defendant's limit alone would understate the case, which is the worse
    // error because the number looks authoritative.
    const result = resolveCoverageCeiling({
      insurance: { policy_limit: 25000, has_um_uim_coverage: true },
    })
    expect(result.ceiling).toBeNull()
    expect(result.defendantLimit).toBe(25000)
    expect(result.basis).toContain('UM/UIM')
  })

  it('honours the yes/no answer as well as the boolean', () => {
    expect(resolveCoverageCeiling({ insurance: { policy_limit: 25000, um_uim: 'yes' } }).ceiling).toBeNull()
    expect(resolveCoverageCeiling({ insurance: { policy_limit: 25000, um_uim: 'no' } }).ceiling).toBe(25000)
    // "Not sure" is not coverage. It caps, and the gap engine chases the answer.
    expect(resolveCoverageCeiling({ insurance: { policy_limit: 25000, um_uim: 'unsure' } }).ceiling).toBe(25000)
  })

  it('ignores an unconfirmed client policy', () => {
    // An unconfirmed record is a note that someone should pull the
    // declarations page, not coverage that can be counted on.
    const result = resolveCoverageCeiling({ insurance: { policy_limit: 50000 } }, [
      { insuredParty: 'client', coverageType: 'uim', policyLimit: 45000, coverageConfirmed: false },
    ])
    expect(result.underinsuredLimit).toBeNull()
    expect(result.ceiling).toBe(50000)
  })

  it('prefers a confirmed declarations page over the claimant recollection', () => {
    const result = resolveCoverageCeiling({ insurance: { policy_limit: 25000 } }, [
      { insuredParty: 'defendant', policyLimit: 100000 },
    ])
    expect(result.defendantLimit).toBe(100000)
  })

  it('does not count MedPay toward the ceiling', () => {
    // MedPay pays medical bills regardless of fault and does not reduce the
    // third-party bodily-injury recovery, so adding it would double-count.
    const result = resolveCoverageCeiling({ insurance: { policy_limit: 50000 } }, [
      { insuredParty: 'client', coverageType: 'medpay', policyLimit: 10000, coverageConfirmed: true },
    ])
    expect(result.ceiling).toBe(50000)
  })
})

describe('applyCoverageCeiling', () => {
  it('leaves a band alone when it fits inside coverage', () => {
    const result = applyCoverageCeiling(30000, 45000, 60000, 100000)
    expect(result).toEqual({ low: 30000, expected: 45000, high: 60000, constrained: false })
  })

  it('leaves a band alone when there is no ceiling', () => {
    const result = applyCoverageCeiling(30000, 45000, 60000, null)
    expect(result.constrained).toBe(false)
    expect(result.high).toBe(60000)
  })

  it('collapses a band that sits entirely above the limit', () => {
    // A $200k case against a $50k policy is a $50k recovery, not a range that
    // straddles the limit.
    const result = applyCoverageCeiling(140000, 200000, 260000, 50000)
    expect(result).toEqual({ low: 50000, expected: 50000, high: 50000, constrained: true })
  })

  it('trims only the part of the band above the limit', () => {
    const result = applyCoverageCeiling(35000, 50000, 65000, 55000)
    expect(result.low).toBe(35000)
    expect(result.expected).toBe(50000)
    expect(result.high).toBe(55000)
    expect(result.constrained).toBe(true)
  })

  it('never inverts the band', () => {
    const result = applyCoverageCeiling(80000, 100000, 120000, 20000)
    expect(result.low).toBeLessThanOrEqual(result.expected)
    expect(result.expected).toBeLessThanOrEqual(result.high)
  })
})
