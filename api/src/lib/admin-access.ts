import type { Response, NextFunction } from 'express'
import { ENV } from '../env'
import { logger } from './logger'

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
type AdminCandidate = { email?: string | null; role?: string | null }

/**
 * Single source of truth for "is this user an admin".
 *
 * Two paths grant access, in this order:
 *  1. `ADMIN_EMAILS` env allowlist — bootstrap / break-glass access that works even
 *     when no DB row has the role yet.
 *  2. `User.role === 'admin'` — the role granted through Admin → User Roles.
 *
 * Previously only (1) was honored by /v1/admin/*, while /v1/compliance/* and
 * /v1/tier-routing/* honored (2) via requireRole. That meant promoting someone to
 * admin in the UI granted a handful of screens and 403'd on the other ~53
 * endpoints, so the Roles page advertised a permission the platform never granted.
 */
export function isAdminUser(user: AdminCandidate | null | undefined): boolean {
  if (!user) return false
  const email = (user.email || '').trim()
  if (email && isAdminEmail(email)) return true
  return (user.role || '').trim().toLowerCase() === 'admin'
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
