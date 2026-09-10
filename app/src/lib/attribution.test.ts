import { beforeEach, describe, expect, it } from 'vitest'
import { captureAttribution, getAttribution } from './attribution'

const KEY = 'ccq_attribution'

beforeEach(() => {
  sessionStorage.clear()
})

describe('captureAttribution', () => {
  it('captures utm parameters and the click id', () => {
    captureAttribution('?utm_source=google&utm_medium=cpc&utm_campaign=injury&gclid=Cj0K', '', '/car-accident')

    expect(getAttribution()).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'injury',
      gclid: 'Cj0K',
      landingPath: '/car-accident',
    })
  })

  /**
   * The whole point of first touch: by the time a lead row exists the claimant
   * has navigated deep into the wizard and the campaign is long gone from the
   * URL. A second capture must not erase it.
   */
  it('keeps the first campaign when a later page has none', () => {
    captureAttribution('?utm_source=google&utm_medium=cpc', '', '/')
    captureAttribution('', '', '/assess')

    expect(getAttribution()?.utmSource).toBe('google')
  })

  it('does not let an untagged first page be overwritten by a later one', () => {
    captureAttribution('', '', '/')
    captureAttribution('?utm_source=facebook', '', '/assess')

    expect(getAttribution()).toBeUndefined()
  })

  it('records an external referrer', () => {
    captureAttribution('', 'https://www.google.com/search?q=injury+lawyer', '/')
    expect(getAttribution()?.referrer).toBe('https://www.google.com/search?q=injury+lawyer')
  })

  it('ignores our own domain as a referrer, because that is an internal hop', () => {
    captureAttribution('', `${window.location.origin}/how-it-works`, '/assess')
    expect(getAttribution()).toBeUndefined()
  })

  it('keeps secondary click ids and utm fields out of the main columns', () => {
    captureAttribution('?utm_source=google&utm_term=lawyer&fbclid=xyz', '', '/')

    expect(getAttribution()?.extra).toEqual({ utm_term: 'lawyer', fbclid: 'xyz' })
  })

  /**
   * A direct arrival still writes the marker, otherwise the next page would
   * look like a fresh visit. But there is nothing worth sending to the API.
   */
  it('marks a direct visit without producing a payload', () => {
    captureAttribution('', '', '/')

    expect(sessionStorage.getItem(KEY)).not.toBeNull()
    expect(getAttribution()).toBeUndefined()
  })

  it('bounds a hostile parameter rather than storing it whole', () => {
    captureAttribution(`?utm_campaign=${'x'.repeat(5000)}`, '', '/')
    expect(getAttribution()?.utmCampaign).toHaveLength(200)
  })
})

describe('getAttribution', () => {
  it('returns nothing before anything has been captured', () => {
    expect(getAttribution()).toBeUndefined()
  })

  it('survives a corrupted record', () => {
    sessionStorage.setItem(KEY, 'not json')
    expect(getAttribution()).toBeUndefined()
  })
})
