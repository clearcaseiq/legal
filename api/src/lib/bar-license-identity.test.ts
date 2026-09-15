import { describe, expect, it } from 'vitest'
import { compareBarRecordName, earnsVerifiedBadge } from './bar-license-identity'

describe('compareBarRecordName', () => {
  it('matches the same person written the same way', () => {
    expect(compareBarRecordName('Adam D. Link', 'Adam Link').match).toBe('match')
  })

  it('matches through credentials and suffixes on one side only', () => {
    expect(compareBarRecordName('John Q. Smith III', 'John Smith, Esq.').match).toBe('match')
  })

  it('matches a reordered "Last, First" record', () => {
    expect(compareBarRecordName('Link, Adam David', 'Adam Link').match).toBe('match')
  })

  it('matches when only the surname survives a rename', () => {
    expect(compareBarRecordName('Jennifer Okonkwo', 'Jennifer Barnes').match).toBe('match')
  })

  it('flags an unrelated person holding a valid bar number', () => {
    expect(compareBarRecordName('Adam D. Link', 'Bobby Smith').match).toBe('mismatch')
  })

  it('does not match on a shared middle initial alone', () => {
    expect(compareBarRecordName('John A Doe', 'Mary A Smith').match).toBe('mismatch')
  })

  it('does not match on an honorific alone', () => {
    expect(compareBarRecordName('Dr. Alan Reyes', 'Dr. Marta Quintero').match).toBe('mismatch')
  })

  it('reaches no conclusion when the record has no name', () => {
    const result = compareBarRecordName('', 'Bobby Smith')
    expect(result.match).toBe('unknown')
    expect(result.recordName).toBeNull()
  })

  it('reaches no conclusion when the record name is punctuation only', () => {
    expect(compareBarRecordName('—', 'Bobby Smith').match).toBe('unknown')
  })

  it('reaches no conclusion when the attorney has no name on file', () => {
    expect(compareBarRecordName('Adam D. Link', null).match).toBe('unknown')
  })

  it('returns the record name verbatim for display', () => {
    expect(compareBarRecordName('Adam D. Link', 'Bobby Smith').recordName).toBe('Adam D. Link')
  })
})

describe('earnsVerifiedBadge', () => {
  it('grants the badge only for an active licence that names this attorney', () => {
    expect(earnsVerifiedBadge(true, 'match')).toBe(true)
  })

  it('withholds the badge when the names do not overlap', () => {
    expect(earnsVerifiedBadge(true, 'mismatch')).toBe(false)
  })

  it('withholds the badge when no name could be compared', () => {
    expect(earnsVerifiedBadge(true, 'unknown')).toBe(false)
  })

  it('withholds the badge when the licence is not active', () => {
    expect(earnsVerifiedBadge(false, 'match')).toBe(false)
  })
})
