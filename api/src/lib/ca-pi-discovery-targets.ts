/**
 * Where and what to search when discovering California personal-injury firms.
 *
 * Shared by every discovery source (Google Places, SERP scraping) so there is one
 * curated list rather than a copy per script that drifts apart.
 *
 * Both lists are ordered by expected yield, biggest first, so `slice(0, n)` gives
 * the highest-value subset rather than an arbitrary one. That matters because
 * discovery is billed per request: the cost of a run is
 * `cities x keywords x pages`, so trimming either list is the main cost lever and
 * it should trim the least useful entries first.
 */

/**
 * California cities in rough descending population order.
 *
 * Population is a good proxy for how many PI firms a city holds, and firms in
 * large metros also serve the surrounding smaller cities, so the first few dozen
 * entries cover most of the market. Suburbs are still listed individually because
 * a firm's Google listing is pinned to its own city, and a "Los Angeles" query
 * will not reliably surface a firm whose office is registered in Glendale.
 */
export const CA_DISCOVERY_CITIES: readonly string[] = [
  'Los Angeles',
  'San Diego',
  'San Jose',
  'San Francisco',
  'Sacramento',
  'Fresno',
  'Long Beach',
  'Oakland',
  'Bakersfield',
  'Anaheim',
  'Santa Ana',
  'Riverside',
  'Stockton',
  'Irvine',
  'Chula Vista',
  'Fremont',
  'San Bernardino',
  'Modesto',
  'Fontana',
  'Santa Clarita',
  'Moreno Valley',
  'Glendale',
  'Huntington Beach',
  'Santa Rosa',
  'Oceanside',
  'Garden Grove',
  'Rancho Cucamonga',
  'Ontario',
  'Elk Grove',
  'Corona',
  'Lancaster',
  'Palmdale',
  'Salinas',
  'Pomona',
  'Hayward',
  'Escondido',
  'Torrance',
  'Sunnyvale',
  'Orange',
  'Fullerton',
  'Pasadena',
  'Thousand Oaks',
  'Visalia',
  'Simi Valley',
  'Concord',
  'Roseville',
  'Victorville',
  'Santa Clara',
  'Vallejo',
  'Berkeley',
  'El Monte',
  'Downey',
  'Costa Mesa',
  'Inglewood',
  'Carlsbad',
  'Fairfield',
  'Murrieta',
  'Temecula',
  'Antioch',
  'Richmond',
  'Ventura',
  'Daly City',
  'Norwalk',
  'Burbank',
  'San Mateo',
  'Clovis',
  'Vacaville',
  'Rialto',
  'Compton',
  'Mission Viejo',
  'South Gate',
  'West Covina',
  'Menifee',
  'Carson',
  'Santa Monica',
  'Westminster',
  'Redding',
  'Santa Barbara',
  'Chico',
  'Newport Beach',
  'San Leandro',
  'San Marcos',
  'Whittier',
  'Hawthorne',
  'Citrus Heights',
  'Tracy',
  'Alhambra',
  'Livermore',
  'Buena Park',
  'Lakewood',
  'Merced',
  'Hemet',
  'Chino',
  'Indio',
  'Redwood City',
  'Lake Forest',
  'Napa',
  'Tustin',
  'Bellflower',
  'Mountain View',
  'Chino Hills',
  'Baldwin Park',
  'Alameda',
  'Upland',
  'San Ramon',
  'Folsom',
  'Pleasanton',
  'Union City',
  'Manteca',
  'Perris',
  'Lynwood',
  'Apple Valley',
  'Redlands',
  'Turlock',
  'Milpitas',
  'Redondo Beach',
  'Rancho Cordova',
  'Yorba Linda',
  'Palo Alto',
  'Davis',
  'Camarillo',
  'Walnut Creek',
  'Pittsburg',
  'South San Francisco',
  'Yuba City',
  'San Clemente',
  'Laguna Niguel',
  'Pico Rivera',
  'Montebello',
  'Lodi',
  'Madera',
  'Santa Cruz',
  'La Habra',
  'Encinitas',
  'Monterey Park',
  'Tulare',
  'Cupertino',
  'Gardena',
  'National City',
  'Rocklin',
  'Petaluma',
  'Huntington Park',
  'San Rafael',
  'La Mesa',
  'Arcadia',
  'Fountain Valley',
  'Diamond Bar',
  'Woodland',
  'Santee',
  'Porterville',
  'Paramount',
  'Hacienda Heights',
  'Palm Desert',
  'Cerritos',
  'Watsonville',
  'Brentwood',
  'West Sacramento',
  'Novato',
  'Colton',
  'Gilroy',
  'Cathedral City',
  'Delano',
  'Yucaipa',
  'Placentia',
  'Poway',
  'Rosemead',
  'Aliso Viejo',
  'Palm Springs',
  'Cypress',
  'Azusa',
  'Covina',
  'La Mirada',
  'Rancho Santa Margarita',
  'Ceres',
  'San Luis Obispo',
  'Dublin',
  'Lincoln',
  'Newark',
  'Lompoc',
  'El Centro',
  'Danville',
  'Bell Gardens',
  'Coachella',
  'Rancho Palos Verdes',
]

/**
 * Search phrases, ordered by expected marginal yield.
 *
 * The first few are the broad terms most PI firms optimize for and will surface
 * the bulk of any city's firms. The later ones are narrower injury types that
 * mostly return firms already found by the broad terms — they exist to catch the
 * specialist who does not advertise generically, which is a real but small
 * population.
 *
 * Because every extra phrase multiplies the request count across every city, and
 * later phrases overlap heavily with earlier ones, running the first six across
 * many cities is a far better use of budget than running all of them across few.
 */
export const CA_DISCOVERY_KEYWORDS: readonly string[] = [
  'personal injury attorney',
  'personal injury law firm',
  'car accident lawyer',
  'accident attorney',
  'wrongful death attorney',
  'truck accident attorney',
  'motorcycle accident lawyer',
  'slip and fall attorney',
  'premises liability lawyer',
  'catastrophic injury lawyer',
  'brain injury lawyer',
  'spinal cord injury lawyer',
  'pedestrian accident lawyer',
  'bicycle accident lawyer',
  'rideshare accident lawyer',
  'dog bite lawyer',
  'trial lawyers personal injury',
]

/**
 * Domains that are never a law firm's own site.
 *
 * Three kinds of thing end up here: search engines and social networks, legal
 * directories and lead-generation marketplaces (Avvo, FindLaw, Justia), and
 * unrelated sites that happen to rank for injury phrases. Directories are the
 * important category — they rank extremely well for exactly these searches, and
 * treating one as a firm would create a "firm" whose business is reselling leads
 * rather than trying cases.
 */
export const EXCLUDED_DISCOVERY_DOMAINS: readonly string[] = [
  // Search engines and social networks
  'bing.com',
  'google.com',
  'duckduckgo.com',
  'yahoo.com',
  'reddit.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'wikipedia.org',
  'mapquest.com',
  // Legal directories and lead marketplaces
  'yelp.com',
  'avvo.com',
  'justia.com',
  'findlaw.com',
  'superlawyers.com',
  'lawyers.com',
  'martindale.com',
  'expertise.com',
  'lawinfo.com',
  'legalmatch.com',
  'nolo.com',
  'lawyer.com',
  'attorneys.com',
  'thebestlawyers.com',
  'bestlawyers.com',
  'threebestrated.com',
  'thumbtack.com',
  'angi.com',
  'bbb.org',
  'trustpilot.com',
  // Data brokers and unrelated
  'signalhire.com',
  'datanyze.com',
  'zoominfo.com',
  'leadnear.com',
  'crunchbase.com',
  'indeed.com',
  'glassdoor.com',
  'forbes.com',
  'microsoft.com',
  'toyota.com',
  'rockauto.com',
  'cslocallk.com',
  // Government and regulator
  'ca.gov',
  'calbar.ca.gov',
  'courts.ca.gov',
  'usa.gov',
]

const EXCLUDED_SET = new Set(EXCLUDED_DISCOVERY_DOMAINS)

/**
 * Whether a domain belongs to a directory, aggregator or other non-firm site.
 *
 * Matches subdomains too, so `losangeles.avvo.com` is excluded along with
 * `avvo.com`, but does not match by substring: `mylawyers.com` is a plausible
 * firm domain and must not be caught by the `lawyers.com` entry.
 */
export function isExcludedDiscoveryDomain(domain: string | null | undefined): boolean {
  if (!domain) return false
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '')
  if (!normalized) return false
  if (EXCLUDED_SET.has(normalized)) return true
  return EXCLUDED_DISCOVERY_DOMAINS.some((excluded) => normalized.endsWith(`.${excluded}`))
}

/**
 * Build the `city x keyword` query matrix, biggest-yield combinations first.
 *
 * Iterating keyword-outer / city-inner means an interrupted or budget-capped run
 * has covered the broadest phrase across every city rather than every phrase
 * across a handful of cities — much better coverage for the same spend.
 */
export function buildDiscoveryQueries(
  options: { cities?: readonly string[]; keywords?: readonly string[]; state?: string } = {}
): string[] {
  const cities = options.cities ?? CA_DISCOVERY_CITIES
  const keywords = options.keywords ?? CA_DISCOVERY_KEYWORDS
  const state = options.state ?? 'CA'

  const queries: string[] = []
  for (const keyword of keywords) {
    for (const city of cities) {
      queries.push(`${keyword} in ${city}, ${state}`)
    }
  }
  return queries
}
