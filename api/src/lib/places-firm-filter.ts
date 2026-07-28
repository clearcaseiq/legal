/**
 * Deciding which Google Places results are actually California law firms.
 *
 * A search for "personal injury attorney in Los Angeles" returns real firms mixed
 * with things that are not firms at all: lead-generation marketplaces, directory
 * listings, chiropractors and medical clinics that advertise to accident victims,
 * bail bondsmen, and the occasional insurance agency. Staging any of those as a
 * law firm is worse than missing a real firm, because a bogus firm can eventually
 * be routed a claimant.
 *
 * The filter is deliberately explicit about *why* a result was dropped. Discovery
 * quality can only be tuned by looking at what got rejected and disagreeing with
 * it, which needs a reason per rejection rather than a smaller output list.
 */

import { isExcludedDiscoveryDomain } from './ca-pi-discovery-targets'
import { extractFirmDomain } from './attorney-identity'
import type { PlaceResult } from './google-places'

export type RejectionReason =
  | 'not_operational'
  | 'outside_california'
  | 'no_website'
  | 'directory_or_aggregator'
  | 'not_a_law_office'
  | 'missing_name'

export type AcceptedFirmLocation = {
  placeId: string
  name: string
  formattedAddress: string | null
  city: string | null
  county: string | null
  state: string
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string
  websiteDomain: string
  rating: number | null
  reviewCount: number | null
  openingHours: string[] | null
  googleMapsUri: string | null
  primaryType: string | null
  types: string[]
}

export type FilterOutcome =
  | { kept: true; location: AcceptedFirmLocation }
  | { kept: false; reason: RejectionReason; placeId: string; name: string | null }

/**
 * Google place types that are definitely not a law practice.
 *
 * Medical and chiropractic clinics are the big one: they advertise heavily against
 * injury keywords because they want the same accident victims we do.
 */
const DISQUALIFYING_TYPES: ReadonlySet<string> = new Set([
  'doctor',
  'hospital',
  'physiotherapist',
  'chiropractor',
  'dentist',
  'medical_lab',
  'pharmacy',
  'insurance_agency',
  'car_repair',
  'car_dealer',
  'real_estate_agency',
  'accounting',
  'bank',
  'finance',
  'moving_company',
  'storage',
  'school',
  'university',
  'church',
  'restaurant',
])

/** Google place types consistent with a law practice. */
const LAW_TYPES: ReadonlySet<string> = new Set(['lawyer', 'legal_services', 'notary_public'])

/**
 * Names that mean a lead marketplace or directory, not a practice. These often
 * carry the `lawyer` type, so the name is what separates them.
 *
 * Strong enough to reject on their own: no working law firm calls itself a
 * referral network or a lawyer finder.
 */
const STRONG_AGGREGATOR_PATTERNS: readonly RegExp[] = [
  /\b(directory|directories)\b/i,
  /\blawyer\s*(finder|match|connect|referral)\b/i,
  /\battorney\s*(finder|match|connect|referral)\b/i,
  /\blegal\s*(match|referral|directory|marketplace)\b/i,
  /\b(find|hire|compare)\s+(a\s+)?(lawyer|attorney)\b/i,
  /\b1-?800\b/,
  /\blead\s*gen(eration)?\b/i,
  /\bmarketing\b/i,
  /\bnetwork\s+of\s+(lawyers|attorneys)\b/i,
]

/**
 * Search-engine-bait phrases, which are only evidence when nothing else says law
 * firm.
 *
 * Keyword-stuffing a Google Business Profile name breaches Google's guidelines and
 * is nevertheless everywhere in personal injury. A real practice called "Abogados
 * de Accidentes Near Me" is a firm with an aggressive marketer, not a directory,
 * so these must not reject on their own — an early version dropped exactly that
 * firm.
 */
const SEO_BAIT_PATTERNS: readonly RegExp[] = [
  /\bnear\s+me\b/i,
  /\bbest\s+(lawyers|attorneys)\b/i,
  /\btop\s+(lawyers|attorneys)\b/i,
]

/**
 * Name patterns that suggest a law practice, used when Google's typing is thin.
 *
 * Two lessons from real results are baked in here.
 *
 * "Associates" is included despite also appearing in non-legal business names.
 * "Kampf, Schiavone & Associates" — plainly a firm — was dropped without it,
 * because Google had not typed it as a lawyer and nothing else in the name said
 * law. The partner-names-plus-Associates construction is too common in this
 * profession to leave out.
 *
 * Spanish terms are included because California's personal-injury market is
 * substantially Spanish-language, and an English-only pattern list quietly
 * discards firms advertising as "Abogados de Accidentes".
 */
const LAW_NAME_PATTERNS: readonly RegExp[] = [
  /\blaw\b/i,
  /\blawyer/i,
  /\battorney/i,
  /\blegal\b/i,
  /\bcounsel\b/i,
  /\besq\b/i,
  /\bllp\b/i,
  /\bapc\b/i,
  /\bp\.?c\.?\b/i,
  /\btrial\b/i,
  /\binjury\b/i,
  /\badvocates?\b/i,
  /\b(and|&)\s+associates\b/i,
  /\bassociates\b/i,
  /\bfirm\b/i,
  // Spanish
  /\babogad[oa]s?\b/i,
  /\bbufete\b/i,
  /\blesiones\b/i,
  /\baccidentes\b/i,
]

function componentOfType(
  components: PlaceResult['addressComponents'],
  type: string
): string | null {
  if (!components) return null
  for (const component of components) {
    if (component.types?.includes(type)) {
      return component.longText ?? component.shortText ?? null
    }
  }
  return null
}

function shortComponentOfType(
  components: PlaceResult['addressComponents'],
  type: string
): string | null {
  if (!components) return null
  for (const component of components) {
    if (component.types?.includes(type)) {
      return component.shortText ?? component.longText ?? null
    }
  }
  return null
}

/**
 * Read the state from address components, falling back to the formatted address.
 *
 * The structured component is authoritative; the regex fallback exists because a
 * caller may use a thinner field mask that omits `addressComponents`.
 */
export function stateFromPlace(place: PlaceResult): string | null {
  const component = shortComponentOfType(place.addressComponents, 'administrative_area_level_1')
  if (component) return component.trim().toUpperCase()

  const formatted = place.formattedAddress ?? ''
  const match = formatted.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?(?:,|$)/)
  return match ? match[1] : null
}

/**
 * County from address components.
 *
 * Google returns it as `administrative_area_level_2`, usually as "Los Angeles
 * County". Routing stores bare county names, so the suffix is stripped here. This
 * is a genuine bonus of Places over scraping: county is the field the routing
 * engine needs and the one hardest to derive from a city name alone.
 */
export function countyFromPlace(place: PlaceResult): string | null {
  const raw = componentOfType(place.addressComponents, 'administrative_area_level_2')
  if (!raw) return null
  return raw.replace(/\s+county$/i, '').trim() || null
}

/**
 * Whether this is a directory or lead marketplace rather than a practice.
 *
 * `hasLawSignal` gates the search-bait patterns: a listing that otherwise looks
 * like a law office is treated as a firm with an aggressive marketer, not as a
 * directory.
 */
function looksLikeAggregator(name: string, domain: string, hasLawSignal: boolean): boolean {
  // The domain blocklist is authoritative — avvo.com is a directory no matter how
  // firm-like the listing name looks.
  if (isExcludedDiscoveryDomain(domain)) return true
  if (STRONG_AGGREGATOR_PATTERNS.some((pattern) => pattern.test(name))) return true
  if (!hasLawSignal && SEO_BAIT_PATTERNS.some((pattern) => pattern.test(name))) return true
  return false
}

function looksLikeLawOffice(place: PlaceResult, name: string): boolean {
  const types = place.types ?? []
  if (types.some((type) => LAW_TYPES.has(type))) return true
  if (place.primaryType && LAW_TYPES.has(place.primaryType)) return true
  return LAW_NAME_PATTERNS.some((pattern) => pattern.test(name))
}

function hasDisqualifyingType(place: PlaceResult): boolean {
  const types = [...(place.types ?? []), place.primaryType].filter(
    (type): type is string => typeof type === 'string'
  )
  // A firm legitimately typed `lawyer` alongside something else is still a firm;
  // only reject when there is no legal typing at all.
  if (types.some((type) => LAW_TYPES.has(type))) return false
  return types.some((type) => DISQUALIFYING_TYPES.has(type))
}

/**
 * Evaluate one place.
 *
 * Checks run cheapest-and-most-decisive first so the reported reason is the most
 * informative one: a permanently closed listing is reported as closed rather than
 * as missing a website.
 */
export function evaluatePlace(place: PlaceResult, options: { state?: string } = {}): FilterOutcome {
  const expectedState = (options.state ?? 'CA').toUpperCase()
  const name = place.displayName?.text?.trim() ?? null
  const placeId = place.id

  if (!name) return { kept: false, reason: 'missing_name', placeId, name }

  // Google reports CLOSED_TEMPORARILY too. Only permanent closure is disqualifying;
  // a temporarily closed firm is still a firm.
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
    if (place.businessStatus === 'CLOSED_PERMANENTLY') {
      return { kept: false, reason: 'not_operational', placeId, name }
    }
  }

  const state = stateFromPlace(place)
  if (state !== expectedState) {
    return { kept: false, reason: 'outside_california', placeId, name }
  }

  if (hasDisqualifyingType(place)) {
    return { kept: false, reason: 'not_a_law_office', placeId, name }
  }

  const website = place.websiteUri?.trim() ?? ''
  if (!website) {
    // Without a website there is no route to attorney names, which Places does
    // not supply. The listing is real but not actionable.
    return { kept: false, reason: 'no_website', placeId, name }
  }

  const websiteDomain = extractFirmDomain(website)
  if (!websiteDomain) return { kept: false, reason: 'no_website', placeId, name }

  const hasLawSignal = looksLikeLawOffice(place, name)

  if (looksLikeAggregator(name, websiteDomain, hasLawSignal)) {
    return { kept: false, reason: 'directory_or_aggregator', placeId, name }
  }

  if (!hasLawSignal) {
    return { kept: false, reason: 'not_a_law_office', placeId, name }
  }

  return {
    kept: true,
    location: {
      placeId,
      name,
      formattedAddress: place.formattedAddress ?? null,
      city: componentOfType(place.addressComponents, 'locality'),
      county: countyFromPlace(place),
      state,
      postalCode: componentOfType(place.addressComponents, 'postal_code'),
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      phone: place.nationalPhoneNumber ?? null,
      website,
      websiteDomain,
      rating: typeof place.rating === 'number' ? place.rating : null,
      reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
      primaryType: place.primaryType ?? null,
      types: place.types ?? [],
    },
  }
}

export type FilterSummary = {
  kept: AcceptedFirmLocation[]
  rejectedByReason: Record<RejectionReason, number>
  /** A few rejected names per reason, so a human can sanity-check the filter. */
  rejectedExamples: Partial<Record<RejectionReason, string[]>>
  duplicatePlaceIds: number
}

function emptyRejections(): Record<RejectionReason, number> {
  return {
    not_operational: 0,
    outside_california: 0,
    no_website: 0,
    directory_or_aggregator: 0,
    not_a_law_office: 0,
    missing_name: 0,
  }
}

/**
 * Filter and deduplicate a batch of results.
 *
 * Deduplication is by Place ID only. A firm with five offices legitimately has
 * five Place IDs and all five are kept: the office is the thing Google knows
 * about, and collapsing them here would throw away the county coverage that makes
 * a multi-office firm valuable for routing. Grouping offices into one firm happens
 * later, on normalized website domain.
 */
export function filterPlaces(
  places: readonly PlaceResult[],
  options: { state?: string; exampleLimit?: number } = {}
): FilterSummary {
  const exampleLimit = options.exampleLimit ?? 5
  const kept: AcceptedFirmLocation[] = []
  const rejectedByReason = emptyRejections()
  const rejectedExamples: Partial<Record<RejectionReason, string[]>> = {}
  const seen = new Set<string>()
  let duplicatePlaceIds = 0

  for (const place of places) {
    if (!place?.id) continue
    if (seen.has(place.id)) {
      duplicatePlaceIds += 1
      continue
    }
    seen.add(place.id)

    const outcome = evaluatePlace(place, { state: options.state })
    if (outcome.kept) {
      kept.push(outcome.location)
      continue
    }

    rejectedByReason[outcome.reason] += 1
    const examples = rejectedExamples[outcome.reason] ?? []
    if (examples.length < exampleLimit && outcome.name) {
      examples.push(outcome.name)
      rejectedExamples[outcome.reason] = examples
    }
  }

  return { kept, rejectedByReason, rejectedExamples, duplicatePlaceIds }
}

/**
 * Group office locations into firms by website domain.
 *
 * Domain is the firm identity key used everywhere else in the import pipeline
 * (see `attorney-identity.ts`), so grouping on it here means Places offices land
 * on the same firms that the bar roll and directory imports resolve to.
 */
export function groupByFirmDomain(
  locations: readonly AcceptedFirmLocation[]
): Map<string, AcceptedFirmLocation[]> {
  const byDomain = new Map<string, AcceptedFirmLocation[]>()
  for (const location of locations) {
    const list = byDomain.get(location.websiteDomain) ?? []
    list.push(location)
    byDomain.set(location.websiteDomain, list)
  }
  return byDomain
}
