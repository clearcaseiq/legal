import { ENV } from '../env'
import { logger } from './logger'
import { prisma } from './prisma'

/**
 * ZIP-to-ZIP distance for provider radius search.
 *
 * Coordinates come from the Google Geocoding API and are cached in the
 * `ZipCentroid` table, so a warm cache serves searches without a network call.
 * A ZIP the geocoder reports as non-existent is cached with null coordinates so
 * it stops costing a request; a transient failure (quota, network, HTTP error)
 * is deliberately NOT cached, so it retries on the next search.
 *
 * Callers must treat a null distance as "unknown", never as zero or infinity —
 * the point of this module is that provider search stops inventing distances.
 */

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json'

/** Mean Earth radius in miles. */
const EARTH_RADIUS_MILES = 3958.7613

/**
 * Ceiling on how many uncached ZIPs one search will geocode. Bounds latency and
 * spend on a cold cache; anything above the cap stays unresolved for this
 * request and the caller reports it rather than hiding the affected rows.
 */
const MAX_GEOCODES_PER_REQUEST = 50

export type Coordinates = { latitude: number; longitude: number }

export type FetchImpl = typeof fetch

/** Normalises to the 5-digit form used as the `ZipCentroid` primary key. */
export function normalizeZip(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const match = String(value).trim().match(/^(\d{5})(?:-\d{4})?$/)
  return match ? match[1] : null
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Great-circle distance in miles. */
export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

function geocodingApiKey(): string | null {
  return ENV.GOOGLE_GEOCODING_API_KEY || ENV.GOOGLE_PLACES_API_KEY || null
}

/** False when no key is configured, in which case radius search must be skipped. */
export function isGeocodingConfigured(): boolean {
  return geocodingApiKey() !== null
}

type GeocodeOutcome =
  /** The geocoder answered. `coordinates` is null when the ZIP does not exist. */
  | { resolved: true; coordinates: Coordinates | null }
  /** The lookup failed. Nothing may be cached, so a later search retries. */
  | { resolved: false }

async function geocodeZip(
  zipCode: string,
  apiKey: string,
  fetchImpl: FetchImpl,
): Promise<GeocodeOutcome> {
  const url = new URL(GEOCODE_ENDPOINT)
  url.searchParams.set('components', `postal_code:${zipCode}|country:US`)
  url.searchParams.set('key', apiKey)

  let payload: any
  try {
    const response = await fetchImpl(url.toString())
    if (!response.ok) {
      logger.warn('ZIP geocode returned a non-OK status', {
        zipCode,
        status: response.status,
      })
      return { resolved: false }
    }
    payload = await response.json()
  } catch (error: any) {
    logger.warn('ZIP geocode request failed', { zipCode, error: error?.message })
    return { resolved: false }
  }

  if (payload?.status === 'ZERO_RESULTS') {
    return { resolved: true, coordinates: null }
  }

  if (payload?.status !== 'OK') {
    // OVER_QUERY_LIMIT, REQUEST_DENIED and friends are our problem, not a
    // statement about the ZIP, so they must not be cached as unresolvable.
    logger.warn('ZIP geocode returned an error status', {
      zipCode,
      status: payload?.status,
      message: payload?.error_message,
    })
    return { resolved: false }
  }

  const location = payload?.results?.[0]?.geometry?.location
  const latitude = Number(location?.lat)
  const longitude = Number(location?.lng)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    logger.warn('ZIP geocode succeeded but returned no usable coordinates', { zipCode })
    return { resolved: false }
  }

  return { resolved: true, coordinates: { latitude, longitude } }
}

/**
 * Resolves each ZIP to its centre point, reading through the cache and
 * geocoding what is missing.
 *
 * The returned map is keyed by normalised 5-digit ZIP. A key maps to null when
 * the ZIP is known not to exist, could not be resolved this time, or fell past
 * `MAX_GEOCODES_PER_REQUEST`. Malformed input never reaches the map at all.
 */
export async function resolveZipCentroids(
  zipCodes: Array<string | null | undefined>,
  options: { fetchImpl?: FetchImpl } = {},
): Promise<Map<string, Coordinates | null>> {
  const fetchImpl = options.fetchImpl ?? fetch
  const resolved = new Map<string, Coordinates | null>()

  const wanted = new Set<string>()
  for (const value of zipCodes) {
    const normalized = normalizeZip(value)
    if (normalized) wanted.add(normalized)
  }
  if (wanted.size === 0) return resolved

  const cached = await prisma.zipCentroid.findMany({
    where: { zipCode: { in: [...wanted] } },
  })

  for (const row of cached) {
    resolved.set(
      row.zipCode,
      row.latitude === null || row.longitude === null
        ? null
        : { latitude: row.latitude, longitude: row.longitude },
    )
  }

  const missing = [...wanted].filter((zip) => !resolved.has(zip))
  if (missing.length === 0) return resolved

  const apiKey = geocodingApiKey()
  if (!apiKey) {
    for (const zip of missing) resolved.set(zip, null)
    return resolved
  }

  const geocodable = missing.slice(0, MAX_GEOCODES_PER_REQUEST)
  if (missing.length > geocodable.length) {
    logger.info('ZIP geocode cap reached; remaining ZIPs left unresolved', {
      requested: missing.length,
      cap: MAX_GEOCODES_PER_REQUEST,
    })
    for (const zip of missing.slice(MAX_GEOCODES_PER_REQUEST)) resolved.set(zip, null)
  }

  for (const zip of geocodable) {
    const outcome = await geocodeZip(zip, apiKey, fetchImpl)

    if (!outcome.resolved) {
      resolved.set(zip, null)
      continue
    }

    resolved.set(zip, outcome.coordinates)

    const coordinates = outcome.coordinates
    try {
      await prisma.zipCentroid.upsert({
        where: { zipCode: zip },
        create: {
          zipCode: zip,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        },
        update: {
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        },
      })
    } catch (error: any) {
      // A cache write failure must not fail the search; we already have the answer.
      logger.warn('Failed to cache ZIP centroid', { zipCode: zip, error: error?.message })
    }
  }

  return resolved
}

/** Miles between two ZIPs, or null when either cannot be resolved. */
export async function distanceMilesBetweenZips(
  from: string | null | undefined,
  to: string | null | undefined,
  options: { fetchImpl?: FetchImpl } = {},
): Promise<number | null> {
  const origin = normalizeZip(from)
  const destination = normalizeZip(to)
  if (!origin || !destination) return null
  if (origin === destination) return 0

  const centroids = await resolveZipCentroids([origin, destination], options)
  const a = centroids.get(origin)
  const b = centroids.get(destination)
  if (!a || !b) return null

  return haversineMiles(a, b)
}
