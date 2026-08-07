import type { Response, NextFunction } from 'express'
import { ENV } from '../env'
import { logger } from './logger'

/** Platform admin capability scopes. */
export const ADMIN_CAPABILITIES = ['ops', 'network', 'oversight', 'config', 'users'] as const
export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number]

/** Emails allowed to use admin API routes and admin login (same list as ADMIN_EMAILS). */
export function isAdminEmail(email: string): boolean {
  const list = adminEmailList()
  return list.includes(email.trim().toLowerCase())
}

/** Parsed ADMIN_EMAILS, trimmed + lowercased so callers can't disagree on the same env value. */
export function adminEmailList(): string[] {
  return (ENV.ADMIN_EMAILS ?? 'admin@caseiq.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Minimal shape needed to authorize an admin — avoids importing AuthRequest (cycle-free). */
type AdminCandidate = {
  email?: string | null
  role?: string | null
  adminCapabilities?: string | string[] | null
}

/**
 * Single source of truth for "is this user an admin".
 *
 * Two paths grant access, in this order:
 *  1. `ADMIN_EMAILS` env allowlist — bootstrap / break-glass access that works even
 *     when no DB row has the role yet.
 *  2. `User.role === 'admin'` — the role granted through Admin → User Roles.
 */
export function isAdminUser(user: AdminCandidate | null | undefined): boolean {
  if (!user) return false
  const email = (user.email || '').trim()
  if (email && isAdminEmail(email)) return true
  return (user.role || '').trim().toLowerCase() === 'admin'
}

export function parseAdminCapabilities(raw: string | string[] | null | undefined): AdminCapability[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is AdminCapability =>
      ADMIN_CAPABILITIES.includes(item as AdminCapability),
    )
  }
  if (!raw || !String(raw).trim()) return []
  try {
    const parsed = JSON.parse(String(raw))
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is AdminCapability =>
        ADMIN_CAPABILITIES.includes(item as AdminCapability),
      )
    }
  } catch {
    // comma-separated fallback
    return String(raw)
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is AdminCapability => ADMIN_CAPABILITIES.includes(item as AdminCapability))
  }
  return []
}

/**
 * Resolve effective capabilities for an admin.
 * - Allowlist emails always get every capability (break-glass).
 * - Null/empty stored capabilities = full access (backward compatible).
 * - Otherwise the stored list is honored.
 */
export function resolveAdminCapabilities(user: AdminCandidate | null | undefined): AdminCapability[] {
  if (!isAdminUser(user)) return []
  const email = (user?.email || '').trim()
  if (email && isAdminEmail(email)) return [...ADMIN_CAPABILITIES]
  const stored = parseAdminCapabilities(user?.adminCapabilities)
  if (stored.length === 0) return [...ADMIN_CAPABILITIES]
  return stored
}

export function hasAdminCapability(
  user: AdminCandidate | null | undefined,
  capability: AdminCapability,
): boolean {
  return resolveAdminCapabilities(user).includes(capability)
}

/**
 * Express guard for admin-only routes. Must run after `authMiddleware` (it reads
 * `req.user`). Shared by every admin router so the gate can't drift between files.
 */
export function adminMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  } catch (error) {
    logger.error('Admin middleware error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Require one or more admin capabilities after adminMiddleware.
 * Example: `router.put('/matching-rules', authMiddleware, adminMiddleware, requireAdminCapability('config'), …)`
 */
export function requireAdminCapability(...capabilities: AdminCapability[]) {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !isAdminUser(req.user)) {
        return res.status(403).json({ error: 'Admin access required' })
      }
      const granted = resolveAdminCapabilities(req.user)
      const missing = capabilities.filter((cap) => !granted.includes(cap))
      if (missing.length > 0) {
        return res.status(403).json({
          error: 'Insufficient admin capability',
          code: 'ADMIN_CAPABILITY_REQUIRED',
          required: capabilities,
          missing,
        })
      }
      next()
    } catch (error) {
      logger.error('Admin capability middleware error', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
