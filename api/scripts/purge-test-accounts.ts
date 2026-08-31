/**
 * Remove fake sign-ups (disposable-inbox and scripted demo accounts) from a
 * database, and nothing else.
 *
 * DRY RUN BY DEFAULT. The dry run is not an estimate: it performs the real
 * deletion inside a transaction, counts every affected table, then throws to
 * roll back. 148 of this schema's relations cascade, so the only trustworthy
 * way to know what a delete takes with it is to do it and look. `--apply`
 * repeats the identical work and commits.
 *
 * WHAT IS DELIBERATELY PROTECTED
 *
 * 1. Attorneys with no email address. A bar-roll or CPRA import gives names and
 *    bar numbers, not contact addresses, so "no email" identifies the imported
 *    directory that the matching engine runs on — the opposite of test data.
 *    Every rule below requires a non-null email for exactly this reason.
 *
 * 2. Assessments owned by anyone who is not a test account. Every active,
 *    verified attorney on production is currently fake, so "routed to a test
 *    attorney" would sweep up real claimants' legal matters. Cases are selected
 *    by who submitted them, never by where they were routed. Cases owned by a
 *    real person but routed to a test attorney are reported for review and left
 *    alone.
 *
 * 3. Law firms that still have a non-test member. A firm is removed only when
 *    every attorney attached to it is itself being removed.
 *
 * Identification is allowlist-style throughout: a row is deleted only when it
 * matches a positive signal of being fake. Nothing is ever deleted because data
 * is missing.
 *
 * Usage (from the api package):
 *   npx tsx scripts/purge-test-accounts.ts            # dry run, changes nothing
 *   npx tsx scripts/purge-test-accounts.ts --apply    # commits
 */
import '../src/env'
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')

/** Inboxes that exist to be thrown away. */
const DISPOSABLE_DOMAINS = [
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
]

/** Scripted demo accounts, named explicitly rather than matched by pattern. */
const DEMO_EMAILS = ['salman@salmanlawfirm.com', 'elon@musklawfirm.com']

/** Models counted before and after so the cascade blast radius is visible. */
const COUNTED_MODELS = [
  'user',
  'attorney',
  'attorneyProfile',
  'lawFirm',
  'firmMember',
  'assessment',
  'leadSubmission',
  'introduction',
  'evidenceFile',
  'documentEnvelope',
  'documentRequest',
  'appointment',
  'attorneyReview',
  'platformPayment',
  'notification',
  'platformNotificationEvent',
]

/**
 * Delete rows that would block removing `ids` from `table`.
 *
 * The Prisma schema declares a cascade on most relations, but the database is
 * the authority and the two have drifted — `introductions_attorneyId_fkey` has
 * no ON DELETE rule in Postgres despite the schema saying otherwise. So the
 * blocking constraints are read from the live catalogue rather than assumed,
 * which also means this keeps working as the schema changes.
 *
 * Recurses because a blocking child can itself have blocking children.
 */
async function clearBlockingReferences(
  tx: any,
  table: string,
  ids: string[],
  depth = 0,
  seen = new Set<string>(),
): Promise<string[]> {
  if (!ids.length || depth > 5) return []
  const cleared: string[] = []

  // confdeltype 'a' = NO ACTION, 'r' = RESTRICT — both refuse the parent delete.
  const blockers: { child_table: string; child_column: string }[] = await tx.$queryRawUnsafe(
    `
    SELECT c.conrelid::regclass::text AS child_table, a.attname::text AS child_column
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND c.confrelid = '${table}'::regclass
      AND c.confdeltype IN ('a','r')
    `,
  )

  for (const b of blockers) {
    const key = `${b.child_table}.${b.child_column}<-${table}`
    if (seen.has(key)) continue
    seen.add(key)

    // Prisma maps to camelCase columns, which Postgres folds to lowercase
    // unless quoted.
    const col = `"${b.child_column}"`

    // Not every child has a surrogate `id`; join tables often do not. Without
    // one there is nothing to recurse on, so go straight to the delete.
    let childIds: string[] = []
    try {
      const rows: { id: string }[] = await tx.$queryRawUnsafe(
        `SELECT id::text FROM ${b.child_table} WHERE ${col} = ANY($1::text[])`,
        ids,
      )
      childIds = rows.map((r) => r.id)
      if (!childIds.length) continue
    } catch {
      /* no id column — fall through to the delete below */
    }

    if (childIds.length) {
      cleared.push(...(await clearBlockingReferences(tx, b.child_table, childIds, depth + 1, seen)))
    }

    const deleted = await tx.$executeRawUnsafe(
      `DELETE FROM ${b.child_table} WHERE ${col} = ANY($1::text[])`,
      ids,
    )
    if (deleted > 0) cleared.push(`${b.child_table} (${deleted} via ${b.child_column})`)
  }

  return cleared
}

async function countAll(client: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const model of COUNTED_MODELS) {
    try {
      counts[model] = await client[model].count()
    } catch {
      // A model absent on this schema version simply is not reported.
    }
  }
  return counts
}

function emailMatchers() {
  return [
    ...DISPOSABLE_DOMAINS.map((domain) => ({ email: { endsWith: `@${domain}`, mode: 'insensitive' as const } })),
    ...DEMO_EMAILS.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
  ]
}

async function main() {
  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL || '').hostname
    } catch {
      return '(unparseable DATABASE_URL)'
    }
  })()

  console.log(`\n${APPLY ? '*** APPLY — CHANGES WILL BE COMMITTED ***' : 'DRY RUN — nothing will be committed'}`)
  console.log(`Database host: ${dbHost}\n`)

  const before = await countAll(prisma)

  // The whole job runs inside one transaction. On a dry run it ends with a
  // deliberate throw, so Postgres rolls back everything reported below.
  const SENTINEL = 'ROLLBACK_DRY_RUN'
  let report: any = null

  try {
    await prisma.$transaction(
      async (tx: any) => {
        const emailIs = emailMatchers()

        // --- Identify, requiring a real address in every case ---
        const testAttorneys = await tx.attorney.findMany({
          where: { AND: [{ email: { not: null } }, { OR: emailIs }] },
          select: { id: true, name: true, email: true, lawFirmId: true },
        })
        // `User.email` is required by the schema, so it needs no null guard —
        // unlike `Attorney.email`, whose absence is what marks a directory import.
        const testUsers = await tx.user.findMany({
          where: { OR: emailIs },
          select: { id: true, email: true, role: true },
        })

        const attorneyIds = testAttorneys.map((a: any) => a.id)
        const userIds = testUsers.map((u: any) => u.id)

        // --- Firms: only those with no surviving member ---
        const candidateFirmIds = [...new Set(testAttorneys.map((a: any) => a.lawFirmId).filter(Boolean))] as string[]
        const firmIdsToDelete: string[] = []
        for (const firmId of candidateFirmIds) {
          const survivors = await tx.attorney.count({
            where: { lawFirmId: firmId, id: { notIn: attorneyIds.length ? attorneyIds : ['__none__'] } },
          })
          if (survivors === 0) firmIdsToDelete.push(firmId)
        }

        // --- Cases: by submitter only ---
        const assessmentsOwnedByTestUsers = await tx.assessment.findMany({
          where: { userId: { in: userIds.length ? userIds : ['__none__'] } },
          select: { id: true },
        })
        const assessmentIds = assessmentsOwnedByTestUsers.map((a: any) => a.id)

        // --- Report-only: real people's cases that touched a test attorney ---
        const realCasesTouchingTestAttorneys = await tx.leadSubmission.findMany({
          where: {
            assignedAttorneyId: { in: attorneyIds.length ? attorneyIds : ['__none__'] },
            assessment: { is: { userId: { notIn: userIds.length ? userIds : ['__none__'] } } },
          },
          select: { id: true, assessmentId: true, assignedAttorneyId: true },
          take: 200,
        })

        // --- Delete, clearing non-cascading references first ---
        const cleared: string[] = []
        if (assessmentIds.length) {
          cleared.push(...(await clearBlockingReferences(tx, 'assessments', assessmentIds)))
          await tx.assessment.deleteMany({ where: { id: { in: assessmentIds } } })
        }
        if (attorneyIds.length) {
          cleared.push(...(await clearBlockingReferences(tx, 'attorneys', attorneyIds)))
          await tx.attorney.deleteMany({ where: { id: { in: attorneyIds } } })
        }
        if (firmIdsToDelete.length) {
          cleared.push(...(await clearBlockingReferences(tx, 'law_firms', firmIdsToDelete)))
          await tx.lawFirm.deleteMany({ where: { id: { in: firmIdsToDelete } } })
        }
        if (userIds.length) {
          cleared.push(...(await clearBlockingReferences(tx, 'users', userIds)))
          await tx.user.deleteMany({ where: { id: { in: userIds } } })
        }

        const after = await countAll(tx)

        report = {
          testAttorneys,
          testUsers,
          firmIdsToDelete,
          assessmentCount: assessmentIds.length,
          realCasesTouchingTestAttorneys,
          cleared,
          after,
        }

        if (!APPLY) throw new Error(SENTINEL)
      },
      { timeout: 120_000 },
    )
  } catch (err: any) {
    if (err?.message !== SENTINEL) throw err
  }

  if (!report) {
    console.log('Nothing was identified; no changes.')
    return
  }

  console.log(`=== Accounts identified as test data ===`)
  console.log(`Attorneys: ${report.testAttorneys.length}`)
  for (const a of report.testAttorneys) console.log(`   ${a.name}  <${a.email}>`)
  console.log(`\nUser logins: ${report.testUsers.length}`)
  for (const u of report.testUsers) console.log(`   ${u.email}  (${u.role})`)
  console.log(`\nLaw firms with no surviving member: ${report.firmIdsToDelete.length}`)
  console.log(`Assessments submitted BY these accounts: ${report.assessmentCount}`)

  if (report.cleared.length) {
    console.log(`\n=== Dependent rows removed to satisfy non-cascading constraints ===`)
    for (const c of report.cleared) console.log(`   ${c}`)
  }

  console.log(`\n=== Row counts, before -> after ===`)
  for (const model of COUNTED_MODELS) {
    const b = before[model]
    const a = report.after[model]
    if (b === undefined || a === undefined) continue
    const delta = a - b
    console.log(`   ${model.padEnd(28)} ${String(b).padStart(7)} -> ${String(a).padStart(7)}  ${delta === 0 ? '' : `(${delta})`}`)
  }

  if (report.realCasesTouchingTestAttorneys.length) {
    console.log(
      `\n=== LEFT ALONE: ${report.realCasesTouchingTestAttorneys.length} case(s) submitted by real users but routed to a test attorney ===`,
    )
    console.log('   These are real people. Removing the attorney unassigns them; the case itself is untouched.')
    for (const l of report.realCasesTouchingTestAttorneys.slice(0, 20)) {
      console.log(`   lead ${l.id}  assessment ${l.assessmentId}`)
    }
  }

  console.log(
    `\n${APPLY ? 'Committed.' : 'Rolled back — nothing was changed. Re-run with --apply to commit exactly the above.'}\n`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
