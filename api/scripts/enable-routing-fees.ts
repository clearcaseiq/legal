/**
 * Enable routing-fee payments locally and apply small Stripe test prices so the
 * "pay when you accept a case" flow can be exercised end-to-end without real
 * (production-sized) charges.
 *
 * Writes to the matching_rules row in routing_config using DATABASE_URL from
 * api/.env. Safe to re-run (idempotent upsert).
 *
 * Usage (from the api package):
 *   npx tsx scripts/enable-routing-fees.ts
 *   npx tsx scripts/enable-routing-fees.ts --off   # revert (disable + restore defaults)
 */
import '../src/env'
import { saveMatchingRules, DEFAULT_MATCHING_RULES } from '../src/lib/matching-rules-config'
import { prisma } from '../src/lib/prisma'

// Small, distinct test prices (in cents) keyed by pricing-tier id. Chosen to be
// clearly non-production while still varying by tier so you can tell which tier
// a case mapped to during testing.
const TEST_PRICES_CENTS: Record<string, number> = {
  qualified_lead: 200, // $2.00
  attorney_ready: 500, // $5.00
  high_value: 1000, // $10.00
  premium: 2000, // $20.00
  catastrophic_death: 5000, // $50.00
}

function summarizeDatabaseTarget(): string {
  const raw = process.env.DATABASE_URL
  if (!raw) return 'DATABASE_URL is not set'
  try {
    const u = new URL(raw)
    const db = u.pathname.replace(/^\//, '') || '(no database name)'
    return `${u.hostname}:${u.port || '5432'} / ${db}`
  } catch {
    return 'could not parse DATABASE_URL'
  }
}

async function main() {
  const revert = process.argv.includes('--off')
  console.log(`Database target: ${summarizeDatabaseTarget()}`)

  if (revert) {
    const updated = await saveMatchingRules({
      routingFeePaymentsEnabled: false,
      caseRoutingPricingTiers: DEFAULT_MATCHING_RULES.caseRoutingPricingTiers,
    })
    console.log('Routing-fee payments DISABLED; pricing restored to defaults.')
    console.log(`routingFeePaymentsEnabled = ${updated.routingFeePaymentsEnabled}`)
    return
  }

  const testTiers = DEFAULT_MATCHING_RULES.caseRoutingPricingTiers.map((tier) => ({
    ...tier,
    priceCents: TEST_PRICES_CENTS[tier.id] ?? tier.priceCents,
  }))

  const updated = await saveMatchingRules({
    routingFeePaymentsEnabled: true,
    caseRoutingPricingTiers: testTiers,
  })

  console.log('Routing-fee payments ENABLED with test prices:')
  for (const tier of updated.caseRoutingPricingTiers) {
    console.log(
      `  - ${tier.label.padEnd(22)} $${(tier.priceCents / 100).toFixed(2)}  [${tier.caseTypes.join(', ')}]`
    )
  }
  console.log('\nNote: Stripe must also be configured (STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY)')
  console.log('for a real charge; otherwise the fee is recorded as "skipped".')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
