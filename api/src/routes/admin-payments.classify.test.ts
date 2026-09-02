import { describe, expect, it } from 'vitest'
import { classifyPaymentStatus, outcomeWhere, type PaymentOutcome } from './admin-payments'

/**
 * Every status the platform actually writes to `platform_payments`, with the
 * bucket the admin console should file it under. Drawn from the writers in
 * payments.ts rather than invented, because the gap this guards against was a
 * status the codebase produced and the classifier had never heard of.
 */
const KNOWN_STATUSES: Array<[string, PaymentOutcome]> = [
  // Settled. `payment_status` is normally 'paid'; the webhook falls back to
  // 'completed', and reconciliation also accepts 'succeeded' and 'complete'.
  ['paid', 'collected'],
  ['succeeded', 'collected'],
  ['complete', 'collected'],
  ['completed', 'collected'],
  ['PAID', 'collected'],

  ['checkout_created', 'pending'],
  ['expired', 'abandoned'],

  ['applied', 'subscription'],
  ['subscription_applied', 'subscription'],

  ['skipped_payments_disabled', 'waived'],
  ['skipped_stripe_not_configured', 'waived'],
  ['skipped_subscription', 'waived'],
  ['skipped_no_stripe', 'waived'],

  ['refunded', 'other'],
  ['partially_refunded', 'other'],
]

describe('classifyPaymentStatus', () => {
  it.each(KNOWN_STATUSES)('files %s under %s', (status, expected) => {
    expect(classifyPaymentStatus(status)).toBe(expected)
  })

  it('counts every settled spelling as revenue, not just "paid"', () => {
    // The regression: rows written from a session reporting anything other than
    // 'paid' were classified 'other' and dropped out of collected revenue.
    for (const status of ['succeeded', 'complete', 'completed']) {
      expect(classifyPaymentStatus(status)).toBe('collected')
    }
  })

  it('treats a missing status as unclassified rather than throwing', () => {
    expect(classifyPaymentStatus(null)).toBe('other')
    expect(classifyPaymentStatus(undefined)).toBe('other')
    expect(classifyPaymentStatus('')).toBe('other')
  })
})

describe('outcomeWhere', () => {
  /**
   * Evaluates the generated Prisma filter against a status in plain JS. The
   * filter has to select exactly the rows the classifier would label the same
   * way — if the two drift, the console shows one number in the summary and a
   * different set of rows beneath it.
   */
  function matches(where: any, status: string): boolean {
    const lower = status.toLowerCase()
    let ok = true

    if (where.status?.in) ok = ok && where.status.in.includes(lower)
    if (where.status?.notIn) ok = ok && !where.status.notIn.includes(lower)
    if (where.status?.startsWith) ok = ok && lower.startsWith(where.status.startsWith)
    if (where.NOT?.status?.startsWith) ok = ok && !lower.startsWith(where.NOT.status.startsWith)

    return ok
  }

  const OUTCOMES: PaymentOutcome[] = ['collected', 'pending', 'abandoned', 'subscription', 'waived', 'other']

  it.each(OUTCOMES)('selects exactly the rows the classifier calls %s', (outcome) => {
    const where = outcomeWhere(outcome)
    expect(where).not.toBeNull()

    for (const [status] of KNOWN_STATUSES) {
      expect({ status, selected: matches(where, status) }).toEqual({
        status,
        selected: classifyPaymentStatus(status) === outcome,
      })
    }
  })

  it('returns null for an unrecognised outcome, so the filter is ignored', () => {
    expect(outcomeWhere('not-an-outcome')).toBeNull()
    expect(outcomeWhere('')).toBeNull()
  })
})
