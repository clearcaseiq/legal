/**
 * Where a plaintiff was when they created a case: the client IP and an
 * approximate location looked up from it.
 *
 * The lookup uses the GeoLite data bundled with geoip-lite, so the address
 * never leaves our servers. It is city-level at best and wrong for VPN and many
 * mobile users, so it is shown as approximate and never used for decisions.
 */
import { logger } from './logger'

type GeoRecord = { country: string; region: string; city: string; timezone: string } | null
type GeoLookup = { lookup: (ip: string) => GeoRecord }

let geo: GeoLookup | null | undefined

/** Loaded on first use: the data set takes a moment and memory to load. */
function geoLookup(): GeoLookup | null {
  if (geo === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      geo = require('geoip-lite') as GeoLookup
    } catch (error) {
      logger.warn('IP location lookup unavailable', { error: error instanceof Error ? error.message : String(error) })
      geo = null
    }
  }
  return geo
}

export type CaseOrigin = {
  createdIp: string | null
  createdCity: string | null
  createdRegion: string | null
  createdCountry: string | null
}

/** Express reports IPv4 clients on a dual-stack socket as ::ffff:a.b.c.d. */
export function normalizeIp(ip: string | null | undefined): string | null {
  const value = String(ip || '').trim()
  if (!value) return null
  return value.startsWith('::ffff:') ? value.slice(7) : value
}

export function caseOriginFromIp(rawIp: string | null | undefined): CaseOrigin {
  const createdIp = normalizeIp(rawIp)
  const empty = { createdIp, createdCity: null, createdRegion: null, createdCountry: null }
  if (!createdIp) return empty
  try {
    const hit = geoLookup()?.lookup(createdIp)
    if (!hit) return empty
    return {
      createdIp,
      createdCity: hit.city || null,
      createdRegion: hit.region || null,
      createdCountry: hit.country || null,
    }
  } catch (error) {
    logger.warn('IP location lookup failed', { error: error instanceof Error ? error.message : String(error) })
    return empty
  }
}

/** "San Rafael, CA, US", or null when nothing was resolved. */
export function formatCaseOrigin(o: Partial<CaseOrigin>): string | null {
  const parts = [o.createdCity, o.createdRegion, o.createdCountry].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}
