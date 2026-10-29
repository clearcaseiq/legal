/**
 * Cookie consent for the marketing tags (Google Ads, GA4, Clarity, Meta Pixel).
 *
 * Opt-in: until a visitor accepts, Google Consent Mode runs with every storage
 * type denied, Meta's consent is revoked, and Clarity is told the same. Google
 * tags then send only cookieless pings. Tags that are not Google's read
 * nothing from Consent Mode by themselves; in the GTM container each of them
 * needs "Require additional consent" set to analytics_storage or ad_storage.
 *
 * A browser sending Global Privacy Control is treated as having opted out of
 * advertising (sale/sharing under the CCPA), whatever is stored.
 *
 * The choice lives in a first-party cookie rather than localStorage because the
 * head snippet has to read it before the container loads, ahead of any React.
 */

export const CONSENT_COOKIE = 'cciq_consent'
export const OPEN_PREFERENCES_EVENT = 'cciq:open-cookie-preferences'

/** 'all' = analytics and advertising, 'analytics' = analytics only, 'none' = neither. */
export type ConsentChoice = 'all' | 'analytics' | 'none'

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

type ConsentState = { analytics: boolean; ads: boolean }

export function stateFor(choice: ConsentChoice | null, gpc: boolean): ConsentState {
  const analytics = choice === 'all' || choice === 'analytics'
  return { analytics, ads: choice === 'all' && !gpc }
}

export function parseConsentCookie(cookie: string): ConsentChoice | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]+)`))
  const value = match?.[1]
  return value === 'all' || value === 'analytics' || value === 'none' ? value : null
}

function globalPrivacyControl(): boolean {
  return typeof navigator !== 'undefined' && (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null
  return parseConsentCookie(document.cookie)
}

export function hasGlobalPrivacyControl(): boolean {
  return globalPrivacyControl()
}

/**
 * Runs in <head> before the Meta guard and the GTM bootstrap. Declares the
 * Consent Mode defaults from the stored choice and leaves `__cciqAdsGranted`
 * for the Meta guard, so the very first tag evaluation already knows.
 */
export function consentHeadSnippet(): string {
  return (
    `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};` +
    `(function(w,d,n){var m=d.cookie.match(/(?:^|;\\s*)${CONSENT_COOKIE}=([^;]+)/),c=m&&m[1],` +
    `gpc=n.globalPrivacyControl===true,a=c==='all'||c==='analytics',ad=c==='all'&&!gpc,` +
    `A=a?'granted':'denied',D=ad?'granted':'denied';w.__cciqAdsGranted=ad;` +
    `w.gtag('consent','default',{analytics_storage:A,ad_storage:D,ad_user_data:D,ad_personalization:D,` +
    `functionality_storage:'granted',security_storage:'granted',wait_for_update:500});` +
    `w.gtag('set','ads_data_redaction',!ad);})(window,document,navigator);`
  )
}

function applyConsent(state: ConsentState, scope: Record<string, any>) {
  const A = state.analytics ? 'granted' : 'denied'
  const D = state.ads ? 'granted' : 'denied'
  if (typeof scope.gtag === 'function') {
    scope.gtag('consent', 'update', {
      analytics_storage: A,
      ad_storage: D,
      ad_user_data: D,
      ad_personalization: D,
    })
    scope.gtag('set', 'ads_data_redaction', !state.ads)
  }
  scope.__cciqAdsGranted = state.ads
  if (typeof scope.fbq === 'function' && !scope.__cciqMetaBlocked && !scope.__cciqMetaRevoked) {
    scope.fbq('consent', state.ads ? 'grant' : 'revoke')
  }
  if (typeof scope.clarity === 'function' && !scope.__cciqClarityStopped) {
    scope.clarity('consentv2', { ad_Storage: D, analytics_Storage: A })
  }
  if (Array.isArray(scope.dataLayer)) {
    scope.dataLayer.push({ event: 'cookie_consent_update', consent_analytics: state.analytics, consent_ads: state.ads })
  }
}

export function saveConsent(choice: ConsentChoice): void {
  if (typeof document === 'undefined') return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`
  applyConsent(stateFor(choice, globalPrivacyControl()), window as unknown as Record<string, any>)
}

/** Whether this document loaded the marketing container, i.e. whether there is anything to consent to. */
export function marketingTagsPresent(): boolean {
  return typeof document !== 'undefined' && document.getElementById('gtm-init') !== null
}

export function openCookiePreferences(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))
}
