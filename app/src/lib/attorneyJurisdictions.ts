/**
 * Attorney service-area coverage, shared by the forms that edit it.
 *
 * Routing stores coverage as `[{ state, counties }]` and reads an empty
 * counties list as "serves the whole state". The forms model the same thing as
 * two controls — a state list and a per-state county map — so these translate
 * between the two shapes.
 */

export type CountiesByState = Record<string, string[]>

export interface AttorneyJurisdiction {
  state: string
  counties: string[]
}

/**
 * Build the payload the API stores.
 *
 * Counties are carried explicitly because the form used to send `{ state }`
 * alone: saving an attorney after editing their name or specialties silently
 * dropped whatever counties they had and widened them to the entire state,
 * with nothing on screen to show it had happened.
 */
export function buildAttorneyJurisdictions(
  states: string[],
  counties: CountiesByState,
): AttorneyJurisdiction[] {
  return states.map((state) => ({ state, counties: counties[state] ?? [] }))
}

/** Read stored coverage back into the map the county control edits. */
export function readAttorneyCounties(
  jurisdictions: Array<{ state: string; counties?: unknown }> | undefined | null,
): CountiesByState {
  if (!Array.isArray(jurisdictions)) return {}
  const entries = jurisdictions
    .filter((entry) => entry && typeof entry.state === 'string' && entry.state.trim())
    .map((entry) => {
      const counties = Array.isArray(entry.counties)
        ? entry.counties.filter((county): county is string => typeof county === 'string' && !!county.trim())
        : []
      return [entry.state, counties] as const
    })
  return Object.fromEntries(entries)
}
