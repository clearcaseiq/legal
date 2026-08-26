import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { PostgresRateLimitStore } from './rate-limit-store'

/** The shape express-rate-limit passes to `init`; only windowMs is read. */
const optionsWithWindow = (windowMs: number) => ({ windowMs }) as any

describe('PostgresRateLimitStore', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('reports the count the database returned, not one it kept locally', async () => {
    // The whole point: this instance may never have seen this caller before and
    // must still know they are on their 29th attempt against another host.
    const resetTime = new Date('2026-08-26T02:15:00Z')
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: 29, expiresAt: resetTime }] as any)

    const store = new PostgresRateLimitStore('auth')
    store.init(optionsWithWindow(900_000))

    const info = await store.increment('203.0.113.7')

    expect(info.totalHits).toBe(29)
    expect(info.resetTime).toBe(resetTime)
  })

  it('keeps each limiter counting separately', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: 1, expiresAt: new Date() }] as any)

    const auth = new PostgresRateLimitStore('auth')
    const upload = new PostgresRateLimitStore('upload')
    auth.init(optionsWithWindow(900_000))
    upload.init(optionsWithWindow(900_000))

    await auth.increment('198.51.100.4')
    await upload.increment('198.51.100.4')

    // Same caller, different budgets: signing in should not consume the
    // allowance for uploading evidence.
    const keys = vi
      .mocked(prisma.$queryRaw)
      .mock.calls.flatMap((call) => call.slice(1))
      .filter((value): value is string => typeof value === 'string')

    expect(keys).toContain('auth:198.51.100.4')
    expect(keys).toContain('upload:198.51.100.4')
  })

  it('allows the request when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'))

    const store = new PostgresRateLimitStore('auth')
    store.init(optionsWithWindow(900_000))

    // Failing closed would turn a database blip into a total lockout, and it
    // would protect nothing: authentication needs the same database.
    const info = await store.increment('203.0.113.9')

    expect(info.totalHits).toBe(1)
    expect(info.resetTime).toBeUndefined()
  })

  it('does not throw when clearing a counter fails', async () => {
    vi.mocked(prisma.$executeRaw).mockRejectedValue(new Error('connection refused'))

    const store = new PostgresRateLimitStore('auth')
    store.init(optionsWithWindow(900_000))

    await expect(store.resetKey('203.0.113.9')).resolves.toBeUndefined()
    await expect(store.decrement('203.0.113.9')).resolves.toBeUndefined()
  })
})
