/**
 * California county reference data and resolution.
 *
 * Routing eligibility is decided against `AttorneyProfile.jurisdictions`, whose
 * `counties` array must contain canonical county names — a case in "Los Angeles"
 * will not match an attorney who stored "LA County" or "los angeles co.". This
 * module is the single place that turns messy inbound location text into one of
 * the 58 canonical names, or admits it cannot.
 *
 * Deliberate limitation: `CITY_TO_COUNTY` covers the cities where law offices
 * actually cluster, not all ~480 incorporated places. An unmapped city returns
 * `null` so the record gets flagged for resolution rather than silently filed
 * under the wrong county. Backfilling the long tail should come from an
 * authoritative crosswalk (Census place-to-county or USPS ZIP-to-county), not
 * from extending this list by hand.
 */

/** The 58 California counties, canonically spelled. */
export const CA_COUNTIES = [
  'Alameda',
  'Alpine',
  'Amador',
  'Butte',
  'Calaveras',
  'Colusa',
  'Contra Costa',
  'Del Norte',
  'El Dorado',
  'Fresno',
  'Glenn',
  'Humboldt',
  'Imperial',
  'Inyo',
  'Kern',
  'Kings',
  'Lake',
  'Lassen',
  'Los Angeles',
  'Madera',
  'Marin',
  'Mariposa',
  'Mendocino',
  'Merced',
  'Modoc',
  'Mono',
  'Monterey',
  'Napa',
  'Nevada',
  'Orange',
  'Placer',
  'Plumas',
  'Riverside',
  'Sacramento',
  'San Benito',
  'San Bernardino',
  'San Diego',
  'San Francisco',
  'San Joaquin',
  'San Luis Obispo',
  'San Mateo',
  'Santa Barbara',
  'Santa Clara',
  'Santa Cruz',
  'Shasta',
  'Sierra',
  'Siskiyou',
  'Solano',
  'Sonoma',
  'Stanislaus',
  'Sutter',
  'Tehama',
  'Trinity',
  'Tulare',
  'Tuolumne',
  'Ventura',
  'Yolo',
  'Yuba',
] as const

export type CaCounty = (typeof CA_COUNTIES)[number]

/** Lowercased canonical name -> canonical name. */
const CANONICAL_BY_KEY = new Map<string, string>(
  CA_COUNTIES.map((county) => [county.toLowerCase(), county])
)

/**
 * Abbreviations and common misspellings seen in directory and bar data.
 * Keys are already normalized (lowercase, punctuation stripped, single spaces).
 */
const COUNTY_ALIASES: Record<string, string> = {
  la: 'Los Angeles',
  'los angelos': 'Los Angeles',
  'los angles': 'Los Angeles',
  sf: 'San Francisco',
  'san fran': 'San Francisco',
  frisco: 'San Francisco',
  sd: 'San Diego',
  oc: 'Orange',
  'orange co': 'Orange',
  sb: 'San Bernardino',
  'san bernadino': 'San Bernardino',
  'san bernardio': 'San Bernardino',
  slo: 'San Luis Obispo',
  'contra costra': 'Contra Costa',
  'santa clarita': 'Los Angeles',
  'el dorado hills': 'El Dorado',
}

/**
 * Cities and neighborhoods to counties, for the dominant California legal
 * markets. Keys are normalized the same way as county lookups.
 */
const CITY_TO_COUNTY: Record<string, string> = {
  // Los Angeles County
  'los angeles': 'Los Angeles',
  'long beach': 'Los Angeles',
  glendale: 'Los Angeles',
  pasadena: 'Los Angeles',
  'south pasadena': 'Los Angeles',
  'santa monica': 'Los Angeles',
  torrance: 'Los Angeles',
  burbank: 'Los Angeles',
  'beverly hills': 'Los Angeles',
  'woodland hills': 'Los Angeles',
  encino: 'Los Angeles',
  'sherman oaks': 'Los Angeles',
  'van nuys': 'Los Angeles',
  'century city': 'Los Angeles',
  'el segundo': 'Los Angeles',
  'culver city': 'Los Angeles',
  inglewood: 'Los Angeles',
  downey: 'Los Angeles',
  whittier: 'Los Angeles',
  pomona: 'Los Angeles',
  lancaster: 'Los Angeles',
  palmdale: 'Los Angeles',
  'marina del rey': 'Los Angeles',
  'manhattan beach': 'Los Angeles',
  'redondo beach': 'Los Angeles',
  'hermosa beach': 'Los Angeles',
  cerritos: 'Los Angeles',
  arcadia: 'Los Angeles',
  alhambra: 'Los Angeles',
  'monterey park': 'Los Angeles',
  'west covina': 'Los Angeles',
  covina: 'Los Angeles',
  norwalk: 'Los Angeles',
  compton: 'Los Angeles',
  carson: 'Los Angeles',
  gardena: 'Los Angeles',
  hawthorne: 'Los Angeles',
  lakewood: 'Los Angeles',
  bellflower: 'Los Angeles',
  montebello: 'Los Angeles',
  'santa fe springs': 'Los Angeles',
  'diamond bar': 'Los Angeles',
  calabasas: 'Los Angeles',
  'agoura hills': 'Los Angeles',
  tarzana: 'Los Angeles',
  'studio city': 'Los Angeles',
  'north hollywood': 'Los Angeles',
  hollywood: 'Los Angeles',
  westwood: 'Los Angeles',
  'san pedro': 'Los Angeles',
  'rancho palos verdes': 'Los Angeles',
  glendora: 'Los Angeles',
  claremont: 'Los Angeles',
  monrovia: 'Los Angeles',
  'san gabriel': 'Los Angeles',
  'san marino': 'Los Angeles',
  'la canada flintridge': 'Los Angeles',
  northridge: 'Los Angeles',
  chatsworth: 'Los Angeles',
  'canoga park': 'Los Angeles',
  'granada hills': 'Los Angeles',
  'el monte': 'Los Angeles',
  'baldwin park': 'Los Angeles',
  'huntington park': 'Los Angeles',
  'south gate': 'Los Angeles',
  'la mirada': 'Los Angeles',
  'westlake village': 'Los Angeles',

  // Orange County
  'santa ana': 'Orange',
  anaheim: 'Orange',
  irvine: 'Orange',
  'newport beach': 'Orange',
  'costa mesa': 'Orange',
  orange: 'Orange',
  fullerton: 'Orange',
  'huntington beach': 'Orange',
  'garden grove': 'Orange',
  'mission viejo': 'Orange',
  'laguna beach': 'Orange',
  'laguna hills': 'Orange',
  'laguna niguel': 'Orange',
  'lake forest': 'Orange',
  tustin: 'Orange',
  westminster: 'Orange',
  brea: 'Orange',
  yorba: 'Orange',
  'yorba linda': 'Orange',
  'buena park': 'Orange',
  'aliso viejo': 'Orange',
  'dana point': 'Orange',
  'san clemente': 'Orange',
  'san juan capistrano': 'Orange',
  'rancho santa margarita': 'Orange',
  'fountain valley': 'Orange',
  cypress: 'Orange',
  'la habra': 'Orange',
  placentia: 'Orange',
  'seal beach': 'Orange',

  // San Diego County
  'san diego': 'San Diego',
  carlsbad: 'San Diego',
  oceanside: 'San Diego',
  escondido: 'San Diego',
  chula: 'San Diego',
  'chula vista': 'San Diego',
  'el cajon': 'San Diego',
  'la jolla': 'San Diego',
  'del mar': 'San Diego',
  encinitas: 'San Diego',
  poway: 'San Diego',
  vista: 'San Diego',
  'san marcos': 'San Diego',
  coronado: 'San Diego',
  'national city': 'San Diego',
  'solana beach': 'San Diego',
  'rancho bernardo': 'San Diego',

  // San Francisco / Bay Area
  'san francisco': 'San Francisco',
  oakland: 'Alameda',
  berkeley: 'Alameda',
  fremont: 'Alameda',
  hayward: 'Alameda',
  alameda: 'Alameda',
  pleasanton: 'Alameda',
  livermore: 'Alameda',
  dublin: 'Alameda',
  emeryville: 'Alameda',
  'san leandro': 'Alameda',
  newark: 'Alameda',
  'union city': 'Alameda',
  'walnut creek': 'Contra Costa',
  concord: 'Contra Costa',
  richmond: 'Contra Costa',
  danville: 'Contra Costa',
  'san ramon': 'Contra Costa',
  antioch: 'Contra Costa',
  martinez: 'Contra Costa',
  lafayette: 'Contra Costa',
  orinda: 'Contra Costa',
  pittsburg: 'Contra Costa',
  'pleasant hill': 'Contra Costa',
  'san jose': 'Santa Clara',
  'palo alto': 'Santa Clara',
  'santa clara': 'Santa Clara',
  sunnyvale: 'Santa Clara',
  'mountain view': 'Santa Clara',
  cupertino: 'Santa Clara',
  milpitas: 'Santa Clara',
  campbell: 'Santa Clara',
  saratoga: 'Santa Clara',
  'los gatos': 'Santa Clara',
  'morgan hill': 'Santa Clara',
  gilroy: 'Santa Clara',
  'san mateo': 'San Mateo',
  'redwood city': 'San Mateo',
  'menlo park': 'San Mateo',
  burlingame: 'San Mateo',
  'daly city': 'San Mateo',
  'san bruno': 'San Mateo',
  'south san francisco': 'San Mateo',
  'foster city': 'San Mateo',
  millbrae: 'San Mateo',
  'san carlos': 'San Mateo',
  belmont: 'San Mateo',
  'san rafael': 'Marin',
  novato: 'Marin',
  sausalito: 'Marin',
  'mill valley': 'Marin',
  larkspur: 'Marin',
  'corte madera': 'Marin',
  tiburon: 'Marin',

  // Sacramento and the Central Valley
  sacramento: 'Sacramento',
  'elk grove': 'Sacramento',
  folsom: 'Sacramento',
  'citrus heights': 'Sacramento',
  'rancho cordova': 'Sacramento',
  'roseville': 'Placer',
  rocklin: 'Placer',
  auburn: 'Placer',
  davis: 'Yolo',
  woodland: 'Yolo',
  'west sacramento': 'Yolo',
  stockton: 'San Joaquin',
  tracy: 'San Joaquin',
  lodi: 'San Joaquin',
  manteca: 'San Joaquin',
  modesto: 'Stanislaus',
  turlock: 'Stanislaus',
  fresno: 'Fresno',
  clovis: 'Fresno',
  bakersfield: 'Kern',
  visalia: 'Tulare',
  merced: 'Merced',
  'chico': 'Butte',
  redding: 'Shasta',

  // Inland Empire
  riverside: 'Riverside',
  'palm springs': 'Riverside',
  'palm desert': 'Riverside',
  temecula: 'Riverside',
  murrieta: 'Riverside',
  corona: 'Riverside',
  moreno: 'Riverside',
  'moreno valley': 'Riverside',
  hemet: 'Riverside',
  indio: 'Riverside',
  'san bernardino': 'San Bernardino',
  ontario: 'San Bernardino',
  'rancho cucamonga': 'San Bernardino',
  fontana: 'San Bernardino',
  redlands: 'San Bernardino',
  upland: 'San Bernardino',
  chino: 'San Bernardino',
  'chino hills': 'San Bernardino',
  victorville: 'San Bernardino',
  'apple valley': 'San Bernardino',
  'rialto': 'San Bernardino',
  colton: 'San Bernardino',

  // Central Coast, North Coast, other
  ventura: 'Ventura',
  oxnard: 'Ventura',
  'thousand oaks': 'Ventura',
  'simi valley': 'Ventura',
  camarillo: 'Ventura',
  'santa barbara': 'Santa Barbara',
  'santa maria': 'Santa Barbara',
  goleta: 'Santa Barbara',
  'san luis obispo': 'San Luis Obispo',
  'paso robles': 'San Luis Obispo',
  'pismo beach': 'San Luis Obispo',
  'santa cruz': 'Santa Cruz',
  watsonville: 'Santa Cruz',
  capitola: 'Santa Cruz',
  monterey: 'Monterey',
  salinas: 'Monterey',
  'pacific grove': 'Monterey',
  carmel: 'Monterey',
  'santa rosa': 'Sonoma',
  petaluma: 'Sonoma',
  sonoma: 'Sonoma',
  healdsburg: 'Sonoma',
  napa: 'Napa',
  'st helena': 'Napa',
  vallejo: 'Solano',
  fairfield: 'Solano',
  vacaville: 'Solano',
  benicia: 'Solano',
  eureka: 'Humboldt',
  'el centro': 'Imperial',
  'grass valley': 'Nevada',
  'nevada city': 'Nevada',
  placerville: 'El Dorado',
  'south lake tahoe': 'El Dorado',
  hanford: 'Kings',
  madera: 'Madera',
  'yuba city': 'Sutter',
  marysville: 'Yuba',
  ukiah: 'Mendocino',
  hollister: 'San Benito',
}

/**
 * Strip punctuation, the trailing "county"/"co" suffix, and collapse spaces.
 * Also drops diacritics so "La Cañada" matches "la canada".
 */
function normalizeKey(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(county|counties|co)$/, '')
    .trim()
}

/** True when `value` is already one of the 58 canonical county names. */
export function isCaCounty(value: string | null | undefined): boolean {
  if (!value) return false
  return CANONICAL_BY_KEY.has(normalizeKey(value))
}

/**
 * Canonicalize a county name. Handles the "County" suffix, casing, punctuation,
 * diacritics, and the abbreviations that show up in directory data. Returns
 * `null` when the input is not recognizable as a California county.
 */
export function normalizeCaCounty(value: string | null | undefined): string | null {
  if (!value) return null
  const key = normalizeKey(value)
  if (!key) return null
  return CANONICAL_BY_KEY.get(key) ?? COUNTY_ALIASES[key] ?? null
}

/**
 * County for a California city or neighborhood, or `null` when the city is not
 * in the mapped set. Callers must treat `null` as "needs resolution" rather
 * than guessing.
 */
export function countyForCaCity(city: string | null | undefined): string | null {
  if (!city) return null
  const key = normalizeKey(city)
  if (!key) return null
  return CITY_TO_COUNTY[key] ?? null
}

export type CountyResolution = {
  county: string | null
  /** Which input produced the answer. `none` means the caller must follow up. */
  via: 'county' | 'city' | 'none'
}

/**
 * Resolve a county from whatever location fields a source provides, preferring
 * an explicit county over a city lookup.
 *
 * The State Bar licensee record carries county directly, so the city path is a
 * fallback for sources that only give a mailing address.
 */
export function resolveCaCounty(input: {
  county?: string | null
  city?: string | null
}): CountyResolution {
  const fromCounty = normalizeCaCounty(input.county)
  if (fromCounty) return { county: fromCounty, via: 'county' }

  const fromCity = countyForCaCity(input.city)
  if (fromCity) return { county: fromCity, via: 'city' }

  return { county: null, via: 'none' }
}
