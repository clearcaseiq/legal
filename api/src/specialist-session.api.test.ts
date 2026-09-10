/**
 * A Case Specialist's session has to survive the trip through `authMiddleware`.
 *
 * The bug this pins: `resolveUserRole` honoured admin, attorney and staff and
 * collapsed everything else to `user`. The login endpoints read `User.role`
 * straight from the database, so signing in worked and issued a token - and
 * then every authenticated route saw `user`, failed `canWorkCaseAssistance` and
 * returned 403. The queue shell reads that as an expired session, clears it and
 * returns to the sign-in page, so signing in looked like it did nothing but
 * reload the form. Admins matched the allowlist and never saw it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { generateToken } from './lib/auth'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

function signedInAs(role: string, email = 'joe@yopmail.com') {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user-1',
    email,
    firstName: 'Joe',
    lastName: 'Specialist',
    isActive: true,
    emailVerified: true,
    role,
    adminCapabilities: null,
    preferredLanguage: 'en',
  } as any)
  return `Bearer ${generateToken('user-1')}`
}

describe('a Case Specialist session on authenticated routes', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('admits a specialist to the Case Assistance access check', async () => {
    const token = signedInAs('specialist')

    const res = await request(app).get('/v1/auth/specialist-access').set('Authorization', token)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // A specialist supervises nobody, so the manager-only controls stay off.
    expect(res.body.isManager).toBe(false)
  })

  it('does not 403 a specialist out of the queue itself', async () => {
    // The whole router sits behind `specialistMiddleware`, which is what turned
    // a valid session into a bounce back to the login form.
    const token = signedInAs('specialist')

    const res = await request(app).get('/v1/case-assistance/counts').set('Authorization', token)

    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(401)
  })

  it('still keeps a claimant out of the specialist queue', async () => {
    const token = signedInAs('client', 'claimant@example.com')

    const res = await request(app).get('/v1/auth/specialist-access').set('Authorization', token)

    expect(res.status).toBe(403)
  })

  it('still lets an admin in, and as a manager', async () => {
    const token = signedInAs('admin', 'boss@clearcaseiq.com')

    const res = await request(app).get('/v1/auth/specialist-access').set('Authorization', token)

    expect(res.status).toBe(200)
    expect(res.body.isManager).toBe(true)
  })
})
