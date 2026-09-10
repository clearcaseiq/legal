/**
 * GET /v1/admin/ads-conversions is the only window onto whether retained cases
 * are actually reaching Google Ads. If it under-reports, a sweep that has been
 * failing for a week looks idle rather than broken, so the states it collapses
 * and the ones it keeps apart both matter.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/google-ads-conversions', () => ({
  isGoogleAdsConfigured: vi.fn().mockReturnValue(true),
  uploadClickConversions: vi.fn(),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { isGoogleAdsConfigured } from './lib/google-ads-conversions'
import { CLICK_WINDOW_DAYS, MAX_ATTEMPTS } from './lib/ads-conversion-sweep'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@test.local',
  firstName: 'Ada',
  lastName: 'Ops',
  role: 'admin',
  isActive: true,
  adminCapabilities: JSON.stringify(['network']),
}

const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  role: 'attorney',
  isActive: true,
}

const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const attorneyAuth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const uploads = () => (prisma as any).adsConversionUpload

function signedInAs(user: Record<string, unknown> | null) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
}

/** An upload row with only the fields the route reads. */
function upload(over: Record<string, unknown> = {}) {
  return {
    assessmentId: 'asm-1',
    gclid: 'Cj0KCQ',
    value: 1200,
    currencyCode: 'USD',
    convertedAt: new Date('2026-09-01T12:00:00Z'),
    uploadedAt: new Date('2026-09-01T13:00:00Z'),
    status: 'uploaded',
    attempts: 1,
    lastError: null,
    ...over,
  }
}

/**
 * Sets up the four reads the route issues. `grouped` is the status rollup,
 * `exhausted` the out-of-retries count, `sum` the uploaded value, and `recent`
 * the table rows.
 */
function given(opts: {
  grouped?: Array<{ status: string; _count: { _all: number } }>
  exhausted?: number
  sum?: number | null
  recent?: Array<Record<string, unknown>>
  assessments?: Array<Record<string, unknown>>
} = {}) {
  vi.mocked(uploads().groupBy).mockResolvedValue((opts.grouped ?? []) as any)
  vi.mocked(uploads().count).mockResolvedValue((opts.exhausted ?? 0) as any)
  vi.mocked(uploads().aggregate).mockResolvedValue({ _sum: { value: opts.sum ?? 0 } } as any)
  vi.mocked(uploads().findMany).mockResolvedValue((opts.recent ?? []) as any)
  vi.mocked(prisma.assessment.findMany).mockResolvedValue((opts.assessments ?? []) as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(isGoogleAdsConfigured).mockReturnValue(true)
  signedInAs(adminUser)
  given()
})

describe('who can read the ads conversion report', () => {
  it('turns away a request with no token', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions')

    expect(res.status).toBe(401)
  })

  /**
   * The rows carry gclids and case values. An attorney authenticates fine and
   * still must not see the marketing spend side of the platform.
   */
  it('turns away an authenticated attorney', async () => {
    signedInAs(attorneyUser)

    const res = await request(app).get('/v1/admin/ads-conversions').set(attorneyAuth)

    expect(res.status).toBe(403)
    expect(uploads().groupBy).not.toHaveBeenCalled()
  })

  it('lets an admin through', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.status).toBe(200)
  })
})

describe('reporting whether Ads is wired up', () => {
  /**
   * Most environments have no Ads credentials. The panel needs to say "not
   * configured" rather than "zero conversions", which reads as a broken sweep.
   */
  it('reports the unconfigured state instead of an empty success', async () => {
    vi.mocked(isGoogleAdsConfigured).mockReturnValue(false)

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.status).toBe(200)
    expect(res.body.configured).toBe(false)
  })

  it('reports the configured state', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.configured).toBe(true)
  })

  /** The panel explains the 90-day limit, so it reads the number from here. */
  it('publishes the click window and the retry ceiling', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.clickWindowDays).toBe(CLICK_WINDOW_DAYS)
    expect(res.body.maxAttempts).toBe(MAX_ATTEMPTS)
  })
})

describe('the status rollup', () => {
  it('counts each status the sweep can leave behind', async () => {
    given({
      grouped: [
        { status: 'uploaded', _count: { _all: 7 } },
        { status: 'pending', _count: { _all: 3 } },
        { status: 'skipped', _count: { _all: 2 } },
        { status: 'failed', _count: { _all: 1 } },
      ],
    })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.counts).toMatchObject({ uploaded: 7, pending: 3, skipped: 2, failed: 1 })
  })

  /**
   * groupBy returns no row for a status with no rows, so the tiles have to be
   * seeded at zero or they render undefined.
   */
  it('reports zero for a status nothing landed in', async () => {
    given({ grouped: [{ status: 'uploaded', _count: { _all: 4 } }] })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.counts).toMatchObject({ uploaded: 4, pending: 0, skipped: 0, failed: 0 })
  })

  it('sums the value of uploaded conversions only', async () => {
    given({ sum: 45250 })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.uploadedValue).toBe(45250)
    const where = vi.mocked(uploads().aggregate).mock.calls.at(-1)?.[0] as any
    expect(where.where.status).toBe('uploaded')
  })

  it('reports zero rather than null when nothing has uploaded', async () => {
    given({ sum: null })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.uploadedValue).toBe(0)
  })
})

/**
 * The subtle one. A row that ran out of retries keeps `status: 'pending'` in the
 * column, because the sweep stops selecting it rather than rewriting it. Left
 * alone it would sit in the pending tile forever, so the report has to move it.
 */
describe('conversions that ran out of retries', () => {
  it('moves them out of pending and into their own count', async () => {
    given({
      grouped: [{ status: 'pending', _count: { _all: 5 } }],
      exhausted: 2,
    })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.counts.pending).toBe(3)
    expect(res.body.counts.exhausted).toBe(2)
  })

  it('asks the database only for pending rows at or past the retry ceiling', async () => {
    await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    const args = vi.mocked(uploads().count).mock.calls.at(-1)?.[0] as any
    expect(args.where.status).toBe('pending')
    expect(args.where.attempts).toEqual({ gte: MAX_ATTEMPTS })
  })

  /** Never a negative tile, however the two reads disagree. */
  it('floors pending at zero if more are exhausted than grouped', async () => {
    given({ grouped: [{ status: 'pending', _count: { _all: 1 } }], exhausted: 4 })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.counts.pending).toBe(0)
  })

  it('relabels the row in the table so it does not read as still queued', async () => {
    given({
      recent: [
        upload({ assessmentId: 'asm-out', status: 'pending', attempts: MAX_ATTEMPTS, lastError: 'INVALID_GCLID' }),
        upload({ assessmentId: 'asm-queued', status: 'pending', attempts: 1 }),
      ],
    })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    const byId = new Map(res.body.recent.map((r: any) => [r.assessmentId, r]))
    expect(byId.get('asm-out').status).toBe('exhausted')
    expect(byId.get('asm-out').lastError).toBe('INVALID_GCLID')
    expect(byId.get('asm-queued').status).toBe('pending')
  })

  it('leaves a settled row alone however many attempts it took', async () => {
    given({ recent: [upload({ status: 'uploaded', attempts: MAX_ATTEMPTS + 3 })] })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.recent[0].status).toBe('uploaded')
  })
})

describe('the recent conversions table', () => {
  /**
   * AdsConversionUpload keys on assessmentId with no relation, so the claim
   * type comes from a second read that has to be joined in memory.
   */
  it('names the case behind each conversion', async () => {
    given({
      recent: [upload({ assessmentId: 'asm-7' })],
      assessments: [{ id: 'asm-7', claimType: 'auto', venueState: 'CA' }],
    })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.recent[0]).toMatchObject({ claimType: 'auto', venueState: 'CA' })
  })

  it('still lists a conversion whose case has since been deleted', async () => {
    given({ recent: [upload({ assessmentId: 'asm-gone' })], assessments: [] })

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.recent).toHaveLength(1)
    expect(res.body.recent[0].claimType).toBeNull()
  })

  it('skips the second read when there is nothing to enrich', async () => {
    given({ recent: [] })

    await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(prisma.assessment.findMany).not.toHaveBeenCalled()
  })

  it('shows the newest conversions first', async () => {
    await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    const args = vi.mocked(uploads().findMany).mock.calls.at(-1)?.[0] as any
    expect(args.orderBy).toEqual({ convertedAt: 'desc' })
    expect(args.take).toBe(25)
  })
})

describe('the reporting window', () => {
  it('defaults to 30 days', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.body.periodDays).toBe(30)
  })

  it('honours a requested window', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions?days=60').set(adminAuth)

    expect(res.body.periodDays).toBe(60)
  })

  /** Clamped at both ends so a stray query string cannot scan the whole table. */
  it('clamps a window that is too wide or too narrow', async () => {
    const wide = await request(app).get('/v1/admin/ads-conversions?days=3650').set(adminAuth)
    const narrow = await request(app).get('/v1/admin/ads-conversions?days=1').set(adminAuth)

    expect(wide.body.periodDays).toBe(90)
    expect(narrow.body.periodDays).toBe(7)
  })

  it('falls back to the default when days is not a number', async () => {
    const res = await request(app).get('/v1/admin/ads-conversions?days=lots').set(adminAuth)

    expect(res.body.periodDays).toBe(30)
  })
})

describe('when a read fails', () => {
  it('answers 500 rather than a payload the panel would render as zeroes', async () => {
    vi.mocked(uploads().groupBy).mockRejectedValue(new Error('connection reset'))

    const res = await request(app).get('/v1/admin/ads-conversions').set(adminAuth)

    expect(res.status).toBe(500)
  })
})
