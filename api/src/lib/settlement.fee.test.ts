import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import { estimateAttorneyFee, isFeeOutstanding } from './settlement'

const bands = JSON.stringify({ median: 11000 })

describe('estimateAttorneyFee', () => {
  it('uses the predicted median and the default rate until a settlement is entered', () => {
    const fee = estimateAttorneyFee({ bands, claimType: 'auto' })
    expect(fee.gross).toBe(11000)
    expect(fee.grossIsEstimate).toBe(true)
    expect(fee.attorneyFee).toBe(3666)
  })

  it('defaults medical malpractice to 40%', () => {
    expect(estimateAttorneyFee({ bands, claimType: 'medmal' }).attorneyFee).toBe(4400)
  })

  it('follows the settlement amount the attorney entered, so a bigger settlement means a bigger fee', () => {
    const scenario = { grossAmount: 60000, contingencyPct: 33.33, feeBasis: 'gross' }
    expect(estimateAttorneyFee({ bands, claimType: 'auto', scenario }).attorneyFee).toBe(19998)
    expect(estimateAttorneyFee({ bands, claimType: 'auto', scenario: { ...scenario, grossAmount: 90000 } }).attorneyFee).toBe(29997)
  })

  it('uses the case’s own contingency rate and fee basis', () => {
    const scenario = { grossAmount: 100000, contingencyPct: 40, feeBasis: 'net_of_costs' }
    expect(estimateAttorneyFee({ bands, claimType: 'auto', scenario, costs: 10000 }).attorneyFee).toBe(36000)
  })

  it('reads band objects as well as JSON strings', () => {
    expect(estimateAttorneyFee({ bands: { median: 30000 }, claimType: 'auto' }).attorneyFee).toBe(9999)
  })
})

describe('isFeeOutstanding', () => {
  it('counts open cases', () => {
    expect(isFeeOutstanding({ status: 'active', caseStage: 'NEGOTIATION', closedAt: null })).toBe(true)
    expect(isFeeOutstanding({ settlementScenario: { status: 'finalized' } })).toBe(true)
  })

  it('drops closed cases and disbursed settlements', () => {
    expect(isFeeOutstanding({ status: 'closed' })).toBe(false)
    expect(isFeeOutstanding({ caseStage: 'CLOSED' })).toBe(false)
    expect(isFeeOutstanding({ closedAt: new Date() })).toBe(false)
    expect(isFeeOutstanding({ settlementScenario: { status: 'disbursed' } })).toBe(false)
  })
})
