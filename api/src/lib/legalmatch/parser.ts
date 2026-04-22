import type { LegalMatchLocation, LegalMatchProfile } from './types'
import {
  firstNonEmpty,
  maybeNumber,
  normalizeWhitespace,
  sha256,
  splitFullName,
  stripHtml,
  uniqueStrings,
} from './utils'

type JsonRecord = Record<string, unknown>
type LocationMatch = { city: string | null; state: string | null; zip: string | null }

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
}

const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE))
const BAD_CITY_TOKENS = [
  'attorney',
  'law',
  'firm',
  'llc',
  'llp',
  'pc',
  'esq',
  'legalmatch',
  'college',
  'university',
  'school',
]

export function parseLegalMatchProfile(html: string, sourceUrl: string): LegalMatchProfile {
  const parseWarnings: string[] = []
  const text = stripHtml(html)
  const jsonLdNodes = extractJsonLdNodes(html)
  const structured = collectStructuredFields(jsonLdNodes)

  const titleName = normalizeWhitespace(
    firstMatch(html, /<title>\s*([^<|]+?)\s*\|\s*LegalMatch Attorney Profile\s*<\/title>/i)?.[1]
  )
  const h1Name = normalizeWhitespace(firstTagContent(html, 'h1'))
  const fullName = normalizeWhitespace(firstNonEmpty(structured.fullName, h1Name, titleName))
  if (!fullName) {
    throw new Error(`Could not parse attorney name from ${sourceUrl}`)
  }

  const fallbackLocation = extractLocationFromText(text)
  const city = normalizeWhitespace(firstNonEmpty(structured.city, fallbackLocation.city))
  const state = normalizeWhitespace(normalizeState(firstNonEmpty(structured.state, fallbackLocation.state)))
  const zip = normalizeWhitespace(firstNonEmpty(structured.zip, fallbackLocation.zip))

  const specialties = uniqueStrings([
    ...structured.specialties,
    ...extractPracticeAreas(html),
  ])

  const languages = uniqueStrings(structured.languages)
  const locations = compactLocations([
    structured.location,
    city || state || zip ? { city, state, zip, phone: structured.phone } : null,
  ])

  const bio = firstNonEmpty(
    structured.description,
    extractMetaDescription(html),
    extractBiographyParagraph(html)
  )

  const phone = normalizeWhitespace(firstNonEmpty(structured.phone, extractPhoneFromHtml(html), extractPhone(text))) || null
  const email = normalizeWhitespace(firstNonEmpty(structured.email, extractEmailFromHtml(html), extractEmail(text)))
  const website = normalizeWhitespace(firstNonEmpty(structured.website, extractWebsite(html), extractWebsiteFromText(text)))
  const photoUrl = normalizeWhitespace(firstNonEmpty(structured.photoUrl, extractImageUrl(html)))

  const yearsExperience = firstNonEmpty(
    structured.yearsExperience,
    extractYearsExperience(text),
    extractYearsExperience(String(bio ?? ''))
  )

  const { firstName, lastName } = splitFullName(fullName)

  if (!city || !state) {
    parseWarnings.push('Location could not be confidently parsed from the profile.')
  }
  if (specialties.length === 0) {
    parseWarnings.push('No practice areas were found on the profile page.')
  }

  return {
    sourceUrl,
    sourceUrlHash: sha256(sourceUrl),
    externalId: extractExternalIdFromUrl(sourceUrl),
    rawContentHash: sha256(html),
    fullName,
    firstName,
    lastName,
    firmName: normalizeWhitespace(structured.firmName),
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    phone: sanitizePhone(phone) || undefined,
    email: email || undefined,
    website: website || undefined,
    photoUrl: photoUrl || undefined,
    bio: normalizeWhitespace(bio) || undefined,
    specialties,
    languages,
    averageRating: structured.averageRating ?? undefined,
    totalReviews: structured.totalReviews ?? undefined,
    yearsExperience: yearsExperience ?? undefined,
    locations,
    parseWarnings,
    sourcePayload: {
      parsedAt: new Date().toISOString(),
      fullName,
      city: city || null,
      state: state || null,
      specialties,
      structuredDataCount: jsonLdNodes.length,
    },
  }
}

function collectStructuredFields(nodes: JsonRecord[]) {
  const personLike = nodes.find((node) => hasType(node, ['Person', 'Attorney']))
  const orgLike = nodes.find((node) => hasType(node, ['Organization', 'LegalService', 'LocalBusiness']))
  const aggregateRating =
    asRecord(personLike?.aggregateRating) ??
    asRecord(orgLike?.aggregateRating) ??
    nodes.find((node) => hasType(node, ['AggregateRating']))

  const address = asRecord(personLike?.address) ?? asRecord(orgLike?.address)
  const worksFor = asRecord(personLike?.worksFor)

  return {
    fullName: stringValue(personLike?.name) ?? stringValue(orgLike?.founder),
    firmName: stringValue(worksFor?.name) ?? stringValue(orgLike?.name),
    phone: stringValue(personLike?.telephone) ?? stringValue(orgLike?.telephone),
    email: stringValue(personLike?.email) ?? stringValue(orgLike?.email),
    website: externalUrl(stringValue(orgLike?.url) ?? stringValue(personLike?.url)),
    photoUrl: stringValue(personLike?.image) ?? stringValue(orgLike?.image),
    description: stringValue(personLike?.description) ?? stringValue(orgLike?.description),
    city: stringValue(address?.addressLocality),
    state: stringValue(address?.addressRegion),
    zip: stringValue(address?.postalCode),
    averageRating: maybeNumber(aggregateRating && aggregateRating.ratingValue),
    totalReviews: maybeNumber(aggregateRating && (aggregateRating.reviewCount ?? aggregateRating.ratingCount)),
    yearsExperience: maybeNumber(personLike?.yearsOfExperience) ?? maybeNumber(orgLike?.yearsOfExperience),
    specialties: uniqueStrings([
      ...arrayValues(personLike?.knowsAbout),
      ...arrayValues(personLike?.areaServed),
      ...arrayValues(orgLike?.areaServed),
      ...arrayValues(orgLike?.knowsAbout),
      ...arrayValues(orgLike?.serviceType),
    ]),
    languages: uniqueStrings([
      ...arrayValues(personLike?.knowsLanguage),
      ...arrayValues(orgLike?.knowsLanguage),
    ]),
    location: compactLocations([
      address
        ? {
            address: stringValue(address.streetAddress),
            city: stringValue(address.addressLocality),
            state: stringValue(address.addressRegion),
            zip: stringValue(address.postalCode),
            phone: stringValue(personLike?.telephone) ?? stringValue(orgLike?.telephone),
          }
        : null,
    ])[0] ?? null,
  }
}

function extractJsonLdNodes(html: string) {
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  )
  const nodes: JsonRecord[] = []

  for (const match of matches) {
    const raw = match[1]?.trim()
    if (!raw) continue
    try {
      collectJsonRecords(JSON.parse(raw), nodes)
    } catch {
      // Ignore malformed JSON-LD blocks and let heuristics handle the rest.
    }
  }

  return nodes
}

function collectJsonRecords(value: unknown, result: JsonRecord[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonRecords(item, result))
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as JsonRecord
  result.push(record)
  for (const nested of Object.values(record)) {
    collectJsonRecords(nested, result)
  }
}

function hasType(value: unknown, types: string[]) {
  const record = asRecord(value)
  if (!record) return false
  const rawType = record['@type']
  const candidates = Array.isArray(rawType) ? rawType : [rawType]
  return candidates.some((entry) => typeof entry === 'string' && types.includes(entry))
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return normalizeWhitespace(value)
  return null
}

function arrayValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => arrayValues(entry))
  }
  if (typeof value === 'string') return [normalizeWhitespace(value)]
  if (value && typeof value === 'object') {
    const record = value as JsonRecord
    return uniqueStrings([
      stringValue(record.name),
      stringValue(record['@id']),
      stringValue(record.addressLocality),
      stringValue(record.addressRegion),
    ])
  }
  return []
}

function extractPracticeAreas(html: string) {
  const listHtml = firstMatch(
    html,
    /Practice Areas[\s\S]{0,1200}?<ul[^>]*>([\s\S]*?)<\/ul>/i
  )?.[1]

  if (!listHtml) return []

  return uniqueStrings(
    Array.from(listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi), (match) =>
      normalizeWhitespace(stripHtml(match[1]))
    )
  )
}

function extractMetaDescription(html: string) {
  return normalizeWhitespace(
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
  )
}

function extractBiographyParagraph(html: string) {
  const paragraphs = Array.from(
    html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
    (match) => normalizeWhitespace(stripHtml(match[1]))
  ).filter((paragraph) => paragraph.length > 80)

  return paragraphs[0] ?? null
}

function extractLocationFromText(text: string) {
  const normalized = normalizeWhitespace(text)
  const patterns = [
    /\b\d+\s+reviews?\s*([A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+)*)\s*,?\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+(\d{5}(?:-\d{4})?))?\b/g,
    /\b([A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+)*),\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+(\d{5}(?:-\d{4})?))?\b/g,
    /\b([A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+)*)\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?\b/g,
  ]

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const location = normalizeLocationMatch(match[1], match[2], match[3])
      if (location) return location
    }
  }

  const stateOnlyPatterns = [
    /\b\d+\s+reviews?\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    /\bPractice Areas\s+([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  ]

  for (const pattern of stateOnlyPatterns) {
    for (const match of normalized.matchAll(pattern)) {
      const state = normalizeStateCandidate(match[1])
      if (state) {
        return { city: null, state, zip: null }
      }
    }
  }

  return { city: null, state: null, zip: null }
}

function extractPhoneFromHtml(html: string) {
  const telHref = firstMatch(html, /href=["']tel:([^"']+)["']/i)?.[1]
  if (telHref) return normalizeWhitespace(decodeURIComponent(telHref))
  return null
}

function extractPhone(text: string) {
  return firstMatch(text, /(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/)?.[1] ?? null
}

function extractEmailFromHtml(html: string) {
  const mailtoHref = firstMatch(html, /href=["']mailto:([^"']+)["']/i)?.[1]
  if (!mailtoHref) return null
  return mailtoHref.split('?')[0]?.trim() || null
}

function extractEmail(text: string) {
  return firstMatch(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ?? null
}

function extractWebsite(html: string) {
  const links = Array.from(
    html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
    (match) => ({
      href: normalizeWebsiteCandidate(match[1]),
      text: normalizeWhitespace(stripHtml(match[2])),
    })
  )

  const prioritized = [
    ...links.filter((link) => /view website|website|visit/i.test(link.text)),
    ...links.filter((link) => !/view website|website|visit/i.test(link.text)),
  ]

  for (const link of prioritized) {
    const normalized = link.href
    if (!normalized || /^mailto:/i.test(normalized) || /^tel:/i.test(normalized)) continue
    if (isLegalMatchOwnedUrl(normalized) || isIgnoredExternalUrl(normalized)) continue
    if (/^https?:\/\//i.test(normalized)) return normalized
  }
  return null
}

function extractWebsiteFromText(text: string) {
  const candidate =
    firstMatch(text, /\b((?:https?:\/\/|www\.)[^\s)]+)\b/i)?.[1] ??
    firstMatch(text, /\b([A-Z0-9.-]+\.[A-Z]{2,}(?:\/[^\s)]*)?)\b/i)?.[1]
  const normalized = normalizeWebsiteCandidate(candidate)
  if (!normalized || isLegalMatchOwnedUrl(normalized) || isIgnoredExternalUrl(normalized)) {
    return null
  }
  return normalized
}

function externalUrl(value: string | null) {
  if (!value || isLegalMatchOwnedUrl(value)) return null
  return value
}

function extractImageUrl(html: string) {
  return (
    firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    null
  )
}

function extractYearsExperience(text: string) {
  const match =
    firstMatch(text, /\bfor\s+(\d+)\s+years\b/i) ??
    firstMatch(text, /\bover\s+(\d+)\s+years\b/i)
  return maybeNumber(match?.[1])
}

function sanitizePhone(value: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  if (digits === '8669534259') return null
  return value
}

function isLegalMatchOwnedUrl(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('legalmatch')) return true
  try {
    const parsed = new URL(value)
    return /(^|\.)legalmatch/i.test(parsed.hostname)
  } catch {
    return /legalmatch/i.test(value)
  }
}

function isIgnoredExternalUrl(value: string) {
  const normalized = value.toLowerCase()
  return [
    'facebook.com',
    'linkedin.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'youtube.com',
    'privacy.truste.com',
  ].some((domain) => normalized.includes(domain))
}

function firstTagContent(html: string, tag: string) {
  return firstMatch(html, new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? null
}

function firstMatch(input: string, pattern: RegExp) {
  return pattern.exec(input)
}

function extractExternalIdFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/i, '') ?? null
  } catch {
    return null
  }
}

function compactLocations(locations: Array<LegalMatchLocation | null | undefined>) {
  return locations
    .filter((location): location is LegalMatchLocation => Boolean(location))
    .filter((location) =>
      Boolean(location.address || location.city || location.state || location.zip || location.phone)
    )
}

function normalizeState(value: string | null) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const upper = normalized.toUpperCase()
  if (STATE_CODES.has(upper)) return upper

  return STATE_NAME_TO_CODE[normalized.toLowerCase()] ?? null
}

function normalizeLocationMatch(cityCandidate: string, stateCandidate: string, zipCandidate?: string): LocationMatch | null {
  const state = normalizeStateCandidate(stateCandidate)
  const city = normalizeWhitespace(cityCandidate)
  if (!state || !city || isBadCityCandidate(city)) return null

  return {
    city,
    state,
    zip: normalizeWhitespace(zipCandidate),
  }
}

function isBadCityCandidate(value: string) {
  const normalized = value.toLowerCase()
  return BAD_CITY_TOKENS.some((token) => normalized === token || normalized.includes(` ${token}`))
}

function normalizeWebsiteCandidate(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^www\./i.test(normalized)) return `https://${normalized}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(normalized)) return `https://${normalized}`
  return normalized
}

function normalizeStateCandidate(value: string | null) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const direct = normalizeState(normalized)
  if (direct) return direct

  const parts = normalized.split(/\s+/)
  for (let length = parts.length - 1; length >= 1; length -= 1) {
    const candidate = normalizeState(parts.slice(0, length).join(' '))
    if (candidate) return candidate
  }

  return null
}
