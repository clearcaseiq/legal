/**
 * Enable routing-fee payments locally and apply a small Stripe test price so the
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

// Clearly non-production so a stray charge in a test environment is obvious.
const TEST_CASE_FEE_CENTS = 500 // $5.00

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
      caseRoutingFeeCents: DEFAULT_MATCHING_RULES.caseRoutingFeeCents,
    })
    console.log('Routing-fee payments DISABLED; case fee restored to the default.')
    console.log(`routingFeePaymentsEnabled = ${updated.routingFeePaymentsEnabled}`)
    console.log(`caseRoutingFeeCents = ${updated.caseRoutingFeeCents}`)
    return
  }

  const updated = await saveMatchingRules({
    routingFeePaymentsEnabled: true,
    caseRoutingFeeCents: TEST_CASE_FEE_CENTS,
  })

  console.log('Routing-fee payments ENABLED with a test price:')
  console.log(`  - Case fee (all cases)  $${(updated.caseRoutingFeeCents / 100).toFixed(2)}`)
  console.log('\nNote: Stripe must also be configured (STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY)')
  console.log('for a real charge; otherwise the fee is recorded as "skipped".')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
