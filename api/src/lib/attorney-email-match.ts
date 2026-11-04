/**
 * Whether an email address plausibly belongs to a specific attorney.
 *
 * Firm websites list many addresses on one page — partners, paralegals, the
 * front desk, marketing. Taking the first one for every attorney at the firm
 * mailed invitations to the wrong person, so any address that did not come from
 * the State Bar record has to show some sign of the attorney's own name.
 *
 * Deliberately permissive about the forms people actually use: full or partial
 * names, initials, and nicknames that share a prefix with the first name
 * ("steve" for Steven). Nicknames that do not ("jack" for Hakop) will fail; the
 * cost of that is a held-back invite, not a misdirected one.
 */

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'esq'])

/** Local parts that reach a front desk or a department rather than a person. */
const SHARED_LOCAL_PARTS = new Set([
  'info', 'information', 'office', 'contact', 'contactus', 'admin', 'intake', 'reception', 'frontdesk',
  'hello', 'help', 'support', 'mail', 'law', 'legal', 'team', 'inquiries', 'inquiry', 'clients',
  'cases', 'staff', 'marketing', 'publicrelations', 'pr', 'media', 'press', 'careers', 'jobs', 'hr',
  'billing', 'accounting', 'accounts', 'webmaster', 'web', 'cc', 'service', 'office1', 'firm',
])

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function localPart(email: string): string {
  // Scraped addresses sometimes carry URL encoding from a mailto: link.
  let raw = email.split('@')[0] || ''
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  return fold(raw.trim())
}

export function isSharedInboxEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const local = localPart(email).replace(/[^a-z0-9]/g, '')
  return SHARED_LOCAL_PARTS.has(local)
}

/** Strip whitespace and URL-encoded junk scraped from mailto: links. */
export function cleanScrapedEmail(email: string | null | undefined): string | null {
  if (!email) return null
  let value = email.trim()
  try {
    value = decodeURIComponent(value)
  } catch {
    /* keep */
  }
  value = value.trim().toLowerCase()
  return /^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(value) ? value : null
}

export function emailMatchesAttorneyName(name: string | null | undefined, email: string | null | undefined): boolean {
  if (!name || !email) return false
  const local = localPart(email).replace(/[^a-z]/g, '')
  if (!local) return false
  const allParts = fold(name)
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/'/g, '')
    .split(/[\s-]+/)
    .filter((token) => token.length >= 1 && !SUFFIXES.has(token))
  const parts = allParts.filter((token) => token.length >= 2)
  if (!parts.length) return false

  const first = parts[0]
  const last = parts[parts.length - 1]

  // Any name part of three or more letters: "gray", "lieber", "angela".
  if (parts.some((token) => token.length >= 3 && local.includes(token))) return true
  // Nickname sharing the first name's opening: "steve", "matt", "nick".
  if (first.length >= 3 && local.startsWith(first.slice(0, 3))) return true
  // Initial plus surname fragment: "jlieber", "ajhel".
  if (local.startsWith(first[0]) && parts.slice(1).some((token) => token.length >= 3 && local.includes(token.slice(0, 4)))) {
    return true
  }
  // Initials, middle initials included: "jws", "jkm", "ssa", "jl".
  const initials = allParts.map((token) => token[0]).join('')
  if (initials.length >= 2 && local.startsWith(initials)) return true
  if (local === `${first[0]}${last[0]}`) return true
  return false
}
