/**
 * What an invited colleague is told when they try to sign in too early.
 *
 * A Case Specialist, admin or firm staffer created from Configuration -> User
 * Roles has no password until they open their invitation email. Signing in
 * before that used to return "This account was created with Google or Apple",
 * naming a method they never used and offering nothing to do about it - so a
 * new specialist simply could not get in and had no idea why.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const CREDENTIALS = { email: 'joe@yopmail.com', password: 'whatever12345' }

/** An account as `POST /v1/admin/users` leaves it: role set, no password. */
function invitedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: CREDENTIALS.email,
    firstName: 'Joe',
    lastName: 'Specialist',
    role: 'specialist',
    isActive: true,
    emailVerified: false,
    passwordHash: null,
    provider: null,
    ...overrides,
  }
}

describe('signing in before the invitation has been opened', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('tells an invited specialist how to get a password, not to use Google', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(invitedUser() as any)

    const res = await request(app).post('/v1/auth/login').send(CREDENTIALS)

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('NO_PASSWORD_SET')
    expect(res.body.useOAuth).toBeUndefined()
    expect(res.body.error).toMatch(/invitation email/i)
    expect(res.body.error).not.toMatch(/Google or Apple/i)
  })

  it('says the same for an invited admin and firm staffer', async () => {
    for (const role of ['admin', 'staff']) {
      resetUniversalPrismaMock()
      vi.mocked(prisma.user.findUnique).mockResolvedValue(invitedUser({ role }) as any)

      const res = await request(app).post('/v1/auth/login').send(CREDENTIALS)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('NO_PASSWORD_SET')
    }
  })

  it('still points a real Google account at Google', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      invitedUser({ role: 'client', provider: 'google' }) as any,
    )

    const res = await request(app).post('/v1/auth/login').send(CREDENTIALS)

    expect(res.status).toBe(400)
    expect(res.body.useOAuth).toBe(true)
    expect(res.body.error).toMatch(/Google or Apple/i)
  })

  it('keeps the claimant wording for a case started during intake', async () => {
    // Distinct because the remedy differs: they have a case in progress and are
    // sent to "Forgot your password?", not to an invitation they never got.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      invitedUser({ role: 'client', provider: 'intake' }) as any,
    )

    const res = await request(app).post('/v1/auth/login').send(CREDENTIALS)

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('NO_PASSWORD_SET')
    expect(res.body.error).toMatch(/started a case/i)
  })

  it('reports a deactivated account as deactivated rather than as a bad password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(invitedUser({ isActive: false }) as any)

    const res = await request(app).post('/v1/auth/login').send(CREDENTIALS)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED')
  })
})
