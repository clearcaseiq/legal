/**
 * When a returning attorney has to prove who they are again.
 *
 * Biometric sign-in used to be decorative: passing the prompt simply re-read the
 * token already sitting in SecureStore, and nothing ever asked again. A phone
 * handed to someone else, or picked up off a desk, opened straight into the case
 * list — which on this app means medical records and claimant contact details.
 *
 * Kept free of React Native imports so the rules can be tested directly.
 */

/**
 * How long the app may sit in the background before it asks again. Short enough
 * to matter if the phone changes hands, long enough that taking a photo of a
 * document or checking a calendar invite does not cost a prompt.
 */
export const IDLE_LOCK_MS = 5 * 60 * 1000

/**
 * Matches the API's JWT_EXPIRES_IN default of 7d. Past this the stored token is
 * already refused by the server, so there is nothing to unlock and the honest
 * response is to send the attorney back to sign-in.
 */
export const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function shouldLockOnResume(params: {
  /** When the app last went to the background, or null if it has not. */
  backgroundedAt: number | null
  now: number
  isAuthenticated: boolean
  /** Whether the device can actually satisfy a biometric prompt. */
  canPrompt: boolean
  idleMs?: number
}): boolean {
  const { backgroundedAt, now, isAuthenticated, canPrompt } = params
  const idleMs = params.idleMs ?? IDLE_LOCK_MS

  // Nothing on screen to protect.
  if (!isAuthenticated) return false
  // Locking a device with no enrolled biometrics would strand the attorney
  // behind a prompt they cannot answer, mid-case.
  if (!canPrompt) return false
  if (backgroundedAt === null) return false

  return now - backgroundedAt >= idleMs
}

/**
 * True when the stored session is old enough that the server will refuse it.
 *
 * An unknown issue time is not treated as expired: it means the token was stored
 * before this bookkeeping existed, and signing out everyone who upgrades is a
 * worse trade than waiting for the 401 that a genuinely dead token produces.
 */
export function isSessionExpired(issuedAt: number | null, now: number, maxAgeMs = MAX_SESSION_AGE_MS): boolean {
  if (issuedAt === null) return false
  return now - issuedAt >= maxAgeMs
}
