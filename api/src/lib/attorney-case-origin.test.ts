/**
 * The provenance predicate, and the two rules that read it.
 *
 * Worth testing on its own rather than only through its callers: it is the
 * single thing standing between an imported case and being treated as a
 * consumer lead, and the cost of it returning false when it should not is
 * offering a firm's own client to a competitor.
 */
import { describe, expect, it } from 'vitest'
import { ATTORNEY_SELF_SOURCE, isAttorneyOwnedCase } from './attorney-case-origin'

describe('isAttorneyOwnedCase', () => {
  it('recognises a case the attorney created by hand', () => {
    expect(isAttorneyOwnedCase({ origin: { kind: ATTORNEY_SELF_SOURCE, origin: 'manual' } })).toBe(true)
  })

  it('recognises a case imported from the firm CMS', () => {
    expect(isAttorneyOwnedCase({ origin: { kind: ATTORNEY_SELF_SOURCE, origin: 'import' } })).toBe(true)
  })

  it('does not claim an ordinary routed case', () => {
    expect(isAttorneyOwnedCase({ plaintiffContext: { firstName: 'Dana' } })).toBe(false)
    expect(isAttorneyOwnedCase({ origin: { kind: 'plaintiff' } })).toBe(false)
  })

  /**
   * Facts arrive from a JSON column that predates this field, so most cases in
   * the database have no `origin` at all. Every one of those is a real routed
   * case and must keep behaving like one.
   */
  it('treats anything unrecognisable as not attorney-owned', () => {
    expect(isAttorneyOwnedCase(null)).toBe(false)
    expect(isAttorneyOwnedCase(undefined)).toBe(false)
    expect(isAttorneyOwnedCase('a string')).toBe(false)
    expect(isAttorneyOwnedCase(42)).toBe(false)
    expect(isAttorneyOwnedCase({})).toBe(false)
    expect(isAttorneyOwnedCase({ origin: null })).toBe(false)
    expect(isAttorneyOwnedCase({ origin: 'attorney_self' })).toBe(false)
  })
})
