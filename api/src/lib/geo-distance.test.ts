import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { ENV } from '../env'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  distanceMilesBetweenZips,
  haversineMiles,
  normalizeZip,
  resolveZipCentroids,
} from './geo-distance'

/** Builds a fetch stub returning one Geocoding API payload. */
function geocodeResponse(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => payload } as any)
}

const OK_PAYLOAD = {
  status: 'OK',
  results: [{ geometry: { location: { lat: 34.0522, lng: -118.2437 } } }],
}

const originalGeocodingKey = ENV.GOOGLE_GEOCODING_API_KEY
const originalPlacesKey = ENV.GOOGLE_PLACES_API_KEY

describe('geo-distance', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    ;(ENV as any).GOOGLE_GEOCODING_API_KEY = 'test-key'
    ;(ENV as any).GOOGLE_PLACES_API_KEY = undefined
  })

  afterEach(() => {
    ;(ENV as any).GOOGLE_GEOCODING_API_KEY = originalGeocodingKey
    ;(ENV as any).GOOGLE_PLACES_API_KEY = originalPlacesKey
  })

  describe('normalizeZip', () => {
    it('accepts 5-digit and ZIP+4 forms, ignoring surrounding whitespace', () => {
      expect(normalizeZip('90001')).toBe('90001')
      expect(normalizeZip(' 90001 ')).toBe('90001')
      expect(normalizeZip('90001-1234')).toBe('90001')
    })

    it('rejects anything that is not a US ZIP', () => {
      expect(normalizeZip('9001')).toBeNull()
      expect(normalizeZip('ABCDE')).toBeNull()
      expect(normalizeZip('')).toBeNull()
      expect(normalizeZip(null)).toBeNull()
      expect(normalizeZip(undefined)).toBeNull()
    })
  })

  describe('haversineMiles', () => {
    it('returns zero for the same point', () => {
      const point = { latitude: 34.0522, longitude: -118.2437 }
      expect(haversineMiles(point, point)).toBe(0)
    })

    it('matches the known LAX to JFK great-circle distance', () => {
      const distance = haversineMiles(
        { latitude: 33.9416, longitude: -118.4085 },
        { latitude: 40.6413, longitude: -73.7781 },
      )
      expect(distance).toBeGreaterThan(2400)
      expect(distance).toBeLessThan(2500)
    })

    it('is symmetric', () => {
      const a = { latitude: 34.0522, longitude: -118.2437 }
      const b = { latitude: 37.7749, longitude: -122.4194 }
      expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 9)
    })
  })

  describe('resolveZipCentroids', () => {
    it('serves cached ZIPs without calling the geocoder', async () => {
      vi.mocked(prisma.zipCentroid.findMany).mockResolvedValue([
        { zipCode: '90001', latitude: 33.9731, longitude: -118.2479 },
      ] as any)
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['90001'], { fetchImpl })

      expect(fetchImpl).not.toHaveBeenCalled()
      expect(result.get('90001')).toEqual({ latitude: 33.9731, longitude: -118.2479 })
    })

    it('treats a cached row with null coordinates as a known-unresolvable ZIP', async () => {
      vi.mocked(prisma.zipCentroid.findMany).mockResolvedValue([
        { zipCode: '00000', latitude: null, longitude: null },
      ] as any)
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['00000'], { fetchImpl })

      expect(fetchImpl).not.toHaveBeenCalled()
      expect(result.get('00000')).toBeNull()
    })

    it('geocodes and caches a ZIP that is not yet known', async () => {
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['90012'], { fetchImpl })

      expect(result.get('90012')).toEqual({ latitude: 34.0522, longitude: -118.2437 })
      expect(prisma.zipCentroid.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { zipCode: '90012' },
          create: expect.objectContaining({ latitude: 34.0522, longitude: -118.2437 }),
        }),
      )
    })

    it('caches a negative result when the geocoder reports the ZIP does not exist', async () => {
      const fetchImpl = geocodeResponse({ status: 'ZERO_RESULTS', results: [] })

      const result = await resolveZipCentroids(['99999'], { fetchImpl })

      expect(result.get('99999')).toBeNull()
      expect(prisma.zipCentroid.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { zipCode: '99999' },
          create: expect.objectContaining({ latitude: null, longitude: null }),
        }),
      )
    })

    it('does not cache a quota failure, so a later search retries', async () => {
      const fetchImpl = geocodeResponse({
        status: 'OVER_QUERY_LIMIT',
        error_message: 'quota exceeded',
      })

      const result = await resolveZipCentroids(['90012'], { fetchImpl })

      expect(result.get('90012')).toBeNull()
      expect(prisma.zipCentroid.upsert).not.toHaveBeenCalled()
    })

    it('does not cache an HTTP error, so a later search retries', async () => {
      const fetchImpl = geocodeResponse({}, false)

      const result = await resolveZipCentroids(['90012'], { fetchImpl })

      expect(result.get('90012')).toBeNull()
      expect(prisma.zipCentroid.upsert).not.toHaveBeenCalled()
    })

    it('does not cache a network failure, so a later search retries', async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'))

      const result = await resolveZipCentroids(['90012'], { fetchImpl } as any)

      expect(result.get('90012')).toBeNull()
      expect(prisma.zipCentroid.upsert).not.toHaveBeenCalled()
    })

    it('resolves nothing and calls no API when no key is configured', async () => {
      ;(ENV as any).GOOGLE_GEOCODING_API_KEY = undefined
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['90012'], { fetchImpl })

      expect(fetchImpl).not.toHaveBeenCalled()
      expect(result.get('90012')).toBeNull()
    })

    it('falls back to the Places key when no dedicated geocoding key is set', async () => {
      ;(ENV as any).GOOGLE_GEOCODING_API_KEY = undefined
      ;(ENV as any).GOOGLE_PLACES_API_KEY = 'places-key'
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      await resolveZipCentroids(['90012'], { fetchImpl })

      expect(fetchImpl).toHaveBeenCalledOnce()
      expect(String(fetchImpl.mock.calls[0][0])).toContain('key=places-key')
    })

    it('deduplicates ZIPs and skips malformed input entirely', async () => {
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['90012', '90012', 'nope', null], { fetchImpl })

      expect(fetchImpl).toHaveBeenCalledOnce()
      expect(result.has('nope')).toBe(false)
      expect(result.size).toBe(1)
    })

    it('survives a cache write failure and still returns the resolved coordinates', async () => {
      vi.mocked(prisma.zipCentroid.upsert).mockRejectedValue(new Error('db down'))
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      const result = await resolveZipCentroids(['90012'], { fetchImpl })

      expect(result.get('90012')).toEqual({ latitude: 34.0522, longitude: -118.2437 })
    })
  })

  describe('distanceMilesBetweenZips', () => {
    it('is zero between a ZIP and itself without any lookup', async () => {
      const fetchImpl = geocodeResponse(OK_PAYLOAD)

      await expect(distanceMilesBetweenZips('90012', '90012', { fetchImpl })).resolves.toBe(0)
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('returns null rather than a guess when a ZIP cannot be resolved', async () => {
      const fetchImpl = geocodeResponse({ status: 'ZERO_RESULTS', results: [] })

      await expect(distanceMilesBetweenZips('90012', '99999', { fetchImpl })).resolves.toBeNull()
    })

    it('returns null for malformed input', async () => {
      await expect(distanceMilesBetweenZips('nope', '90012')).resolves.toBeNull()
      await expect(distanceMilesBetweenZips(null, '90012')).resolves.toBeNull()
    })

    it('measures the distance between two resolved ZIPs', async () => {
      vi.mocked(prisma.zipCentroid.findMany).mockResolvedValue([
        { zipCode: '90012', latitude: 34.0522, longitude: -118.2437 },
        { zipCode: '94103', latitude: 37.7749, longitude: -122.4194 },
      ] as any)

      const distance = await distanceMilesBetweenZips('90012', '94103')

      expect(distance).not.toBeNull()
      expect(distance as number).toBeGreaterThan(330)
      expect(distance as number).toBeLessThan(360)
    })
  })
})
