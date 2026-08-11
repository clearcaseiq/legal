import { describe, expect, it } from 'vitest'
import { buildGaps } from './case-intelligence'

function gaps(overrides: {
  facts?: Record<string, any>
  insuranceDetails?: Array<any>
  claimType?: string
  documentationMissing?: string[]
  evidence?: Set<string>
} = {}) {
  return buildGaps({
    documentationMissing: overrides.documentationMissing ?? [],
    facts: overrides.facts ?? {},
    evidence: overrides.evidence ?? new Set<string>(),
    insuranceDetails: overrides.insuranceDetails ?? [],
    primaryInjury: 'SOFT_TISSUE',
    claimType: overrides.claimType ?? 'auto',
  })
}

const openKeys = (list: ReturnType<typeof gaps>) => list.filter((g) => !g.resolved).map((g) => g.key)
const find = (list: ReturnType<typeof gaps>, key: string) => list.find((g) => g.key === key)

describe('liability evidence gap', () => {
  it('auto-crosses off when a police report is on file even if the liability tab status is stale', () => {
    const list = buildGaps({
      documentationMissing: [],
      facts: { liability: { policeReport: false } },
      evidence: new Set(['police_report']),
      insuranceDetails: [],
      primaryInjury: 'SOFT_TISSUE',
      claimType: 'auto',
      liability: {
        faultPosture: 'disputed',
        policeReportStatus: 'none',
        hasWitnesses: false,
        comparativeNegPct: 0,
        faultTheory: null,
      } as any,
    })

    expect(find(list, 'liability_evidence')?.resolved).toBe(true)
    expect(openKeys(list)).not.toContain('liability_evidence')
  })

  it('stays open when fault is contested and neither a report nor witnesses exist', () => {
    const list = buildGaps({
      documentationMissing: [],
      facts: {},
      evidence: new Set(),
      insuranceDetails: [],
      primaryInjury: 'SOFT_TISSUE',
      claimType: 'auto',
      liability: {
        faultPosture: 'disputed',
        policeReportStatus: 'none',
        hasWitnesses: false,
        comparativeNegPct: 0,
        faultTheory: null,
      } as any,
    })

    expect(find(list, 'liability_evidence')?.resolved).toBeFalsy()
    expect(openKeys(list)).toContain('liability_evidence')
  })
})

describe('coverage follow-up gaps', () => {
  it('asks only to open the claim once coverage is already confirmed', () => {
    const list = gaps({
      insuranceDetails: [
        {
          insuredParty: 'defendant',
          carrierName: 'State Farm',
          policyLimit: 100_000,
          coverageConfirmed: true,
          claimStatus: 'not_opened',
        },
      ],
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000, defendant_carrier: 'State Farm' } },
    })

    expect(find(list, 'coverage_unconfirmed')?.resolved).toBe(true)
    expect(openKeys(list)).toContain('claim_not_opened')
    expect(openKeys(list)).not.toContain('coverage_unconfirmed')
  })

  it('crosses off the open-claim gap when a claim number is already on file', () => {
    const list = gaps({
      insuranceDetails: [
        {
          insuredParty: 'defendant',
          carrierName: 'Progressive',
          policyLimit: 100_000,
          coverageConfirmed: true,
          claimStatus: 'not_opened',
        },
      ],
      facts: {
        insurance: {
          other_party_insured: 'yes',
          policy_limit: 100_000,
          defendant_carrier: 'Progressive',
          claim_number: 'PRG445566',
        },
      },
    })

    expect(find(list, 'claim_not_opened')?.resolved).toBe(true)
    expect(openKeys(list)).not.toContain('claim_not_opened')
    expect(openKeys(list)).not.toContain('coverage_unconfirmed')
  })
})

describe('first-party coverage gap', () => {
  it('is raised on an auto case before anyone has confirmed the client’s own policy', () => {
    const list = gaps({ facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } } })

    expect(openKeys(list)).toContain('first_party_coverage')
  })

  // "Coverage unclear" is precisely when UM/UIM matters most, so it should be
  // treated as critical rather than as a nice-to-have.
  it('is critical when it is unknown whether the at-fault party is insured', () => {
    const list = gaps({ facts: { insurance: { other_party_insured: 'not_sure' } } })

    const gap = find(list, 'first_party_coverage')
    expect(gap?.resolved).toBeFalsy()
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

  it('crosses off once a client-side UM/UIM or MedPay policy is confirmed', () => {
    const list = gaps({
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } },
      insuranceDetails: [
        { insuredParty: 'defendant', policyLimit: 100_000 },
        { insuredParty: 'client', coverageType: 'uim', coverageConfirmed: true },
      ],
    })

    expect(find(list, 'first_party_coverage')?.resolved).toBe(true)
    expect(openKeys(list)).not.toContain('first_party_coverage')
  })

  it('is not cleared by an unconfirmed client-side record', () => {
    const list = gaps({
      facts: { insurance: { other_party_insured: 'yes', policy_limit: 100_000 } },
      insuranceDetails: [{ insuredParty: 'client', coverageType: 'um', coverageConfirmed: false }],
    })

    expect(openKeys(list)).toContain('first_party_coverage')
  })

  it('is skipped on claim types with no first-party auto policy in play', () => {
    const list = gaps({ claimType: 'slip_and_fall', facts: { insurance: {} } })

    expect(find(list, 'first_party_coverage')).toBeUndefined()
  })

  // Severity >= 3 is what promotes a gap into a Case Coach insight, and the
  // coach only auto-creates tasks from critical/high insights.
  it('is severe enough to become an auto-created day-one task', () => {
    const gap = find(gaps({ facts: { insurance: {} } }), 'first_party_coverage')

    expect(gap?.resolved).toBeFalsy()
    expect(gap?.severity).toBeGreaterThanOrEqual(4)
    expect(gap?.valueImpact).toBe('high')
    expect(gap?.actions).toContain('assign_paralegal')
  })
})

describe('documentation checklist cross-off', () => {
  it('keeps medical records on the list as resolved once uploaded', () => {
    const list = gaps({
      documentationMissing: [],
      evidence: new Set(['medical_records', 'bills', 'police_report']),
    })

    expect(find(list, 'medical_records')?.resolved).toBe(true)
    expect(find(list, 'medical_bills')?.resolved).toBe(true)
    expect(find(list, 'police_report')?.resolved).toBe(true)
    expect(openKeys(list)).not.toContain('medical_records')
  })
})
