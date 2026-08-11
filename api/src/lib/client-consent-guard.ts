import { Response, NextFunction } from 'express'
import { prisma } from './prisma'
import { ENV } from '../env'
import {
  PLAINTIFF_REQUIRED_CONSENT_TYPES,
  PlaintiffRequiredConsentType,
  getCurrentVersionsMap,
} from './consent-templates'
import { AuthRequest } from './auth'

function adminEmailSet(): Set<string> {
  const raw = ENV.ADMIN_EMAILS || 'admin@caseiq.com'
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isGuestCaseUserEmail(email: string): boolean {
  return /^guest\+.+@caseiq\.local$/i.test(email)
}

/** Plaintiffs who skip consent checks (guest shadow users, attorneys, admins). */
export async function isExemptFromClientConsent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) return true
  if (isGuestCaseUserEmail(user.email)) return true
  if (adminEmailSet().has(user.email.toLowerCase())) return true
  const attorney = await prisma.attorney.findUnique({
    where: { email: user.email },
    select: { id: true },
  })
  return !!attorney
}

export type ClientConsentResult = {
  ok: boolean
  /** Not yet granted */
  missing: PlaintiffRequiredConsentType[]
  /** Granted but for an older document version */
  outdated: PlaintiffRequiredConsentType[]
}

export async function getClientConsentCompliance(userId: string): Promise<ClientConsentResult> {
  if (await isExemptFromClientConsent(userId)) {
    return { ok: true, missing: [], outdated: [] }
  }

  const consents = await prisma.consent.findMany({
    where: {
      userId,
      granted: true,
      consentType: { in: [...PLAINTIFF_REQUIRED_CONSENT_TYPES] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      consentType: true,
      version: true,
      expiresAt: true,
    },
  })

  const versions = getCurrentVersionsMap()
  const now = new Date()
  const missing: PlaintiffRequiredConsentType[] = []
  const outdated: PlaintiffRequiredConsentType[] = []

  for (const t of PLAINTIFF_REQUIRED_CONSENT_TYPES) {
    const rows = consents.filter((c) => c.consentType === t)
    if (rows.length === 0) {
      missing.push(t)
      continue
    }
    // Prefer a non-expired row that matches the current document version. A newer
    // stale version (e.g. from a failed submit that fell back to "1.0") must not
    // hide a valid current grant.
    const current = rows.find(
      (c) => c.version === versions[t] && !(c.expiresAt && c.expiresAt < now),
    )
    if (current) continue
    const newest = rows[0]
    if (newest.expiresAt && newest.expiresAt < now) {
      missing.push(t)
      continue
    }
    if (newest.version !== versions[t]) outdated.push(t)
  }

  const ok = missing.length === 0 && outdated.length === 0
  return { ok, missing, outdated }
}

/**
 * Express middleware after authMiddleware. Attorneys, admins, and guest users bypass.
 */
export function requireClientConsentsMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id
      const { ok, missing, outdated } = await getClientConsentCompliance(userId)
      if (ok) return next()

      const stale = [...new Set([...missing, ...outdated])]
      return res.status(403).json({
        error: 'Required legal consents must be accepted for the current document versions.',
        code: 'REQUIRED_CONSENTS_INCOMPLETE',
        missingConsents: stale,
        details: { missing, outdated },
      })
    } catch (e) {
      return res.status(500).json({ error: 'Consent check failed' })
    }
  }
}

export async function assertClientConsentsForUserId(userId: string): Promise<void> {
  const { ok, missing, outdated } = await getClientConsentCompliance(userId)
  if (ok) return
  const err = new Error('REQUIRED_CONSENTS_INCOMPLETE') as Error & {
    code: string
    missingConsents: string[]
    details: ClientConsentResult
  }
  err.code = 'REQUIRED_CONSENTS_INCOMPLETE'
  err.missingConsents = [...new Set([...missing, ...outdated])]
  err.details = { ok, missing, outdated }
  throw err
}

/** Optional: block sensitive actions until email verified (off unless REQUIRE_EMAIL_VERIFICATION=true). */
export function requireVerifiedEmailMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!ENV.REQUIRE_EMAIL_VERIFICATION) return next()
    try {
      const userId = req.user!.id
      if (await isExemptFromClientConsent(userId)) return next()

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      })
      if (user?.emailVerified) return next()

      return res.status(403).json({
        error: 'Please verify your email address to use this feature.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
      })
    } catch {
      return res.status(500).json({ error: 'Verification check failed' })
    }
  }
}
