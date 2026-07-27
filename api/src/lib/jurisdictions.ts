/**
 * Canonical shape and helpers for `AttorneyProfile.jurisdictions`.
 *
 * `checkAttorneyEligibility()` in `routing.ts` reads this column as
 * `Array<{ state: string; counties?: string[] }>` and compares `counties`
 * against the case venue. An importer that writes any other key silently
 * produces attorneys who appear to serve the entire state — which is how the
 * LegalMatch importer, writing a `cities` key, made every one of its records
 * statewide.
 *
 * Everything that writes this column should go through `buildJurisdictions()`
 * or `mergeJurisdictions()` so the routing contract stays in one place.
 *
 * Semantics that routing depends on: an empty or absent `counties` array means
 * "serves every county in that state". That is the lenient default, so leave it
 * empty only when you genuinely mean statewide coverage.
 */

export type Jurisdiction = {
  /** Two-letter state code, uppercased. */
  state: string
  /** Canonical county names. Empty means statewide — see the note above. */
  counties: string[]
  /** Retained for display and future geo work; routing ignores this. */
  cities?: string[]
}

function normalizeState(value: string | null | undefined): string | null {
  const state = String(value ?? '').trim().toUpperCase()
  return state.length > 0 ? state : null
}

function normalizeList(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  if (!values) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

/**
 * Build a jurisdictions array for a single state.
 *
 * Returns `null` when there is no state, since a jurisdictions value without a
 * state is worse than none — it parses but can never match.
 */
export function buildJurisdictions(input: {
  state: string | null | undefined
  counties?: readonly (string | null | undefined)[] | null
  cities?: readonly (string | null | undefined)[] | null
}): Jurisdiction[] | null {
  const state = normalizeState(input.state)
  if (!state) return null

  const jurisdiction: Jurisdiction = {
    state,
    counties: normalizeList(input.counties),
  }

  const cities = normalizeList(input.cities)
  if (cities.length > 0) jurisdiction.cities = cities

  return [jurisdiction]
}

/** Parse the stored column, tolerating null, malformed JSON, and legacy shapes. */
export function parseJurisdictions(raw: string | null | undefined): Jurisdiction[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const result: Jurisdiction[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const state = normalizeState(typeof record.state === 'string' ? record.state : null)
    if (!state) continue

    const counties = Array.isArray(record.counties)
      ? normalizeList(record.counties as string[])
      : []
    const cities = Array.isArray(record.cities) ? normalizeList(record.cities as string[]) : []

    const jurisdiction: Jurisdiction = { state, counties }
    if (cities.length > 0) jurisdiction.cities = cities
    result.push(jurisdiction)
  }
  return result
}

/**
 * Union two jurisdiction sets, grouped by state.
 *
 * Widening coverage is the only safe merge direction for an incremental import:
 * a second source that knows about one county must not narrow an attorney who
 * already serves several. Note the corollary — once a state is recorded as
 * statewide (empty counties), merging cannot narrow it back down.
 */
export function mergeJurisdictions(
  existing: readonly Jurisdiction[],
  incoming: readonly Jurisdiction[]
): Jurisdiction[] {
  const byState = new Map<string, { counties: string[]; cities: string[]; statewide: boolean }>()

  for (const jurisdiction of [...existing, ...incoming]) {
    const state = normalizeState(jurisdiction.state)
    if (!state) continue

    const entry = byState.get(state) ?? { counties: [], cities: [], statewide: false }
    if (!jurisdiction.counties || jurisdiction.counties.length === 0) {
      entry.statewide = true
    }
    entry.counties = normalizeList([...entry.counties, ...(jurisdiction.counties ?? [])])
    entry.cities = normalizeList([...entry.cities, ...(jurisdiction.cities ?? [])])
    byState.set(state, entry)
  }

  return Array.from(byState.entries(), ([state, entry]) => {
    const jurisdiction: Jurisdiction = {
      state,
      counties: entry.statewide ? [] : entry.counties,
    }
    if (entry.cities.length > 0) jurisdiction.cities = entry.cities
    return jurisdiction
  })
}

/** Serialize for storage, or `null` when there is nothing worth storing. */
export function serializeJurisdictions(
  jurisdictions: readonly Jurisdiction[] | null | undefined
): string | null {
  if (!jurisdictions || jurisdictions.length === 0) return null
  return JSON.stringify(jurisdictions)
}

/**
 * Merge an incoming set into the stored column and serialize the result.
 * Convenience wrapper for importers doing a read-modify-write.
 */
export function mergeSerializedJurisdictions(
  storedRaw: string | null | undefined,
  incoming: readonly Jurisdiction[] | null | undefined
): string | null {
  if (!incoming || incoming.length === 0) return storedRaw ?? null
  return serializeJurisdictions(mergeJurisdictions(parseJurisdictions(storedRaw), incoming))
}
