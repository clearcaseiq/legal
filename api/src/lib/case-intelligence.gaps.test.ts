import { describe, expect, it } from 'vitest'
import { buildGaps } from './case-intelligence'

function gaps(overrides: {
  facts?: Record<string, any>
  insuranceDetails?: Array<any>
  claimType?: string
  documentationMissing?: string[]
} = {}) {
  return buildGaps({
    documentationMissing: overrides.documentationMissing ?? [],
    facts: overrides.facts ?? {},
    evidence: new Set<string>(),
    insuranceDetails: overrides.insuranceDetails ?? [],
    primaryInjury: 'SOFT_TISSUE',
    claimType: overrides.claimType ?? 'auto',
  })
}

const keys = (list: ReturnType<typeof gaps>) => list.map((g) => g.key)
const find = (list: ReturnType<typeof gaps>, key: string) => list.find((g) => g.key === key)

describe('first-party coverage gap', () => {
  it('is raised on an auto case before anyone has confirmed the client’s own policy', () => {
    const list = gaps({ facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } } })

    expect(keys(list)).toContain('first_party_coverage')
  })

  // "Coverage unclear" is precisely when UM/UIM matters most, so it should be
  // treated as critical rather than as a nice-to-have.
  it('is critical when it is unknown whether the at-fault party is insured', () => {
    const list = gaps({ facts: { insurance: { other_party_insured: 'not_sure' } } })

    const gap = find(list, 'first_party_coverage')
    expect(gap?.severity).toBe(5)
    expect(gap?.rationale).toContain('declarations page')
  })

  it('is critical when the at-fault party is reported uninsured', () => {
    const list = gaps({ facts: { insurance: { other_party_insured: 'no' } } })

    const gap = find(list, 'first_party_coverage')
    expect(gap?.severity).toBe(5)
    expect(gap?.rationale).toContain('UM coverage is the only realistic source')
  })

  it('is critical when the defendant carries minimum limits, because UIM carries the claim', () => {
    const list = gaps({
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 25_000 } },
      insuranceDetails: [{ insuredParty: 'defendant', policyLimit: 25_000 }],
    })

    expect(find(list, 'first_party_coverage')?.severity).toBe(5)
  })

  it('clears once a client-side UM/UIM or MedPay policy is confirmed', () => {
    const list = gaps({
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } },
      insuranceDetails: [
        { insuredParty: 'defendant', policyLimit: 100_000 },
        { insuredParty: 'client', coverageType: 'uim', coverageConfirmed: true },
      ],
    })

    expect(keys(list)).not.toContain('first_party_coverage')
  })

  it('is not cleared by an unconfirmed client-side record', () => {
    const list = gaps({
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } },
      insuranceDetails: [{ insuredParty: 'client', coverageType: 'um', coverageConfirmed: false }],
    })

    expect(keys(list)).toContain('first_party_coverage')
  })

  it('is skipped on claim types with no first-party auto policy in play', () => {
    const list = gaps({ claimType: 'slip_and_fall', facts: { insurance: {} } })

    expect(keys(list)).not.toContain('first_party_coverage')
  })

  // Severity >= 3 is what promotes a gap into a Case Coach insight, and the
  // coach only auto-creates tasks from critical/high insights.
  it('is severe enough to become an auto-created day-one task', () => {
    const gap = find(gaps({ facts: { insurance: {} } }), 'first_party_coverage')

    expect(gap?.severity).toBeGreaterThanOrEqual(4)
    expect(gap?.valueImpact).toBe('high')
    expect(gap?.actions).toContain('assign_paralegal')
  })
})
