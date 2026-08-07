/**
 * "Claim your case" tokens.
 *
 * A guest who sends a case without an account gets an email link that lets them
 * register and have that exact case attached to the new account. The link
 * carries a signed token rather than a raw assessment id so it:
 *
 *   - proves the link came from us (HMAC over the platform JWT secret), and
 *   - expires, so a forwarded/leaked email stops working after a window.
 *
 * The token authorizes claiming one specific assessment; the claim endpoint
 * still runs the same ownership transfer rules as `/assessments/associate`
 * (only unowned or synthetic guest-owned cases move), so a token can never
 * steal a case that already belongs to a real account.
 */

import jwt from 'jsonwebtoken'
import { ENV } from '../env'

const CLAIM_TOKEN_TTL = '30d'
const CLAIM_PURPOSE = 'assessment_claim'

interface ClaimTokenPayload {
  assessmentId: string
  purpose: typeof CLAIM_PURPOSE
}

export function createClaimToken(assessmentId: string): string {
  return jwt.sign({ assessmentId, purpose: CLAIM_PURPOSE }, ENV.JWT_SECRET, {
    expiresIn: CLAIM_TOKEN_TTL,
  })
}

/** Returns the assessment id the token authorizes, or null if invalid/expired. */
export function verifyClaimToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as Partial<ClaimTokenPayload>
    if (decoded?.purpose !== CLAIM_PURPOSE || !decoded?.assessmentId) return null
    return decoded.assessmentId
  } catch {
    return null
  }
}
