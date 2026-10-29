import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'
import { ENV } from '../env'
import { isAdminUser } from './admin-access'

export interface AuthRequest extends Request {
  user?: any
}

const JWT_SECRET: Secret = ENV.JWT_SECRET
const JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN as SignOptions['expiresIn']
/**
 * Lifetime of a token that has passed the password but not MFA. It can reach
 * only the MFA endpoints, and only needs to outlive one enrollment.
 */
const PENDING_MFA_EXPIRES_IN = '15m'
const prismaAny = prisma as any

// Resolve the effective request role. Admin emails always win; otherwise we
// honor the stored User.role (client | attorney | staff | admin) so backend
// RBAC can actually see firm staff instead of collapsing everyone to "user".
// Legacy default "client" maps to "user" to preserve existing requireRole gates.
//
// Delegates the allowlist check to isAdminUser so this gate and adminMiddleware
// parse ADMIN_EMAILS identically, and so an allowlisted address confers admin
// only once it is verified.
// The roles this honors have to include every role the app authorizes on.
// `specialist` was missing, so a Case Specialist reached every authenticated
// route as `user`: the login endpoints read `User.role` from the database and
// signed them in correctly, then `/auth/specialist-access` and every
// `/case-assistance` route saw `user`, failed `canWorkCaseAssistance`, and 403'd.
// The queue shell reads that as a dead session, clears it and returns to the
// sign-in page - so signing in appeared to do nothing but reload the form.
// Admins were unaffected, which is why it survived: they match either the email
// allowlist or the `admin` role below.
const AUTHORIZED_ROLES = ['admin', 'attorney', 'staff', 'specialist']

type RoleSubject = { email: string; role?: string | null; emailVerified?: boolean | null }

export function resolveUserRole(user: RoleSubject): string {
  if (isAdminUser(user)) return 'admin'
  const stored = (user.role || '').toLowerCase()
  if (AUTHORIZED_ROLES.includes(stored)) return stored
  return 'user'
}

/** Whether this account must complete TOTP before its session is usable. */
export function requiresMfa(user: RoleSubject): boolean {
  const roles: string[] = ENV.MFA_REQUIRED_ROLES ?? []
  return roles.includes(resolveUserRole(user))
}

type TokenPayload = { userId: string; sv?: number; mfa?: boolean }

export function generateToken(
  userId: string,
  options: { sessionVersion?: number; mfa?: boolean; expiresIn?: SignOptions['expiresIn'] } = {}
): string {
  const payload: TokenPayload = { userId, sv: options.sessionVersion ?? 0 }
  if (options.mfa) payload.mfa = true
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn ?? JWT_EXPIRES_IN,
  })
}

export type SessionSubject = RoleSubject & { id: string; sessionVersion?: number | null }

/**
 * The token every sign-in path hands out. For an account that requires MFA and
 * has not just completed it, this is a short-lived token that `authMiddleware`
 * admits only to the MFA endpoints; the client upgrades it there.
 */
export function issueSessionToken(user: SessionSubject, options: { mfaVerified?: boolean } = {}): string {
  const sessionVersion = user.sessionVersion ?? 0
  if (requiresMfa(user) && !options.mfaVerified) {
    return generateToken(user.id, { sessionVersion, expiresIn: PENDING_MFA_EXPIRES_IN })
  }
  return generateToken(user.id, { sessionVersion, mfa: Boolean(options.mfaVerified) })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  emailVerified: true,
  role: true,
  adminCapabilities: true,
  preferredLanguage: true,
  sessionVersion: true,
  mfaEnabledAt: true,
} as const

export type SessionResolution =
  | { ok: true; user: any; mfaVerified: boolean; mfaPending: boolean }
  | { ok: false; status: number; body: Record<string, unknown> }

/**
 * Validate a bearer token against the account it names. Shared by the HTTP
 * middleware and the realtime socket so the two cannot disagree about which
 * tokens are live.
 */
export async function resolveSession(
  token: string,
  options: { allowPendingMfa?: boolean } = {}
): Promise<SessionResolution> {
  const decoded = verifyToken(token)
  const user = await prismaAny.user.findUnique({
    where: { id: decoded.userId },
    select: SESSION_USER_SELECT,
  })

  if (!user || !user.isActive) {
    return { ok: false, status: 401, body: { error: 'Invalid token' } }
  }

  // Tokens issued before session versioning carry no `sv`; they match version 0
  // and die with the first password reset like any other.
  if ((decoded.sv ?? 0) !== (user.sessionVersion ?? 0)) {
    return { ok: false, status: 401, body: { error: 'Your session has ended. Please sign in again.', code: 'SESSION_REVOKED' } }
  }

  const mfaPending = requiresMfa(user) && !decoded.mfa
  if (mfaPending && !options.allowPendingMfa) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'Two-step verification is required.',
        code: 'MFA_REQUIRED',
        mfaEnrolled: Boolean(user.mfaEnabledAt),
      },
    }
  }

  const { sessionVersion: _sv, mfaEnabledAt: _mfa, ...profile } = user
  return {
    ok: true,
    user: { ...profile, role: resolveUserRole(user) },
    mfaVerified: Boolean(decoded.mfa),
    mfaPending,
  }
}

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

function buildAuthMiddleware(options: { allowPendingMfa: boolean }) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const token = bearerToken(req)
      if (!token) {
        return res.status(401).json({ error: 'No token provided' })
      }
      const session = await resolveSession(token, options)
      if (!session.ok) {
        return res.status(session.status).json(session.body)
      }
      req.user = session.user
      ;(req as any).authSession = { mfaVerified: session.mfaVerified, mfaPending: session.mfaPending }
      next()
    } catch (error) {
      logger.error('Auth middleware error', { error })
      const detail = error instanceof Error ? error.message : String(error)
      res.status(401).json({
        error: 'Invalid token',
        ...(ENV.NODE_ENV === 'development' ? { detail } : {}),
      })
    }
  }
}

export const authMiddleware = buildAuthMiddleware({ allowPendingMfa: false })

/** For the MFA endpoints only: admits a token that has passed the password but not MFA. */
export const authMiddlewareAllowPendingMfa = buildAuthMiddleware({ allowPendingMfa: true })

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient privileges' })
    }
    next()
  }
}

export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = bearerToken(req)
  if (!token) {
    return next() // No token, but that's ok for optional auth
  }

  // Try to authenticate, but continue without auth if it fails
  try {
    const session = await resolveSession(token)
    if (session.ok) {
      req.user = session.user
    }
  } catch (error) {
    // Token invalid or expired, continue without auth
    logger.debug('Optional auth failed, continuing without authentication', { error })
  }

  next()
}
