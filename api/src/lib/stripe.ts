import Stripe from 'stripe'
import { ENV } from '../env'
import { logger } from './logger'

// Returns a configured Stripe client, or throws a 503-tagged error when Stripe
// credentials are not present. Centralized here so every route uses the same
// initialization and error contract.
export function getStripe() {
  if (!ENV.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe is not configured'), { statusCode: 503 })
  }
  return new Stripe(ENV.STRIPE_SECRET_KEY)
}

/** True when the three variables every payment flow needs are all present. */
export function isStripeConfigured(): boolean {
  return Boolean(
    ENV.STRIPE_SECRET_KEY && ENV.STRIPE_PUBLISHABLE_KEY && ENV.STRIPE_WEBHOOK_SECRET,
  )
}

/**
 * Warn at boot when payments are partly or wholly unconfigured.
 *
 * Nothing else reports this. Unlike DATABASE_URL and the other required
 * settings, the Stripe variables have no `:?` guard in the compose file, so a
 * host whose env file omits them starts a completely healthy-looking stack with
 * payments switched off — which is how a QA environment sat with
 * `enabled: false` while looking fine from the outside.
 *
 * Partial configuration is worth calling out separately because it fails in a
 * confusing way rather than an obvious one: a secret key without a webhook
 * secret takes the customer's money and then never settles the record, so the
 * charge succeeds in Stripe while the platform still believes it is unpaid.
 *
 * A warning, not a throw: payments being off is a legitimate state for local
 * development, and refusing to boot would take down every unrelated route.
 */
export function checkStripeConfig(): void {
  if (isStripeConfigured()) return

  const missing = [
    !ENV.STRIPE_SECRET_KEY && 'STRIPE_SECRET_KEY',
    !ENV.STRIPE_PUBLISHABLE_KEY && 'STRIPE_PUBLISHABLE_KEY',
    !ENV.STRIPE_WEBHOOK_SECRET && 'STRIPE_WEBHOOK_SECRET',
  ].filter(Boolean)

  if (missing.length === 3) {
    logger.warn(
      'Stripe is not configured (no STRIPE_* variables set). Every payment route will return 503, the card form will show an "unavailable" banner, and routing-fee charges will be recorded as skipped — attorneys accept cases without paying.',
    )
    return
  }

  logger.warn(
    `Stripe is only partly configured; missing ${missing.join(', ')}. This is worse than having none of it: checkout can succeed while the result is never recorded.`,
  )
}

// Absolute URL into the web app for Stripe success/cancel/return redirects.
export { webUrl } from './app-url'

// Stripe amounts are in the smallest currency unit (cents for USD).
export function toCents(amount: number) {
  return Math.round(Number(amount) * 100)
}

export function fromCents(amount: number | null | undefined) {
  return amount == null ? null : amount / 100
}

// Stripe metadata values must be strings; null/undefined become empty strings.
export function toStripeMetadataValue(value: unknown) {
  return value == null ? '' : String(value)
}

// Parse a value that may be a JSON string. Returns the original value when it is
// not a string, and null when it is a string that fails to parse.
export function parseJsonMaybe(value: unknown) {
  if (!value || typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// Featured-placement (visibility boost) pricing, in whole dollars, by boost level.
export const FEATURED_BOOST_PRICES: Record<number, { price: number; name: string }> = {
  1: { price: 99, name: 'Basic Boost' },
  2: { price: 199, name: 'Standard Boost' },
  3: { price: 399, name: 'Premium Boost' },
  4: { price: 699, name: 'Elite Boost' },
  5: { price: 999, name: 'Champion Boost' },
}

export function getFeaturedBoost(level: number) {
  return FEATURED_BOOST_PRICES[level] || null
}
