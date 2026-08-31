/**
 * Read-only audit of the attorney table: how many accounts exist, how many are
 * routable, and which of them look like real people rather than test data.
 *
 * The public /attorneys/search endpoint only returns rows that are both active
 * and verified, so it cannot answer "has a real attorney ever signed up?" —
 * a genuine registration sitting unverified is invisible to it. This looks at
 * every row.
 *
 * The classification is deliberately one-sided. Matching a known test signal is
 * strong evidence an account is fake; matching none is only weak evidence it is
 * real, so those are listed individually for a human to read rather than being
 * counted as genuine. Activity counts are included for the same reason: an
 * account with real leads and appointments behind it is worth a closer look
 * regardless of how its address looks.
 *
 * Usage (from the api package):
 *   npx tsx scripts/audit-attorney-accounts.ts
 *
 * On a deployed host, run it inside the API container:
 *   docker compose -f docker-compose.deploy.yml --env-file .env.prod \
 *     exec -T api npx -y tsx scripts/audit-attorney-accounts.ts
 */
import '../src/env'
import { prisma } from '../src/lib/prisma'

/** Inboxes that exist to be thrown away. Presence of one is decisive. */
const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com',
  'mailinator.com',
  'guerrillamail.com',
  'sharklasers.com',
  '10minutemail.com',
  'tempmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'example.com',
  'example.org',
  'test.com',
  'caseiq.local',
])

/** Words that do not appear in a real attorney's name or firm. */
const TEST_WORDS = [
  'test',
  'demo',
  'sample',
  'dummy',
  'fake',
  'qa ',
  'foo',
  'bar ',
  'asdf',
  'attorney 1',
  'att user',
  'lorem',
]

/** Public figures and fictional characters seen in seeded rows. */
const FICTIONAL = ['elon musk', 'steve rogers', 'tony stark', 'bruce wayne', 'clark kent', 'john doe', 'jane doe']

type Signals = string[]

function testSignals(a: {
  name: string
  email: string | null
  phone: string | null
  barNumber: string | null
  firmName: string | null
}): Signals {
  const signals: Signals = []
  const name = (a.name || '').toLowerCase()
  const firm = (a.firmName || '').toLowerCase()
  const domain = (a.email || '').split('@')[1]?.toLowerCase() || ''

  if (domain && DISPOSABLE_DOMAINS.has(domain)) signals.push(`disposable email (${domain})`)
  if (!a.email) signals.push('no email address')
  // 555-01xx is the block reserved for fiction; anything else 555 is suspect too.
  if (a.phone && /\b555[-.\s]?01\d\d\b/.test(a.phone)) signals.push('reserved fictional phone (555-01xx)')
  for (const word of TEST_WORDS) {
    if (name.includes(word) || firm.includes(word)) {
      signals.push(`test keyword "${word.trim()}"`)
      break
    }
  }
  for (const person of FICTIONAL) {
    if (name.includes(person)) {
      signals.push(`fictional/public figure name "${person}"`)
      break
    }
  }
  // Real bar numbers and firm names are not punctuation soup.
  if (a.barNumber && /[^A-Za-z0-9\-\s]/.test(a.barNumber)) signals.push(`nonsense bar number "${a.barNumber}"`)
  if (a.firmName && /[!@#$%^*]{2,}/.test(a.firmName)) signals.push('nonsense firm name')

  return signals
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width)
}

async function main() {
  const attorneys = await prisma.attorney.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      barNumber: true,
      barState: true,
      isActive: true,
      isVerified: true,
      claimStatus: true,
      averageRating: true,
      totalReviews: true,
      createdAt: true,
      lawFirm: { select: { name: true } },
      _count: {
        select: {
          leadSubmissions: true,
          introductions: true,
          appointments: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const rows = attorneys.map((a) => {
    const firmName = a.lawFirm?.name ?? null
    return {
      ...a,
      firmName,
      signals: testSignals({
        name: a.name,
        email: a.email,
        phone: a.phone,
        barNumber: a.barNumber,
        firmName,
      }),
      activity: a._count.leadSubmissions + a._count.introductions + a._count.appointments,
    }
  })

  const routable = rows.filter((r) => r.isActive && r.isVerified)
  const looksTest = rows.filter((r) => r.signals.length > 0)
  const unclassified = rows.filter((r) => r.signals.length === 0)

  console.log(`\n=== Attorney accounts: ${rows.length} total ===`)
  console.log(`  active + verified (routable, and visible in public search): ${routable.length}`)
  console.log(`  active but unverified:  ${rows.filter((r) => r.isActive && !r.isVerified).length}`)
  console.log(`  inactive:               ${rows.filter((r) => !r.isActive).length}`)
  console.log(`  matched a test signal:  ${looksTest.length}`)
  console.log(`  matched nothing:        ${unclassified.length}   <- read these individually`)

  console.log(`\n=== By email domain ===`)
  const byDomain = new Map<string, number>()
  for (const r of rows) {
    const d = (r.email || '(none)').split('@')[1] || '(none)'
    byDomain.set(d, (byDomain.get(d) || 0) + 1)
  }
  for (const [domain, count] of [...byDomain.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pad(count, 5)} ${domain}`)
  }

  console.log(`\n=== Not matched by any test heuristic (${unclassified.length}) ===`)
  if (unclassified.length === 0) {
    console.log('  none — every account carries at least one test signal')
  }
  for (const r of unclassified) {
    console.log(`\n  ${r.name}  <${r.email || 'no email'}>`)
    console.log(`    firm: ${r.firmName || '(none)'}   bar: ${r.barNumber || '(none)'} ${r.barState || ''}`)
    console.log(
      `    active=${r.isActive} verified=${r.isVerified} claim=${r.claimStatus} created=${r.createdAt.toISOString().slice(0, 10)}`,
    )
    console.log(
      `    activity: ${r._count.leadSubmissions} leads, ${r._count.introductions} introductions, ${r._count.appointments} appointments`,
    )
  }

  // Displayed stars with nothing behind them are a consumer-trust problem, not
  // just untidy data, so they are called out separately from the test flags.
  const fabricated = rows.filter((r) => r.totalReviews > 0 && r._count.reviews === 0)
  if (fabricated.length) {
    console.log(`\n=== Displaying ratings with no review rows behind them (${fabricated.length}) ===`)
    for (const r of fabricated) {
      console.log(
        `  ${pad(r.name, 26)} shows ${r.averageRating} stars from ${r.totalReviews} reviews, actual review rows: ${r._count.reviews}`,
      )
    }
  }

  const activeWithActivity = rows.filter((r) => r.activity > 0)
  console.log(`\n=== Accounts with any lead/introduction/appointment activity (${activeWithActivity.length}) ===`)
  for (const r of activeWithActivity.sort((a, b) => b.activity - a.activity)) {
    console.log(
      `  ${pad(r.name, 26)} ${pad(r.email || '', 34)} leads=${r._count.leadSubmissions} intros=${r._count.introductions} appts=${r._count.appointments}${r.signals.length ? '   [test: ' + r.signals[0] + ']' : ''}`,
    )
  }

  console.log()
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
