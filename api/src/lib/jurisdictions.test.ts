import { describe, expect, it } from 'vitest'
import {
  buildJurisdictions,
  mergeJurisdictions,
  mergeSerializedJurisdictions,
  parseJurisdictions,
  serializeJurisdictions,
} from './jurisdictions'

describe('buildJurisdictions', () => {
  it('writes counties, which is the key routing reads', () => {
    expect(buildJurisdictions({ state: 'CA', counties: ['Los Angeles'] })).toEqual([
      { state: 'CA', counties: ['Los Angeles'] },
    ])
  })

  it('uppercases the state and drops blank entries', () => {
    expect(
      buildJurisdictions({ state: ' ca ', counties: ['Orange', '', null, 'Orange'] })
    ).toEqual([{ state: 'CA', counties: ['Orange'] }])
  })

  it('keeps cities alongside counties for display', () => {
    expect(
      buildJurisdictions({ state: 'CA', counties: ['Orange'], cities: ['Irvine'] })
    ).toEqual([{ state: 'CA', counties: ['Orange'], cities: ['Irvine'] }])
  })

  it('returns null without a state, since such a value can never match', () => {
    expect(buildJurisdictions({ state: null, counties: ['Orange'] })).toBeNull()
    expect(buildJurisdictions({ state: '  ' })).toBeNull()
  })

  it('produces an empty counties list for statewide coverage', () => {
    expect(buildJurisdictions({ state: 'CA' })).toEqual([{ state: 'CA', counties: [] }])
  })
})

describe('parseJurisdictions', () => {
  it('reads the canonical shape', () => {
    expect(parseJurisdictions('[{"state":"CA","counties":["Orange"]}]')).toEqual([
      { state: 'CA', counties: ['Orange'] },
    ])
  })

  it('normalizes the legacy cities-only shape into no counties', () => {
    // Rows written before this module recorded only cities, which routing read
    // as statewide. Parsing must preserve that reading, not invent counties.
    expect(parseJurisdictions('[{"state":"CA","cities":["Irvine"]}]')).toEqual([
      { state: 'CA', counties: [], cities: ['Irvine'] },
    ])
  })

  it('survives null, malformed JSON and junk entries', () => {
    expect(parseJurisdictions(null)).toEqual([])
    expect(parseJurisdictions('not json')).toEqual([])
    expect(parseJurisdictions('{"state":"CA"}')).toEqual([])
    expect(parseJurisdictions('[null,42,{"counties":["Orange"]}]')).toEqual([])
  })
})

describe('mergeJurisdictions', () => {
  it('unions counties within a state', () => {
    expect(
      mergeJurisdictions(
        [{ state: 'CA', counties: ['Los Angeles'] }],
        [{ state: 'CA', counties: ['Orange'] }]
      )
    ).toEqual([{ state: 'CA', counties: ['Los Angeles', 'Orange'] }])
  })

  it('keeps states separate', () => {
    expect(
      mergeJurisdictions(
        [{ state: 'CA', counties: ['Orange'] }],
        [{ state: 'NV', counties: ['Clark'] }]
      )
    ).toEqual([
      { state: 'CA', counties: ['Orange'] },
      { state: 'NV', counties: ['Clark'] },
    ])
  })

  it('never narrows statewide coverage down to a single county', () => {
    // An empty counties list means statewide. A source that knows about one
    // county must not shrink an attorney who already served the whole state.
    expect(
      mergeJurisdictions([{ state: 'CA', counties: [] }], [{ state: 'CA', counties: ['Orange'] }])
    ).toEqual([{ state: 'CA', counties: [] }])
  })

  it('deduplicates case-insensitively without rewriting the stored spelling', () => {
    expect(
      mergeJurisdictions(
        [{ state: 'CA', counties: ['Los Angeles'] }],
        [{ state: 'ca', counties: ['los angeles'] }]
      )
    ).toEqual([{ state: 'CA', counties: ['Los Angeles'] }])
  })
})

describe('serializeJurisdictions', () => {
  it('returns null when there is nothing worth storing', () => {
    expect(serializeJurisdictions(null)).toBeNull()
    expect(serializeJurisdictions([])).toBeNull()
  })

  it('round-trips through parse', () => {
    const value = [{ state: 'CA', counties: ['Orange'], cities: ['Irvine'] }]
    expect(parseJurisdictions(serializeJurisdictions(value))).toEqual(value)
  })
})

describe('mergeSerializedJurisdictions', () => {
  it('widens a stored value in place', () => {
    const stored = '[{"state":"CA","counties":["Los Angeles"]}]'
    const merged = mergeSerializedJurisdictions(stored, [{ state: 'CA', counties: ['Orange'] }])
    expect(parseJurisdictions(merged)).toEqual([
      { state: 'CA', counties: ['Los Angeles', 'Orange'] },
    ])
  })

  it('leaves the stored value alone when there is nothing incoming', () => {
    const stored = '[{"state":"CA","counties":["Orange"]}]'
    expect(mergeSerializedJurisdictions(stored, [])).toBe(stored)
    expect(mergeSerializedJurisdictions(stored, null)).toBe(stored)
  })
})
