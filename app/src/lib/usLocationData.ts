import * as countiesPkg from 'typed-usa-states/dist/states-with-counties.js'
import { CA_COUNTIES } from './constants'

type StateCountyRow = { abbreviation: string; counties?: string[] }

function readStatesWithCounties(): StateCountyRow[] {
  const mod = countiesPkg as {
    usaStatesWithCounties?: StateCountyRow[]
    default?: { usaStatesWithCounties?: StateCountyRow[] }
  }
  return mod.usaStatesWithCounties ?? mod.default?.usaStatesWithCounties ?? []
}

function sortCounties(counties: string[]): string[] {
  return [...counties].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
}

function dedupe(counties: string[]): string[] {
  const seen = new Set<string>()
  return counties.filter((county) => {
    const key = county.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildCountiesByState(): Record<string, readonly string[]> {
  const entries = readStatesWithCounties()
    .filter((state) => Array.isArray(state.counties) && state.counties.length > 0)
    .map(
      (state) =>
        [
          state.abbreviation,
          sortCounties(dedupe(state.counties!.map((county) => normalizeCountyName(county)))),
        ] as const,
    )

  if (entries.length === 0) {
    return { CA: sortCounties([...CA_COUNTIES]) }
  }

  return Object.fromEntries(entries)
}

const COUNTIES_BY_STATE = buildCountiesByState()

/**
 * Reduces a county to the bare name routing compares on.
 *
 * Routing matches an attorney's stored county against an assessment's
 * `venueCounty` with case-insensitive string equality, so the two sides have to
 * agree on spelling exactly. The upstream dataset writes the full legal name --
 * "Acadia Parish", "Aleutians West Census Area", "Anchorage, Municipality of" --
 * while everything already stored in this system uses the bare form.
 *
 * Independent cities are the exception: they keep a "City" suffix rather than
 * collapsing to the bare name. Virginia has both a Bedford County and a City of
 * Bedford, and Maryland and Missouri have the same split. Stripping the suffix
 * would merge two distinct venues into one entry and silently widen coverage
 * for anyone who had picked only the county.
 */
export function normalizeCountyName(county: string): string {
  return county
    .replace(/,\s*City and County of$/i, '')
    .replace(/,\s*Consolidated Municipality of$/i, '')
    .replace(/,\s*Town and County of$/i, '')
    .replace(/,\s*City and Borough( of)?$/i, '')
    .replace(/,\s*Municipality of$/i, '')
    .replace(/,\s*City of$/i, ' City')
    .replace(/\s+(County|Parish|Borough|Census Area|Municipality)\s*$/i, '')
    .trim()
}

export function getCountiesForState(stateCode: string): readonly string[] {
  const code = stateCode.trim().toUpperCase()
  return COUNTIES_BY_STATE[code] ?? []
}

export function isKnownCounty(stateCode: string, county: string): boolean {
  const normalizedCounty = normalizeCountyName(county)
  if (!normalizedCounty) return false
  return getCountiesForState(stateCode).some(
    (entry) => entry.toLowerCase() === normalizedCounty.toLowerCase(),
  )
}
