import Stripe from 'stripe'
import { ENV } from '../env'

// Returns a configured Stripe client, or throws a 503-tagged error when Stripe
// credentials are not present. Centralized here so every route uses the same
// initialization and error contract.
export function getStripe() {
  if (!ENV.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe is not configured'), { statusCode: 503 })
  }
  return new Stripe(ENV.STRIPE_SECRET_KEY)
}

// Absolute URL into the web app for Stripe success/cancel/return redirects.
export function webUrl(path: string) {
  return `${ENV.WEB_URL.replace(/\/$/, '')}${path}`
}

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
