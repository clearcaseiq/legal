/**
 * Launch hardening for accounts: reserved admin addresses, verified email for
 * privileged sign-in, and sessions that end when the password changes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

vi.mock('bcryptjs', () => ({
  __esModule: true as const,
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedpasswordhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))
vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/email-verification', () => ({
  issueEmailVerification: vi.fn().mockResolvedValue(true),
  notifyEmailAddressChanged: vi.fn().mockResolvedValue(true),
}))
vi.mock('./lib/claims', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/claims')>()),
  sendClaimEmail: vi.fn().mockResolvedValue(true),
}))

import { buildApp } from './build-app'
import { ENV } from './env'
import { prisma } from './lib/prisma'
import { generateToken } from './lib/auth'
import { issueEmailVerification } from './lib/email-verification'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const RESERVED = 'owner@clearcaseiq.com'
const app = buildApp()
let previousAdminEmails: string

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'someone@example.com',
    passwordHash: 'hash',
    firstName: 'Sam',
    lastName: 'One',
    phone: null,
    isActive: true,
    emailVerified: true,
    role: 'client',
    provider: 'local',
    adminCapabilities: null,
    preferredLanguage: 'en',
    sessionVersion: 0,
    mfaEnabledAt: null,
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(issueEmailVerification).mockClear()
  previousAdminEmails = ENV.ADMIN_EMAILS
  ENV.ADMIN_EMAILS = RESERVED
})

afterEach(() => {
  ENV.ADMIN_EMAILS = previousAdminEmails
})

describe('reserved admin addresses', () => {
  it('cannot be registered', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ email: RESERVED, password: 'password123', firstName: 'A', lastName: 'B' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_RESERVED')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('cannot be taken over by an email change', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow() as any)
    const res = await request(app)
      .put('/v1/auth/me')
      .set('Authorization', `Bearer ${generateToken('u1')}`)
      .send({ email: RESERVED })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_RESERVED')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('can be claimed by its owner through the reset link, which goes to that inbox', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.user.create).mockResolvedValue(accountRow({ email: RESERVED, passwordHash: null, provider: null, emailVerified: false }) as any)
    const res = await request(app).post('/v1/auth/request-password-reset').send({ email: RESERVED })
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.user.create).mock.calls[0][0].data).toMatchObject({ email: RESERVED, emailVerified: false })
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
  })

  it('do not sign in as admin until verified', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow({ email: RESERVED, emailVerified: false }) as any)
    const res = await request(app).post('/v1/auth/login').send({ email: RESERVED, password: 'password123' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(issueEmailVerification).toHaveBeenCalled()
  })
})

describe('privileged sign-in', () => {
  it('refuses an attorney with an unverified email and resends the link', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow({ role: 'attorney', emailVerified: false }) as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1', email: 'someone@example.com', lawFirmId: null } as any)
    const res = await request(app).post('/v1/auth/attorney-login').send({ email: 'someone@example.com', password: 'password123' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(issueEmailVerification).toHaveBeenCalledTimes(1)
  })

  it('tells the client a verified attorney still owes a second step', async () => {
    const previousRoles = ENV.MFA_REQUIRED_ROLES
    ENV.MFA_REQUIRED_ROLES = ['admin', 'attorney']
    try {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow({ role: 'attorney' }) as any)
      vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1', email: 'someone@example.com', lawFirmId: null, specialties: null, venues: null } as any)
      const res = await request(app).post('/v1/auth/attorney-login').send({ email: 'someone@example.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.mfaRequired).toBe(true)
      expect((jwt.decode(res.body.token) as { mfa?: boolean }).mfa).toBeUndefined()
    } finally {
      ENV.MFA_REQUIRED_ROLES = previousRoles
    }
  })
})

describe('session revocation', () => {
  it('a password reset bumps the session version', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: 'prt-1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'client', email: 'someone@example.com', isActive: true },
    } as any)
    const res = await request(app).post('/v1/auth/reset-password').send({ token: 'a'.repeat(64), password: 'newpassword1' })
    expect(res.status).toBe(200)
    const update = vi.mocked(prisma.user.update).mock.calls.find((call) => (call[0] as any).where.id === 'u1')
    expect((update![0] as any).data.sessionVersion).toEqual({ increment: 1 })
  })

  it('a password change ends other sessions and hands this one a fresh token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow() as any)
    vi.mocked(prisma.user.update).mockResolvedValue(accountRow({ sessionVersion: 1 }) as any)
    const res = await request(app)
      .put('/v1/auth/change-password')
      .set('Authorization', `Bearer ${generateToken('u1')}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword1' })
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.user.update).mock.calls[0][0].data).toMatchObject({ sessionVersion: { increment: 1 } })
    expect((jwt.decode(res.body.token) as { sv: number }).sv).toBe(1)
  })

  it('rejects a token from before the reset', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(accountRow({ sessionVersion: 1 }) as any)
    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${generateToken('u1', { sessionVersion: 0 })}`)
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('SESSION_REVOKED')
  })
})
