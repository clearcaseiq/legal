/**
 * Opening an email verification link a second time.
 *
 * The token is single-use, so the second open failed with no role attached, and
 * the page fell back to the plaintiff sign-in screen. An attorney who clicked
 * their verification email twice was sent to the claimant login.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const TOKEN = 'a'.repeat(48)
const future = () => new Date(Date.now() + 60 * 60 * 1000)
const past = () => new Date(Date.now() - 60 * 60 * 1000)

describe('POST /v1/auth/verify-email on a link already used or expired', () => {
  const app = buildApp()

  beforeEach(() => resetUniversalPrismaMock())

  it('says an already verified attorney is verified and names their role', async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: past(), expiresAt: future(),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'attorney', emailVerified: true } as any)

    const res = await request(app).post('/v1/auth/verify-email').send({ token: TOKEN })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, alreadyVerified: true, role: 'attorney' })
    expect(prisma.emailVerificationToken.update).not.toHaveBeenCalled()
  })

  it('still fails an expired link, but with the role for the right sign-in screen', async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      id: 't1', userId: 'u1', usedAt: null, expiresAt: past(),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'attorney', emailVerified: false } as any)

    const res = await request(app).post('/v1/auth/verify-email').send({ token: TOKEN })

    expect(res.status).toBe(400)
    expect(res.body.role).toBe('attorney')
  })

  it('gives an unknown token no role', async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null)

    const res = await request(app).post('/v1/auth/verify-email').send({ token: TOKEN })

    expect(res.status).toBe(400)
    expect(res.body.role).toBeUndefined()
  })
})
