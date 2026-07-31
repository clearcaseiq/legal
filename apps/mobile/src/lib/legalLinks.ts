/**
 * Canonical web URLs the app links out to. The legal pages are authored once on
 * the web and opened in the browser, so a policy update reaches both store
 * builds without shipping a release.
 */
function resolveWebUrl() {
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return 'https://www.clearcaseiq.com'
}

export const WEB_URL = resolveWebUrl()

export function webLink(path: string) {
  return `${WEB_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export const LEGAL_LINKS = {
  forgotPassword: webLink('/forgot-password'),
  terms: webLink('/terms-of-service'),
  privacy: webLink('/privacy-policy'),
  disclosures: webLink('/disclosures'),
  aiDisclosure: webLink('/disclosures#ai'),
} as const

/**
 * The § 6157.2(b) statement, shown wherever a consumer could otherwise mistake
 * the platform for their law firm. ClearCaseIQ is not a law firm in either
 * build, so the attorney app says so too — it just has no claimant to reassure
 * about representation.
 */
export const NOT_A_LAW_FIRM =
  'ClearCaseIQ is a legal technology platform. It is not a law firm, does not provide legal advice, and does not replace a licensed attorney.'

export const NOT_A_LAW_FIRM_PLAINTIFF =
  'ClearCaseIQ is a legal technology platform. It is not a law firm, does not provide legal advice, and does not replace a licensed attorney. Using this app does not create an attorney-client relationship, and your information is shared with a law firm only when you authorize it.'
