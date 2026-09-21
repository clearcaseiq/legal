import { describe, expect, it } from 'vitest'
import { coverageNoteKind } from './coverageNote'

describe('coverageNoteKind', () => {
  it('warns when no limit is on file, because the estimate is uncapped rather than low', () => {
    // Patrick David's case: modelled at $177k on an LA auto claim with no
    // policy limit known, so nothing capped it and the range said so nowhere.
    expect(coverageNoteKind({ policyLimitConstrained: false, policyLimit: null })).toBe('unknown')
  })

  it('reports the cap when coverage actually bit', () => {
    expect(coverageNoteKind({ policyLimitConstrained: true, policyLimit: 25_000 })).toBe('capped')
  })

  it('says nothing when the limit sits above the band, since coverage is not a constraint', () => {
    expect(coverageNoteKind({ policyLimitConstrained: false, policyLimit: 500_000 })).toBe(null)
  })

  it('treats a zero limit as no limit, not as coverage of nothing', () => {
    // An empty field that parsed to a number would otherwise silence the
    // caveat on exactly the cases that most need it.
    expect(coverageNoteKind({ policyLimitConstrained: false, policyLimit: 0 })).toBe('unknown')
    expect(coverageNoteKind({ policyLimitConstrained: false, policyLimit: undefined })).toBe('unknown')
  })

  it('reports the cap even if the limit did not come through, so the band is never silently capped', () => {
    expect(coverageNoteKind({ policyLimitConstrained: true, policyLimit: null })).toBe('capped')
  })
})
