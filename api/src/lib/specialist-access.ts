/**
 * Authorization for Case Specialists — ClearCaseIQ employees who work the
 * assisted-intake queue.
 *
 * Kept separate from `admin-access` on purpose. `adminMiddleware` gates the
 * whole admin API on `role === 'admin'`, and widening it to include specialists
 * would hand them payments, matching rules and user administration along with
 * their queue. Specialists get their own gate, and admins pass it because they
 * supervise the queue.
 */
import type { Response, NextFunction } from 'express'
import { isAdminUser } from './admin-access'
import { logger } from './logger'

export const SPECIALIST_ROLE = 'specialist'

/** Minimal shape needed to authorize — avoids importing AuthRequest (cycle-free). */
type SpecialistCandidate = {
  email?: string | null
  role?: string | null
  adminCapabilities?: string | string[] | null
}

/** True for a user whose role is exactly `specialist`. */
export function isSpecialistRole(user: SpecialistCandidate | null | undefined): boolean {
  return (user?.role || '').trim().toLowerCase() === SPECIALIST_ROLE
}

/**
 * True for anyone allowed to work the Case Assistance queue: specialists, and
 * admins in their supervisory capacity.
 */
export function canWorkCaseAssistance(user: SpecialistCandidate | null | undefined): boolean {
  if (!user) return false
  return isSpecialistRole(user) || isAdminUser(user)
}

/**
 * Express guard for the Case Assistance API. Must run after `authMiddleware`
 * (it reads `req.user`).
 */
export function specialistMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!canWorkCaseAssistance(req.user)) {
      return res.status(403).json({ error: 'Case Assistance access required', code: 'NOT_SPECIALIST' })
    }
    next()
  } catch (error) {
    logger.error('Specialist middleware error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Manager privileges inside Case Assistance — reassigning other people's cases
 * and seeing per-specialist counts. Admins only; a specialist supervises nobody.
 */
export function isCaseAssistanceManager(user: SpecialistCandidate | null | undefined): boolean {
  return isAdminUser(user)
}
