/**
 * TOTP multi-factor authentication for privileged accounts.
 *
 * Which accounts must use it is decided by `requiresMfa` in `auth.ts`; this
 * module owns enrollment, verification and recovery. The secret is stored
 * encrypted, and recovery codes only as hashes, so a database read alone does
 * not yield a second factor.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { decryptSecret, encryptSecret } from './cms/crypto'
import { generateTotpSecret, matchTotpStep, otpauthUri } from './totp'

export const MFA_ISSUER = 'ClearCaseIQ'
export const RECOVERY_CODE_COUNT = 10
/** Failed codes allowed before the account is locked out of MFA for a while. */
export const MAX_MFA_FAILURES = 5
export const MFA_LOCKOUT_MS = 15 * 60_000

const prismaAny = prisma as any

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')
}

function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]+/g, '').toLowerCase()
}

/** `xxxxx-xxxxx`, 50 bits each: enough that a code cannot be guessed inside the lockout budget. */
function newRecoveryCode(): string {
  const raw = randomBytes(8).toString('hex').slice(0, 10)
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

function parseHashes(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

async function audit(userId: string, action: string, metadata: Record<string, unknown> = {}, ipAddress?: string | null) {
  await prismaAny.auditLog
    .create({
      data: {
        userId,
        action,
        entityType: 'user',
        entityId: userId,
        ipAddress: ipAddress || null,
        metadata: JSON.stringify(metadata),
      },
    })
    .catch((error: unknown) =>
      logger.error('Failed to audit MFA event', { userId, action, error: error instanceof Error ? error.message : String(error) })
    )
}

export type MfaStatus = { enrolled: boolean; recoveryCodesRemaining: number }

export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const user = await prismaAny.user.findUnique({
    where: { id: userId },
    select: { mfaEnabledAt: true, mfaRecoveryCodes: true },
  })
  return {
    enrolled: Boolean(user?.mfaEnabledAt),
    recoveryCodesRemaining: parseHashes(user?.mfaRecoveryCodes).length,
  }
}

/**
 * Issue a fresh secret for enrollment. Refused once MFA is on: replacing a
 * working factor must go through an admin reset, or a stolen pending token
 * could swap in the thief's authenticator.
 */
export async function beginMfaEnrollment(user: { id: string; email: string }): Promise<
  { ok: true; secret: string; otpauthUrl: string } | { ok: false; error: string; code: string }
> {
  const current = await prismaAny.user.findUnique({ where: { id: user.id }, select: { mfaEnabledAt: true } })
  if (current?.mfaEnabledAt) {
    return { ok: false, error: 'Two-step verification is already set up for this account.', code: 'MFA_ALREADY_ENROLLED' }
  }
  const secret = generateTotpSecret()
  await prismaAny.user.update({
    where: { id: user.id },
    data: { mfaPendingSecret: encryptSecret(secret) },
  })
  return { ok: true, secret, otpauthUrl: otpauthUri({ secret, accountName: user.email, issuer: MFA_ISSUER }) }
}

type LockState = { mfaFailedAttempts: number; mfaLockedUntil: Date | null }

function lockedOut(user: LockState): boolean {
  return Boolean(user.mfaLockedUntil && user.mfaLockedUntil.getTime() > Date.now())
}

async function recordFailure(userId: string, user: LockState, ipAddress?: string | null): Promise<void> {
  const failures = (user.mfaFailedAttempts ?? 0) + 1
  const lock = failures >= MAX_MFA_FAILURES
  await prismaAny.user.update({
    where: { id: userId },
    data: lock
      ? { mfaFailedAttempts: 0, mfaLockedUntil: new Date(Date.now() + MFA_LOCKOUT_MS) }
      : { mfaFailedAttempts: failures },
  })
  if (lock) {
    logger.warn('MFA locked after repeated failures', { userId })
    await audit(userId, 'mfa_locked', { failures }, ipAddress)
  }
}

export type MfaCheckResult =
  | { ok: true; recoveryCodes?: string[]; usedRecoveryCode?: boolean }
  | { ok: false; status: number; error: string; code: string }

const LOCKED_RESULT: MfaCheckResult = {
  ok: false,
  status: 429,
  error: 'Too many incorrect codes. Try again in 15 minutes.',
  code: 'MFA_LOCKED',
}

const INVALID_RESULT: MfaCheckResult = {
  ok: false,
  status: 400,
  error: 'That code is not valid. Check your authenticator app and try again.',
  code: 'MFA_INVALID_CODE',
}

/** Confirm enrollment with a first code; returns the one-time recovery codes. */
export async function confirmMfaEnrollment(userId: string, code: string, ipAddress?: string | null): Promise<MfaCheckResult> {
  const user = await prismaAny.user.findUnique({
    where: { id: userId },
    select: { mfaPendingSecret: true, mfaEnabledAt: true, mfaFailedAttempts: true, mfaLockedUntil: true },
  })
  if (!user) return { ok: false, status: 404, error: 'Account not found.', code: 'NOT_FOUND' }
  if (user.mfaEnabledAt) {
    return { ok: false, status: 409, error: 'Two-step verification is already set up.', code: 'MFA_ALREADY_ENROLLED' }
  }
  if (lockedOut(user)) return LOCKED_RESULT
  const secret = decryptSecret(user.mfaPendingSecret)
  if (!secret) {
    return { ok: false, status: 400, error: 'Start setup again to get a new code.', code: 'MFA_SETUP_NOT_STARTED' }
  }
  const step = matchTotpStep(secret, code)
  if (step === null) {
    await recordFailure(userId, user, ipAddress)
    return INVALID_RESULT
  }

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  await prismaAny.user.update({
    where: { id: userId },
    data: {
      mfaSecret: encryptSecret(secret),
      mfaPendingSecret: null,
      mfaEnabledAt: new Date(),
      mfaRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
      mfaLastUsedStep: step,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    },
  })
  await audit(userId, 'mfa_enrolled', {}, ipAddress)
  logger.info('MFA enrolled', { userId })
  return { ok: true, recoveryCodes }
}

/** Check a TOTP or recovery code at sign-in. A recovery code is consumed on use. */
export async function verifyMfaCode(userId: string, code: string, ipAddress?: string | null): Promise<MfaCheckResult> {
  const user = await prismaAny.user.findUnique({
    where: { id: userId },
    select: {
      mfaSecret: true,
      mfaEnabledAt: true,
      mfaRecoveryCodes: true,
      mfaLastUsedStep: true,
      mfaFailedAttempts: true,
      mfaLockedUntil: true,
    },
  })
  if (!user?.mfaEnabledAt) {
    return { ok: false, status: 400, error: 'Two-step verification is not set up yet.', code: 'MFA_NOT_ENROLLED' }
  }
  if (lockedOut(user)) return LOCKED_RESULT

  const trimmed = String(code || '').trim()
  if (/^\d{6}$/.test(trimmed.replace(/\s+/g, ''))) {
    const secret = decryptSecret(user.mfaSecret)
    const step = secret ? matchTotpStep(secret, trimmed) : null
    // A step at or before the last accepted one is a replay of a code already used.
    if (step !== null && (user.mfaLastUsedStep === null || step > user.mfaLastUsedStep)) {
      await prismaAny.user.update({
        where: { id: userId },
        data: { mfaLastUsedStep: step, mfaFailedAttempts: 0, mfaLockedUntil: null },
      })
      return { ok: true }
    }
  } else {
    const hashes = parseHashes(user.mfaRecoveryCodes)
    const candidate = Buffer.from(hashRecoveryCode(trimmed))
    const index = hashes.findIndex((hash) => {
      const stored = Buffer.from(hash)
      return stored.length === candidate.length && timingSafeEqual(stored, candidate)
    })
    if (index !== -1) {
      const remaining = hashes.filter((_, i) => i !== index)
      await prismaAny.user.update({
        where: { id: userId },
        data: { mfaRecoveryCodes: JSON.stringify(remaining), mfaFailedAttempts: 0, mfaLockedUntil: null },
      })
      await audit(userId, 'mfa_recovery_code_used', { remaining: remaining.length }, ipAddress)
      return { ok: true, usedRecoveryCode: true }
    }
  }

  await recordFailure(userId, user, ipAddress)
  return INVALID_RESULT
}

/**
 * Clear a user's MFA (lost phone, no recovery codes) so they enroll again at
 * next sign-in. Also ends their sessions, since the factor they were issued
 * under is gone.
 */
export async function resetMfa(userId: string, actorId: string, ipAddress?: string | null): Promise<void> {
  await prismaAny.user.update({
    where: { id: userId },
    data: {
      mfaSecret: null,
      mfaPendingSecret: null,
      mfaEnabledAt: null,
      mfaRecoveryCodes: null,
      mfaLastUsedStep: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  })
  await audit(userId, 'mfa_reset', { actorId }, ipAddress)
  logger.info('MFA reset', { userId, actorId })
}
