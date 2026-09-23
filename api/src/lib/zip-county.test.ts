import { describe, expect, it } from 'vitest'
import { countiesForZip } from './zip-county'

describe('countiesForZip', () => {
  it('resolves a ZIP inside one county to its bare county name', () => {
    expect(countiesForZip('90210')).toEqual([{ state: 'CA', county: 'Los Angeles' }])
  })

  it('lists every county a ZIP crosses, largest share first', () => {
    const counties = countiesForZip('22030')
    expect(counties.length).toBeGreaterThan(1)
    expect(counties.every((c) => c.state === 'VA')).toBe(true)
  })

  it('keeps independent cities distinct from the county of the same name', () => {
    expect(countiesForZip('23220')).toEqual([{ state: 'VA', county: 'Richmond City' }])
  })

  it('accepts ZIP+4 and ignores surrounding whitespace', () => {
    expect(countiesForZip(' 90210-1234 ')).toEqual([{ state: 'CA', county: 'Los Angeles' }])
  })

  it('returns nothing for a malformed or unknown ZIP', () => {
    expect(countiesForZip('9021')).toEqual([])
    expect(countiesForZip('abcde')).toEqual([])
    expect(countiesForZip('00000')).toEqual([])
  })
})
