import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** One in-memory account, enough to drive the session and MFA code paths end to end. */
const { store } = vi.hoisted(() => ({ store: { user: null as Record<string, any> | null } }))

vi.mock('./prisma', () => {
  const applyUpdate = (data: Record<string, any>) => {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'increment' in value) {
        store.user![key] = (store.user![key] ?? 0) + value.increment
      } else {
        store.user![key] = value
      }
    }
    return { ...store.user }
  }
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async () => (store.user ? { ...store.user } : null)),
        update: vi.fn(async ({ data }: { data: Record<string, any> }) => applyUpdate(data)),
      },
      auditLog: { create: vi.fn(async () => ({})) },
    },
  }
})

import { ENV } from '../env'
import { generateToken, issueSessionToken, requiresMfa, resolveSession } from './auth'
import { confirmMfaEnrollment, beginMfaEnrollment, resetMfa, verifyMfaCode, MAX_MFA_FAILURES } from './mfa'
import { isAdminUser } from './admin-access'
import { totpAt, totpStep } from './totp'

function baseUser(overrides: Record<string, any> = {}) {
  return {
    id: 'u1',
    email: 'lawyer@firm.com',
    firstName: 'Lee',
    lastName: 'Law',
    isActive: true,
    emailVerified: true,
    role: 'attorney',
    adminCapabilities: null,
    preferredLanguage: null,
    sessionVersion: 0,
    mfaEnabledAt: null,
    mfaSecret: null,
    mfaPendingSecret: null,
    mfaRecoveryCodes: null,
    mfaLastUsedStep: null,
    mfaFailedAttempts: 0,
    mfaLockedUntil: null,
    ...overrides,
  }
}

beforeEach(() => {
  ENV.MFA_REQUIRED_ROLES = ['admin', 'attorney']
  store.user = baseUser()
})

describe('session revocation', () => {
  it('rejects a token issued under an earlier session version', async () => {
    const token = generateToken('u1', { sessionVersion: 0, mfa: true })
    store.user!.sessionVersion = 1
    await expect(resolveSession(token)).resolves.toMatchObject({ ok: false, status: 401, body: { code: 'SESSION_REVOKED' } })
  })

  it('treats a token minted before versioning as version 0', async () => {
    store.user!.role = 'client'
    const legacy = jwt.sign({ userId: 'u1' }, ENV.JWT_SECRET)
    await expect(resolveSession(legacy)).resolves.toMatchObject({ ok: true })
    store.user!.sessionVersion = 1
    await expect(resolveSession(legacy)).resolves.toMatchObject({ ok: false, body: { code: 'SESSION_REVOKED' } })
  })
})

describe('the MFA gate', () => {
  it('admits an attorney token without MFA only to the MFA endpoints', async () => {
    const token = issueSessionToken(store.user as any)
    await expect(resolveSession(token)).resolves.toMatchObject({
      ok: false,
      status: 401,
      body: { code: 'MFA_REQUIRED', mfaEnrolled: false },
    })
    await expect(resolveSession(token, { allowPendingMfa: true })).resolves.toMatchObject({ ok: true, mfaPending: true })
  })

  it('makes the pre-MFA token short-lived', () => {
    const decoded = jwt.decode(issueSessionToken(store.user as any)) as { exp: number; iat: number }
    expect(decoded.exp - decoded.iat).toBe(15 * 60)
  })

  it('admits the token issued after a code', async () => {
    const token = issueSessionToken(store.user as any, { mfaVerified: true })
    await expect(resolveSession(token)).resolves.toMatchObject({ ok: true, mfaVerified: true, user: { role: 'attorney' } })
  })

  it('does not ask plaintiffs for a code', async () => {
    store.user!.role = 'client'
    expect(requiresMfa(store.user as any)).toBe(false)
    await expect(resolveSession(issueSessionToken(store.user as any))).resolves.toMatchObject({ ok: true, user: { role: 'user' } })
  })

  it('can be switched off by configuration', () => {
    ENV.MFA_REQUIRED_ROLES = []
    expect(requiresMfa(store.user as any)).toBe(false)
  })
})

describe('allowlisted admin emails', () => {
  it('confer admin only once the email is verified', () => {
    const previous = ENV.ADMIN_EMAILS
    ENV.ADMIN_EMAILS = 'owner@clearcaseiq.com'
    try {
      expect(isAdminUser({ email: 'owner@clearcaseiq.com', role: 'client', emailVerified: false })).toBe(false)
      expect(isAdminUser({ email: 'owner@clearcaseiq.com', role: 'client', emailVerified: true })).toBe(true)
      expect(requiresMfa({ email: 'owner@clearcaseiq.com', role: 'client', emailVerified: true })).toBe(true)
    } finally {
      ENV.ADMIN_EMAILS = previous
    }
  })
})

describe('enrollment and verification', () => {
  async function enroll(): Promise<{ secret: string; recoveryCodes: string[] }> {
    const begun = await beginMfaEnrollment({ id: 'u1', email: 'lawyer@firm.com' })
    if (!begun.ok) throw new Error('setup failed')
    // Last step's code, so the step-at-enrollment does not block the first sign-in code.
    const result = await confirmMfaEnrollment('u1', totpAt(begun.secret, totpStep() - 1))
    if (!result.ok) throw new Error('enable failed')
    return { secret: begun.secret, recoveryCodes: result.recoveryCodes! }
  }

  it('stores the secret encrypted and the recovery codes hashed', async () => {
    const { secret, recoveryCodes } = await enroll()
    expect(store.user!.mfaEnabledAt).toBeInstanceOf(Date)
    expect(store.user!.mfaSecret).toMatch(/^enc:v1:/)
    expect(store.user!.mfaSecret).not.toContain(secret)
    expect(recoveryCodes).toHaveLength(10)
    expect(store.user!.mfaRecoveryCodes).not.toContain(recoveryCodes[0])
  })

  it('refuses to replace a working factor', async () => {
    await enroll()
    await expect(beginMfaEnrollment({ id: 'u1', email: 'lawyer@firm.com' })).resolves.toMatchObject({
      ok: false,
      code: 'MFA_ALREADY_ENROLLED',
    })
  })

  it('accepts a current code once and rejects its replay', async () => {
    const { secret } = await enroll()
    const code = totpAt(secret, totpStep())
    await expect(verifyMfaCode('u1', code)).resolves.toMatchObject({ ok: true })
    await expect(verifyMfaCode('u1', code)).resolves.toMatchObject({ ok: false, code: 'MFA_INVALID_CODE' })
  })

  it('consumes a recovery code on use', async () => {
    const { recoveryCodes } = await enroll()
    await expect(verifyMfaCode('u1', recoveryCodes[3].toUpperCase())).resolves.toMatchObject({ ok: true, usedRecoveryCode: true })
    await expect(verifyMfaCode('u1', recoveryCodes[3])).resolves.toMatchObject({ ok: false })
    expect(JSON.parse(store.user!.mfaRecoveryCodes)).toHaveLength(9)
  })

  it('locks out after repeated wrong codes', async () => {
    await enroll()
    for (let i = 0; i < MAX_MFA_FAILURES; i += 1) {
      await verifyMfaCode('u1', '000000')
    }
    await expect(verifyMfaCode('u1', '000000')).resolves.toMatchObject({ ok: false, status: 429, code: 'MFA_LOCKED' })
  })

  it('an admin reset clears the factor and ends every session', async () => {
    await enroll()
    const token = issueSessionToken(store.user as any, { mfaVerified: true })
    await resetMfa('u1', 'admin-1')
    expect(store.user!.mfaEnabledAt).toBeNull()
    await expect(resolveSession(token)).resolves.toMatchObject({ ok: false, body: { code: 'SESSION_REVOKED' } })
  })
})
