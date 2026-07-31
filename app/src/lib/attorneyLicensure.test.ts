import { describe, it, expect } from 'vitest'
import { formatAttorneyLicensure, getAttorneyLicensure } from './attorneyLicensure'

describe('getAttorneyLicensure', () => {
  it('names the attorney, the firm, the bar credential, and the office city', () => {
    expect(
      getAttorneyLicensure({
        name: 'Jane Doe',
        bar_number: '123456',
        bar_state: 'CA',
        law_firm: { name: 'Doe & Associates', city: 'Los Angeles', state: 'CA' },
      })
    ).toEqual({
      licensee: 'Jane Doe, Doe & Associates',
      credential: 'CA Bar #123456',
      location: 'Los Angeles, CA',
    })
  })

  it('accepts camelCase fields from records that were not routed through the search payload', () => {
    const licensure = getAttorneyLicensure({
      name: 'Jane Doe',
      barNumber: '123456',
      barState: 'CA',
    })
    expect(licensure?.credential).toBe('CA Bar #123456')
  })

  it('omits the credential rather than inventing one', () => {
    const licensure = getAttorneyLicensure({
      name: 'Jane Doe',
      law_firm: { name: 'Doe & Associates' },
    })
    expect(licensure?.licensee).toBe('Jane Doe, Doe & Associates')
    expect(licensure?.credential).toBeNull()
    expect(licensure?.location).toBeNull()
  })

  it('reports the bar number without a state when the issuing state is unknown', () => {
    expect(getAttorneyLicensure({ name: 'Jane Doe', bar_number: '123456' })?.credential).toBe(
      'Bar #123456'
    )
  })

  it('falls back to the firm when only the firm is known', () => {
    expect(getAttorneyLicensure({ law_firm: { name: 'Doe & Associates' } })?.licensee).toBe(
      'Doe & Associates'
    )
  })

  it('returns nothing when there is nobody to name, so the caller renders no line at all', () => {
    expect(getAttorneyLicensure(null)).toBeNull()
    expect(getAttorneyLicensure(undefined)).toBeNull()
    expect(getAttorneyLicensure({})).toBeNull()
    expect(getAttorneyLicensure({ name: '   ', law_firm: { name: '' } })).toBeNull()
  })
})

describe('formatAttorneyLicensure', () => {
  it('joins the parts it has', () => {
    expect(
      formatAttorneyLicensure({
        name: 'Jane Doe',
        bar_number: '123456',
        bar_state: 'CA',
        law_firm: { name: 'Doe & Associates', city: 'Los Angeles', state: 'CA' },
      })
    ).toBe('Jane Doe, Doe & Associates · CA Bar #123456 · Los Angeles, CA')
  })

  it('skips missing parts without leaving stray separators', () => {
    expect(formatAttorneyLicensure({ name: 'Jane Doe' })).toBe('Jane Doe')
  })

  it('is null for an unnamed record', () => {
    expect(formatAttorneyLicensure({})).toBeNull()
  })
})
