import { describe, expect, it } from 'vitest'
import { buildAttorneyJurisdictions, readAttorneyCounties } from './attorneyJurisdictions'

describe('buildAttorneyJurisdictions', () => {
  it('carries the counties chosen for each state', () => {
    expect(
      buildAttorneyJurisdictions(['CA', 'NV'], { CA: ['Los Angeles', 'Orange'], NV: ['Clark'] })
    ).toEqual([
      { state: 'CA', counties: ['Los Angeles', 'Orange'] },
      { state: 'NV', counties: ['Clark'] },
    ])
  })

  it('sends an empty list for a state with no counties, which routing reads as statewide', () => {
    expect(buildAttorneyJurisdictions(['CA'], {})).toEqual([{ state: 'CA', counties: [] }])
  })

  it('ignores counties belonging to a state that is no longer selected', () => {
    // Deselecting a state leaves its counties in the map; sending them back
    // would resurrect coverage the user just removed.
    expect(buildAttorneyJurisdictions(['CA'], { CA: ['Orange'], NV: ['Clark'] })).toEqual([
      { state: 'CA', counties: ['Orange'] },
    ])
  })
})

describe('readAttorneyCounties', () => {
  it('round-trips stored coverage back into the form', () => {
    // The save path used to send `{ state }` alone, so opening an attorney to
    // change their name quietly widened them from two counties to all of CA.
    const stored = [{ state: 'CA', counties: ['Los Angeles', 'Orange'] }]
    expect(buildAttorneyJurisdictions(['CA'], readAttorneyCounties(stored))).toEqual(stored)
  })

  it('reads a state with no counties as an empty selection', () => {
    expect(readAttorneyCounties([{ state: 'CA', counties: [] }])).toEqual({ CA: [] })
    expect(readAttorneyCounties([{ state: 'CA' }])).toEqual({ CA: [] })
  })

  it('tolerates missing and malformed stored values', () => {
    expect(readAttorneyCounties(undefined)).toEqual({})
    expect(readAttorneyCounties(null)).toEqual({})
    expect(readAttorneyCounties([{ state: 'CA', counties: 'Orange' }])).toEqual({ CA: [] })
    expect(readAttorneyCounties([{ state: 'CA', counties: ['Orange', 42, ''] }])).toEqual({
      CA: ['Orange'],
    })
  })
})
