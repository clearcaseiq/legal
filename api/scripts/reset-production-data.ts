/**
 * Empty an environment of all user, case and attorney data, keeping named staff
 * logins and global configuration.
 *
 * This is for an environment that has never held real data. It was written for
 * production, which an audit showed to be a second demo environment: all 87
 * attorneys were sign-ups on yopmail/demo/typo domains, 245 of 604 users were
 * script-generated on the reserved `.test` TLD, 85 more were guest shadows, and
 * every one of the 43 accounts on real consumer domains was recognisably a test
 * account. Do not point it at a database that has real users.
 *
 * DRY RUN BY DEFAULT, and the dry run is exact rather than estimated: it does
 * the real work inside a transaction, counts every table, then throws to roll
 * back. `--apply` performs identical work and commits.
 *
 * WHAT SURVIVES
 *   - The user rows named in KEEP_USER_EMAILS, and nothing else in `users`.
 *   - The tables in KEEP_TABLES: global configuration with no foreign keys.
 *   - Every already-empty table, trivially.
 *
 * Firm- and attorney-scoped templates (firm_templates, billing_rates,
 * case_workflow_templates) are NOT kept despite being "configuration": each is
 * scoped by a foreign key to a demo firm or attorney, so keeping a row would
 * leave it pointing at something deleted.
 *
 * HOW THE DELETE IS ORDERED: it isn't. Ordering 157 tables by dependency is
 * error-prone, and `TRUNCATE ... CASCADE` expands silently into tables nobody
 * listed. Instead `session_replication_role = replica` suspends foreign-key
 * triggers for the transaction, so plain DELETEs run in any order. It is set
 * LOCAL, so it reverts when the transaction ends, either way.
 *
 * Usage (from the api package):
 *   npx tsx scripts/reset-production-data.ts
 *   npx tsx scripts/reset-production-data.ts --apply --confirm-host=<db hostname>
 */
import '../src/env'
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')
const CONFIRM_HOST = (process.argv.find((a) => a.startsWith('--confirm-host=')) || '').split('=')[1]

/**
 * Logins that survive. Everything else in `users` is removed.
 *
 * Deliberately just the admin. An attorney login would outlive its own
 * `Attorney` row — every one of those is deleted — leaving an account with an
 * attorney role and nothing behind it.
 */
const KEEP_USER_EMAILS = ['admin@clearcaseiq.com']

/**
 * Tables kept in full. Both are singleton global settings with no foreign keys,
 * which is what makes them safe to keep while their surroundings are emptied.
 */
const KEEP_TABLES = new Set(['routingConfig', 'complianceSetting'])

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL || '').hostname
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

/** Every Prisma model that supports a row count, read off the client itself. */
function modelKeys(client: any): string[] {
  return Object.keys(client).filter(
    (k) => !k.startsWith('$') && !k.startsWith('_') && client[k] && typeof client[k].count === 'function',
  )
}

/**
 * Row counts by model. A failed count is recorded as -1 rather than skipped:
 * an absent entry reads as zero downstream, which in this script's output would
 * render "count failed" as "table successfully emptied".
 */
async function countAll(client: any, keys: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const key of keys) {
    try {
      counts[key] = await client[key].count()
    } catch (err: any) {
      counts[key] = -1
      failedCounts.set(key, String(err?.message || err).split('\n')[0])
    }
  }
  return counts
}

const failedCounts = new Map<string, string>()

async function main() {
  const host = dbHost()
  console.log(`\n${APPLY ? '*** APPLY — CHANGES WILL BE COMMITTED ***' : 'DRY RUN — nothing will be committed'}`)
  console.log(`Database host: ${host}`)
  console.log(`Keeping logins: ${KEEP_USER_EMAILS.join(', ')}`)
  console.log(`Keeping tables: ${[...KEEP_TABLES].join(', ')}\n`)

  // Naming the target out loud is the guard against running a full reset
  // against the wrong database, which is the one mistake here with no undo
  // beyond a restore.
  if (APPLY && CONFIRM_HOST !== host) {
    console.error(
      `Refusing to apply. Re-run with --confirm-host=${host} to confirm you mean this database.` +
        (CONFIRM_HOST ? ` (got --confirm-host=${CONFIRM_HOST})` : ''),
    )
    process.exitCode = 1
    return
  }

  const allKeys = modelKeys(prisma)
  const before = await countAll(prisma, allKeys)

  // A model whose table is absent must be excluded before the transaction opens,
  // not handled inside it. In Postgres the first failing statement aborts the
  // whole transaction, and every statement after it fails too — so one missing
  // table turned the entire after-the-fact count into errors, which this script
  // then rendered as zeros. The manifest claimed tables had been emptied when
  // nothing had been counted at all.
  const unavailable = allKeys.filter((k) => before[k] === -1)
  const keys = allKeys.filter((k) => before[k] >= 0)
  failedCounts.clear()

  const SENTINEL = 'ROLLBACK_DRY_RUN'
  let after: Record<string, number> | null = null
  let keptUsers: { email: string; role: string }[] = []

  try {
    await prisma.$transaction(
      async (tx: any) => {
        // LOCAL: scoped to this transaction, restored on commit or rollback.
        await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica')

        for (const key of keys) {
          if (KEEP_TABLES.has(key) || key === 'user') continue
          // Only positive counts. Zero needs no work, and -1 means the count
          // failed because the model has no table in this database — deleting
          // from it would abort the whole transaction.
          if (!(before[key] > 0)) continue
          await tx[key].deleteMany({})
        }

        await tx.user.deleteMany({ where: { email: { notIn: KEEP_USER_EMAILS } } })

        keptUsers = await tx.user.findMany({ select: { email: true, role: true } })
        after = await countAll(tx, keys)

        if (!APPLY) throw new Error(SENTINEL)
      },
      { timeout: 300_000, maxWait: 30_000 },
    )
  } catch (err: any) {
    if (err?.message !== SENTINEL) throw err
  }

  if (!after) {
    console.log('Nothing ran.')
    return
  }

  if (unavailable.length) {
    console.log(`=== Skipped: ${unavailable.length} model(s) have no table in this database ===`)
    console.log(`   ${unavailable.join(', ')}\n`)
  }

  if (failedCounts.size) {
    console.log(`=== COUNT FAILED for ${failedCounts.size} model(s) — figures below are not trustworthy ===`)
    for (const [k, msg] of failedCounts) console.log(`   ${k.padEnd(34)} ${msg}`)
    console.log('')
  }

  const changed = keys
    .filter((k) => (before[k] || 0) !== (after![k] || 0))
    .sort((a, b) => (before[b] || 0) - (before[a] || 0))

  console.log(`=== Tables cleared (${changed.length}) ===`)
  for (const k of changed) {
    console.log(`   ${k.padEnd(34)} ${String(before[k] || 0).padStart(7)} -> ${String(after[k] || 0).padStart(7)}`)
  }

  const untouched = keys.filter((k) => (before[k] || 0) > 0 && (before[k] || 0) === (after![k] || 0))
  console.log(`\n=== Tables left as they were (${untouched.length}) ===`)
  for (const k of untouched) console.log(`   ${k.padEnd(34)} ${String(before[k] || 0).padStart(7)} rows`)

  console.log(`\n=== Surviving logins (${keptUsers.length}) ===`)
  for (const u of keptUsers) console.log(`   ${u.email}  (${u.role})`)

  console.log(
    `\n${APPLY ? 'Committed.' : `Rolled back — nothing was changed. Re-run with --apply --confirm-host=${host} to commit exactly the above.`}\n`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
