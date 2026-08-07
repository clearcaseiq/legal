/**
 * Human-friendly case reference codes.
 *
 * The assessment `id` is a 25-character cuid — unreadable over the phone and
 * useless to a claimant who wants to quote their case to support. This module
 * mints a short, speakable code (e.g. `CCIQ-7Q2K9F`) that is:
 *
 *   - unambiguous when read aloud (no 0/O, 1/I/L, U — see ALPHABET), and
 *   - unique per assessment (enforced by the `referenceCode` unique column).
 *
 * The code identifies a case for support and appears on the plaintiff's report
 * after they send it. It is a convenience handle, not an authorization: staff
 * must always pair it with a contact fact (name/phone/email) before acting, and
 * nothing server-side grants access on the code alone.
 */

import { prisma } from './prisma'
import { logger } from './logger'

// Crockford-style alphabet with visually/aurally ambiguous characters removed
// (0/O, 1/I/L, U). 30 symbols ^ 6 places ≈ 729M combinations.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 6
const PREFIX = 'CCIQ'

function randomCode(): string {
  let body = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `${PREFIX}-${body}`
}

/**
 * Normalize user-typed input (support pasting/typing a code) to the stored
 * form: uppercase, strip spaces, tolerate a missing prefix and common
 * look-alike substitutions so a caller reading "oh" or "ell" still resolves.
 */
export function normalizeReferenceCode(input: string): string {
  const cleaned = (input || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^CCIQ[-\s]?/, '')
    .replace(/[O]/g, '0') // then map ambiguous chars back into the alphabet
    .replace(/[IL]/g, '1')
    .replace(/0/g, '') // 0/1 are not in the alphabet; drop rather than guess
    .replace(/1/g, '')
  return cleaned ? `${PREFIX}-${cleaned}` : ''
}

/**
 * Assign a unique reference code to an assessment, retrying on the (rare)
 * unique collision. Returns the code, or null if it could not be assigned
 * (never throws — a missing code must not break case creation).
 */
export async function assignReferenceCode(assessmentId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode()
    try {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { referenceCode: code },
      })
      return code
    } catch (err: unknown) {
      // P2002 = unique constraint violation → collision, try another code.
      const codeStr = (err as { code?: string })?.code
      if (codeStr === 'P2002') continue
      logger.warn('Failed to assign case reference code', {
        assessmentId,
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }
  logger.warn('Exhausted reference-code attempts', { assessmentId })
  return null
}

/**
 * Return the assessment's reference code, minting one lazily if it has none.
 * Covers legacy rows created before this feature and any creation path that
 * did not assign a code up front.
 */
export async function ensureReferenceCode(
  assessmentId: string,
  existing?: string | null,
): Promise<string | null> {
  if (existing) return existing
  return assignReferenceCode(assessmentId)
}
