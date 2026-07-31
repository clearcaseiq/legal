/**
 * Licensure identification for any surface that presents specific attorneys to a
 * consumer.
 *
 * Business & Professions Code § 6157.2(b)(1) requires an advertisement for legal
 * services to conspicuously display the name of at least one attorney or law firm
 * licensed in the state. ClearCaseIQ itself cannot satisfy that — it is not a law
 * firm and not a certified referral service — so on the pages that do present
 * particular firms, the firms have to identify themselves. Repositioning the site
 * as a technology platform reduced the exposure; naming the licensee closes it.
 */

export type AttorneyLicensureSource = {
  name?: string | null
  bar_number?: string | null
  barNumber?: string | null
  bar_state?: string | null
  barState?: string | null
  law_firm?: { name?: string | null; city?: string | null; state?: string | null } | null
}

export type AttorneyLicensure = {
  /** e.g. "Jane Doe, Doe & Associates" */
  licensee: string
  /** e.g. "CA Bar #123456" — absent when the record has no bar number */
  credential: string | null
  /** e.g. "Los Angeles, CA" */
  location: string | null
}

function clean(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

/**
 * Never invents a credential. A missing bar number reads as missing rather than as
 * a plausible-looking placeholder, because an invented licence number on a page that
 * presents attorneys is worse than none.
 */
export function getAttorneyLicensure(
  attorney: AttorneyLicensureSource | null | undefined
): AttorneyLicensure | null {
  if (!attorney) return null

  const attorneyName = clean(attorney.name)
  const firmName = clean(attorney.law_firm?.name)
  const licensee = [attorneyName, firmName].filter(Boolean).join(', ')
  if (!licensee) return null

  const barNumber = clean(attorney.bar_number ?? attorney.barNumber)
  const barState = clean(attorney.bar_state ?? attorney.barState)
  const credential = barNumber
    ? `${barState ? `${barState} ` : ''}Bar #${barNumber}`
    : null

  const city = clean(attorney.law_firm?.city)
  const firmState = clean(attorney.law_firm?.state)
  const location = [city, firmState].filter(Boolean).join(', ') || null

  return { licensee, credential, location }
}

/** Single-line form for compact cards: "Jane Doe, Doe & Associates · CA Bar #123456 · Los Angeles, CA" */
export function formatAttorneyLicensure(
  attorney: AttorneyLicensureSource | null | undefined
): string | null {
  const licensure = getAttorneyLicensure(attorney)
  if (!licensure) return null
  return [licensure.licensee, licensure.credential, licensure.location].filter(Boolean).join(' · ')
}
