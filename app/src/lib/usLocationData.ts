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

function buildCountiesByState(): Record<string, readonly string[]> {
  const entries = readStatesWithCounties()
    .filter((state) => Array.isArray(state.counties) && state.counties.length > 0)
    .map(
      (state) =>
        [state.abbreviation, state.counties!.map((county) => normalizeCountyName(county))] as const,
    )

  if (entries.length === 0) {
    return { CA: [...CA_COUNTIES] }
  }

  return Object.fromEntries(entries)
}

const COUNTIES_BY_STATE = buildCountiesByState()

export function normalizeCountyName(county: string): string {
  return county
    .replace(/,\s*City and County of$/i, '')
    .replace(/,\s*Consolidated Municipality of$/i, '')
    .replace(/,\s*City of$/i, '')
    .replace(/,\s*Town and County of$/i, '')
    .replace(/\s+County\s*$/i, '')
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
