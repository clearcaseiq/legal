/**
 * Identity and dedup keys for attorneys and law firms.
 *
 * Attorney dedup currently cascades email -> phone -> name + firm. At a few
 * thousand rows that mostly works; at California scale it does not. Shared
 * office phone numbers merge unrelated attorneys at the same firm, and common
 * names collide outright — there are many "David Kim"s on the California roll.
 *
 * A California bar number is issued once per person and never reused, so it is
 * the correct primary key for a person. For firms there is no such identifier,
 * and the registered name is unreliable (DBAs, "LLP" vs "L.L.P.", offices that
 * file separately), so the web domain is the most stable practical key.
 */

import { createHash } from 'crypto'

/**
 * Normalize a bar number to digits only.
 *
 * California bar numbers are numeric and are written many ways: "123456",
 * "#123456", "SBN 123456", "Bar No. 123456". Leading zeros are not significant,
 * so they are stripped to keep the key stable across sources.
 *
 * Returns `null` for anything that is not a plausible bar number, so a junk
 * value can never become a unique key that blocks a real one.
 */
export function normalizeBarNumber(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null

  const trimmed = digits.replace(/^0+/, '')
  // California bar numbers run from the low thousands to the high six figures.
  // Anything outside 2-7 digits is a parse error, not a bar number.
  if (trimmed.length < 2 || trimmed.length > 7) return null
  return trimmed
}

/**
 * Registrable domain for a firm, from a website URL or an email address.
 *
 * Drops `www.` and any deeper subdomain so `www.smithlaw.com`,
 * `smithlaw.com/contact` and `intake@smithlaw.com` all collapse to the same
 * key. Free mailbox providers are rejected: a solo practitioner on Gmail must
 * not merge with every other Gmail firm.
 */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'comcast.net',
  'sbcglobal.net',
  'att.net',
  'verizon.net',
  'pacbell.net',
  'earthlink.net',
  'protonmail.com',
  'proton.me',
])

/**
 * Multi-part public suffixes that appear on law-firm sites. Without these,
 * `smithlaw.co.uk` would reduce to `co.uk`.
 */
const MULTIPART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'com.au',
  'co.nz',
  'com.mx',
  'com.br',
])

export function extractFirmDomain(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return null

  let host = raw

  if (host.includes('@')) {
    host = host.slice(host.lastIndexOf('@') + 1)
  } else {
    host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    host = host.split(/[/?#]/)[0]
    if (host.includes('@')) host = host.slice(host.lastIndexOf('@') + 1)
  }

  host = host.split(':')[0].replace(/\.$/, '').trim()
  if (!host || !host.includes('.')) return null
  if (!/^[a-z0-9.-]+$/.test(host)) return null

  const labels = host.split('.').filter(Boolean)
  if (labels.length < 2) return null

  const lastTwo = labels.slice(-2).join('.')
  const keep = MULTIPART_SUFFIXES.has(lastTwo) ? 3 : 2
  if (labels.length < keep) return null

  const domain = labels.slice(-keep).join('.')
  if (FREE_EMAIL_DOMAINS.has(domain)) return null
  return domain
}

/**
 * Normalize a person's name for comparison: lowercase, diacritics removed,
 * punctuation dropped, suffixes and honorifics stripped, spaces collapsed.
 *
 * Only for fuzzy fallback matching. It is not a dedup key on its own — that is
 * the whole reason bar number exists.
 */
const NAME_NOISE = new Set([
  'jr',
  'sr',
  'ii',
  'iii',
  'iv',
  'v',
  'esq',
  'esquire',
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'jd',
  'llm',
  'apc',
  'pc',
])

export function normalizePersonName(value: string | null | undefined): string {
  const base = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!base) return ''

  return base
    .split(' ')
    .filter((token) => token.length > 0 && !NAME_NOISE.has(token))
    .join(' ')
}

/**
 * Normalize a firm name for comparison. Strips entity suffixes and the
 * boilerplate that varies between sources ("The Law Offices of Smith & Jones,
 * LLP" and "Smith and Jones" reduce to the same string).
 */
const FIRM_NOISE_PATTERNS: RegExp[] = [
  /\b(a\s+)?(professional\s+)?(law\s+)?corporation\b/g,
  /\bprofessional\s+corp\b/g,
  /\bllp\b/g,
  /\bl\s?l\s?p\b/g,
  /\bllc\b/g,
  /\bpllc\b/g,
  /\bapc\b/g,
  /\baplc\b/g,
  /\binc\b/g,
  /\bpc\b/g,
  /\bp\s?c\b/g,
  /\bltd\b/g,
  /\blaw\s+(offices?|firm|group|corporation|center)\b/g,
  /\battorneys?\s+at\s+law\b/g,
  /\bthe\s+/g,
]

export function normalizeFirmName(value: string | null | undefined): string {
  let base = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!base) return ''

  for (const pattern of FIRM_NOISE_PATTERNS) {
    base = base.replace(pattern, ' ')
  }

  // Removing "The Law Offices" from "The Law Offices of Smith & Jones" leaves a
  // dangling "of", so drop connectives left stranded at either end.
  return base
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(of|the|and)\s+/g, '')
    .replace(/\s+(of|the|and)$/g, '')
    .trim()
}

/**
 * Stable dedup hash for a staging row.
 *
 * Prefers the bar number, because a re-import of the same roll must land on the
 * same key regardless of how the person's name or address was formatted that
 * time. Falls back to a profile URL, then to normalized name plus location —
 * which is weak, and is exactly why the bar number path exists.
 */
export function buildAttorneyDedupeHash(input: {
  barNumber?: string | null
  profileUrl?: string | null
  name?: string | null
  city?: string | null
  state?: string | null
}): string {
  const barNumber = normalizeBarNumber(input.barNumber)
  if (barNumber) return sha256(`bar:${barNumber}`)

  const profileUrl = String(input.profileUrl ?? '').trim().toLowerCase()
  if (profileUrl) return sha256(`url:${profileUrl}`)

  const parts = [
    normalizePersonName(input.name),
    String(input.city ?? '').trim().toLowerCase(),
    String(input.state ?? '').trim().toLowerCase(),
  ]
  return sha256(`name:${parts.join('|')}`)
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
