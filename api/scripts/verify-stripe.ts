/**
 * Read-only preflight for the Stripe integration in a given environment.
 *
 * There is no boot-time failure and no CI check for the STRIPE_* variables —
 * the compose file passes them through an env file with no `:?` guard — so an
 * environment can look completely healthy while being unable to take money.
 * This script answers "does payments actually work here?" in one command,
 * without moving a cent: every Stripe call below is a read.
 *
 * It also covers the two failures that are invisible from the outside:
 * a webhook endpoint registered against the wrong host (deliveries 400 on a
 * signature that was signed by a different secret), and the routing-fee
 * feature flag being off in the database, which makes every accepted case
 * free regardless of how good the keys are.
 *
 * Usage (from the api package):
 *   npx tsx scripts/verify-stripe.ts
 *
 * On a deployed host, run it inside the API container so it reads that
 * environment's variables:
 *   docker compose -f docker-compose.deploy.yml exec api npx tsx scripts/verify-stripe.ts
 */
import '../src/env'
import { ENV } from '../src/env'
import { getMatchingRules } from '../src/lib/matching-rules-config'
import { prisma } from '../src/lib/prisma'
import { webUrl } from '../src/lib/app-url'

type Level = 'ok' | 'warn' | 'fail'

const findings: { level: Level; message: string }[] = []

function record(level: Level, message: string) {
  findings.push({ level, message })
  const mark = level === 'ok' ? '  ok  ' : level === 'warn' ? ' warn ' : ' FAIL '
  console.log(`[${mark}] ${message}`)
}

/** Show enough of a key to identify it without printing a usable secret. */
function maskKey(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}…`
  return `${key.slice(0, 8)}…${key.slice(-4)}`
}

function describeMode(key: string): 'test' | 'live' | 'unknown' {
  if (/^(sk|pk|rk)_test_/.test(key)) return 'test'
  if (/^(sk|pk|rk)_live_/.test(key)) return 'live'
  return 'unknown'
}

async function main() {
  const envName = process.env.DEPLOY_ENV || process.env.NODE_ENV || 'unknown'
  console.log(`\nStripe preflight — environment: ${envName}`)
  console.log(`Web base URL: ${webUrl('')}\n`)

  // ---- 1. Are the variables present at all? ----
  const secret = ENV.STRIPE_SECRET_KEY || ''
  const publishable = ENV.STRIPE_PUBLISHABLE_KEY || ''
  const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET || ''

  if (!secret) record('fail', 'STRIPE_SECRET_KEY is not set — every payment route returns 503.')
  else record('ok', `STRIPE_SECRET_KEY present (${maskKey(secret)})`)

  if (!publishable)
    record(
      'fail',
      'STRIPE_PUBLISHABLE_KEY is not set — the browser gets publishableKey: null and the card form shows an "unavailable" banner.',
    )
  else record('ok', `STRIPE_PUBLISHABLE_KEY present (${maskKey(publishable)})`)

  if (!webhookSecret)
    record(
      'fail',
      'STRIPE_WEBHOOK_SECRET is not set — the webhook returns 503, so checkouts complete in Stripe but are never settled here.',
    )
  else record('ok', 'STRIPE_WEBHOOK_SECRET present')

  // ---- 2. Do the two keys agree, and is this test mode? ----
  if (secret && publishable) {
    const secretMode = describeMode(secret)
    const publishableMode = describeMode(publishable)

    if (secretMode !== 'unknown' && publishableMode !== 'unknown' && secretMode !== publishableMode) {
      record(
        'fail',
        `Key mismatch: the secret key is ${secretMode} mode but the publishable key is ${publishableMode} mode. The browser would collect a card against one account and the server would charge another.`,
      )
    } else if (secretMode === 'live' && envName !== 'prod' && envName !== 'production') {
      record('fail', `LIVE keys in a non-production environment (${envName}). These would charge real cards.`)
    } else if (secretMode === 'test') {
      record('ok', 'Keys are test mode.')
    } else {
      record('warn', `Could not determine key mode from the prefix (${maskKey(secret)}).`)
    }
  }

  // ---- 3. Does the secret key actually authenticate? ----
  if (secret) {
    // Imported lazily so the checks above still run and report when the SDK
    // cannot be constructed at all.
    const { getStripe } = await import('../src/lib/stripe')
    const stripe = getStripe()
    try {
      const account = await stripe.accounts.retrieve()
      const label = account.settings?.dashboard?.display_name || account.id
      record('ok', `Authenticated with Stripe as "${label}" (${account.id}).`)
      // An authenticated key on an account that cannot charge is the failure
      // most easily mistaken for a code bug: every call succeeds until the one
      // that takes money.
      if (account.charges_enabled) {
        record('ok', 'Account can accept charges.')
      } else {
        record(
          'fail',
          'Account has charges_enabled=false — the keys authenticate but no payment can be taken. Complete the account/sandbox setup in the Stripe dashboard.',
        )
      }
    } catch (error: any) {
      record('fail', `Stripe rejected the secret key: ${error?.message || error}`)
    }

    // ---- 4. Is a webhook registered against THIS environment's URL? ----
    // A production endpoint signs with a different secret, so its deliveries
    // fail signature verification here and look like a code bug.
    try {
      const expectedPath = '/v1/payments/stripe-webhook'
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
      const apiOrigin = (process.env.API_URL || '').replace(/\/$/, '')
      const matching = endpoints.data.filter((e) => e.url.includes(expectedPath))

      if (matching.length === 0) {
        record(
          'fail',
          `No webhook endpoint is registered on this Stripe account for ${expectedPath}. Payments will complete without ever being recorded.`,
        )
      } else {
        const forThisEnv = apiOrigin
          ? matching.filter((e) => e.url.startsWith(apiOrigin))
          : []
        if (apiOrigin && forThisEnv.length === 0) {
          record(
            'fail',
            `Webhook endpoints exist, but none point at this environment (${apiOrigin}${expectedPath}). Found: ${matching.map((e) => e.url).join(', ')}. A different environment's endpoint signs with its own secret, so deliveries here fail verification.`,
          )
        } else {
          for (const endpoint of forThisEnv.length ? forThisEnv : matching) {
            const level: Level = endpoint.status === 'enabled' ? 'ok' : 'fail'
            record(level, `Webhook ${endpoint.url} (status: ${endpoint.status})`)
          }
        }
      }
    } catch (error: any) {
      record('warn', `Could not list webhook endpoints: ${error?.message || error}`)
    }

    // ---- 5. Optional price IDs: if set, they must resolve. ----
    for (const [name, id] of [
      ['STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID', ENV.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID],
      ['STRIPE_LEAD_CREDIT_PRICE_ID', ENV.STRIPE_LEAD_CREDIT_PRICE_ID],
    ] as const) {
      if (!id) {
        record('warn', `${name} is not set. The route falls back to an inline price, which is fine but untested here.`)
        continue
      }
      try {
        const price = await stripe.prices.retrieve(id)
        record('ok', `${name} resolves (${price.id}, active=${price.active}).`)
      } catch (error: any) {
        record('fail', `${name}=${id} does not resolve on this account: ${error?.message || error}`)
      }
    }
  }

  // ---- 6. The feature flag that silently makes everything free. ----
  try {
    const rules = await getMatchingRules()
    if (rules.routingFeePaymentsEnabled) {
      record(
        'ok',
        `Routing-fee payments are ON (case fee $${(rules.caseRoutingFeeCents / 100).toFixed(2)}).`,
      )
    } else {
      record(
        'warn',
        'Routing-fee payments are OFF in this database, so accepting a case is free and is recorded as "skipped" no matter how Stripe is configured. Turn on via the admin Pricing Rules tab, or scripts/enable-routing-fees.ts.',
      )
    }
  } catch (error: any) {
    record('warn', `Could not read the matching rules from the database: ${error?.message || error}`)
  }

  // ---- Summary ----
  const failed = findings.filter((f) => f.level === 'fail').length
  const warned = findings.filter((f) => f.level === 'warn').length
  console.log(`\n${failed} failing, ${warned} warning, ${findings.length - failed - warned} ok`)
  if (failed > 0) {
    console.log('Stripe is NOT working in this environment.')
    process.exitCode = 1
  } else if (warned > 0) {
    console.log('Stripe is configured; review the warnings above.')
  } else {
    console.log('Stripe is fully configured.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
