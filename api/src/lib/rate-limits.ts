/**
 * Per-endpoint rate limits for the unauthenticated, expensive, or abusable routes.
 *
 * The app-wide limiter in `server.ts` is a blunt instrument: one budget covering
 * every route, sized so that a normal dashboard session (which fans out into
 * dozens of reads) is not throttled. That ceiling is far too generous for the
 * handful of endpoints an anonymous caller can reach, so those get their own
 * tighter budget on top of it:
 *
 *  - Credential endpoints, because a shared 15-minute budget sized for page
 *    loads leaves ample room for password guessing.
 *  - Intake lead capture, because creating a lead sends an email and an SMS and
 *    provisions an account — one unauthenticated request with real-world cost
 *    and a real-world bill attached.
 *  - Evidence upload and the OCR/vision pre-checks, because each one writes a
 *    file and can trigger paid document intelligence.
 *
 * Limits are per-IP and deliberately well above what a real claimant does, so
 * they bite on automation rather than on a slow, careful person filling in a
 * form. Tests are exempt: supertest drives hundreds of requests from one address
 * and would otherwise trip every limiter here.
 */

import rateLimit, { type Options } from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000

function isExempt(): boolean {
  return process.env.NODE_ENV === 'test'
}

function build(name: string, max: number, message: string, windowMs = FIFTEEN_MINUTES) {
  const options: Partial<Options> = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message, code: `rate_limited_${name}` },
    // Preflight is automatic browser traffic; counting it halves the real budget
    // and a throttled OPTIONS breaks every request that follows.
    skip: (req) => req.method === 'OPTIONS' || isExempt(),
  }
  return rateLimit(options)
}

/** Sign-in, registration, and password reset. */
export const authLimiter = build(
  'auth',
  30,
  'Too many attempts. Please wait a few minutes and try again.',
)

/**
 * Intake lead create/update. Generous because the wizard autosaves as the
 * claimant advances, but bounded because each new lead costs an email and an SMS.
 */
export const intakeLimiter = build(
  'intake',
  120,
  'Too many requests. Please wait a moment and continue your assessment.',
)

/** Evidence upload and the in-memory OCR/vision pre-checks. */
export const uploadLimiter = build(
  'upload',
  60,
  'Too many uploads. Please wait a few minutes and try again.',
)
