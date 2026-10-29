import { describe, expect, it } from 'vitest'
import { consentHeadSnippet, parseConsentCookie, stateFor } from './cookieConsent'

/** Runs the <head> snippet against a fake window/document/navigator and returns the consent default it declared. */
function runHeadSnippet(cookie: string, gpc = false) {
  const dataLayer: unknown[][] = []
  const w: Record<string, any> = { dataLayer }
  const d = { cookie }
  const n = { globalPrivacyControl: gpc }
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'navigator', 'dataLayer', consentHeadSnippet())(w, d, n, dataLayer)
  const defaults = dataLayer.map((args) => Array.from(args)).find((args) => args[0] === 'consent' && args[1] === 'default')
  return { defaults: defaults?.[2] as Record<string, string>, adsGranted: w.__cciqAdsGranted }
}

describe('cookie consent', () => {
  it('reads only known choices from the cookie', () => {
    expect(parseConsentCookie('a=1; cciq_consent=all; b=2')).toBe('all')
    expect(parseConsentCookie('cciq_consent=analytics')).toBe('analytics')
    expect(parseConsentCookie('cciq_consent=bogus')).toBeNull()
    expect(parseConsentCookie('other=1')).toBeNull()
  })

  it('treats Global Privacy Control as an advertising opt-out whatever was stored', () => {
    expect(stateFor('all', false)).toEqual({ analytics: true, ads: true })
    expect(stateFor('all', true)).toEqual({ analytics: true, ads: false })
    expect(stateFor('analytics', false)).toEqual({ analytics: true, ads: false })
    expect(stateFor(null, false)).toEqual({ analytics: false, ads: false })
  })

  it('declares everything denied before the visitor has chosen', () => {
    const { defaults, adsGranted } = runHeadSnippet('')
    expect(defaults).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    expect(adsGranted).toBe(false)
  })

  it('declares the stored choice so returning visitors are not asked again', () => {
    expect(runHeadSnippet('cciq_consent=all').defaults).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted' })
    expect(runHeadSnippet('cciq_consent=analytics').defaults).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' })
    expect(runHeadSnippet('cciq_consent=all', true).defaults).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' })
  })
})
