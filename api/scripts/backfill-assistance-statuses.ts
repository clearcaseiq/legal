/**
 * Re-point case_assistance.status at the six-state flow.
 *
 * The old vocabulary split the pre-contact period three ways (new_submission,
 * needs_review, needs_contact) and the waiting period two ways
 * (waiting_on_plaintiff, waiting_on_documents). The flow collapses both, so any
 * row still carrying a retired value has to be moved.
 *
 * This is not optional cleanup. The queue's default view filters on
 * ACTIVE_ASSISTANCE_STATUSES, and none of the retired values are in it, so a
 * case left on one disappears from every specialist's queue instead of showing
 * up under a wrong-but-visible label.
 *
 * There is no Postgres migration history in this project — the migrations/
 * folder is legacy MySQL and deploys sync schema with `prisma db push`, which
 * moves columns but never rows. Hence a script.
 *
 * Idempotent: re-running once the values are mapped is a no-op.
 *
 * Run:  npm run backfill:assistance-statuses
 *       npm run backfill:assistance-statuses -- --apply
 *
 * Defaults to a dry run; pass --apply to write.
 */
import { prisma } from '../src/lib/prisma'
import { ASSISTANCE_STATUSES } from '../src/lib/case-assistance'

/**
 * Where each retired status lands.
 *
 * Assignment no longer implies contact, so both pre-contact states go back to
 * New — `assignedSpecialistId` and `reviewDueAt` already record who owns the
 * case and by when, which is what those statuses were standing in for. Waiting
 * on a plaintiff without having asked for a document is just an open case a
 * specialist is working, which the flow calls In Progress.
 */
const REMAP: Record<string, string> = {
  needs_review: 'new_submission',
  needs_contact: 'new_submission',
  waiting_on_plaintiff: 'in_progress',
  waiting_on_documents: 'document_requested',
}

const FALLBACK = 'new_submission'

async function main() {
  const apply = process.argv.includes('--apply')

  const counts = await prisma.caseAssistance.groupBy({
    by: ['status'],
    _count: { _all: true },
  })

  const known = new Set<string>(ASSISTANCE_STATUSES)
  const stale = counts.filter((row) => !known.has(row.status))

  console.log('Current status distribution:')
  for (const row of [...counts].sort((a, b) => b._count._all - a._count._all)) {
    const mark = known.has(row.status) ? ' ' : '*'
    console.log(`  ${mark} ${row.status.padEnd(26)} ${row._count._all}`)
  }

  if (stale.length === 0) {
    console.log('\nNothing to do: every row is already on a status the app knows.')
    return
  }

  console.log(`\n${apply ? 'Applying' : 'Would apply'} the remap:`)
  let total = 0

  for (const row of stale) {
    // Anything not in the table lands somewhere renderable rather than staying
    // invisible — a value we have never heard of is likelier to be an untouched
    // new case than a finished one, and New is the recoverable guess.
    const target = REMAP[row.status] || FALLBACK
    const note = REMAP[row.status] ? '' : '  (unrecognised, defaulting)'
    console.log(`  ${row.status} -> ${target}  x${row._count._all}${note}`)
    total += row._count._all

    if (apply) {
      const result = await prisma.caseAssistance.updateMany({
        where: { status: row.status },
        data: { status: target },
      })
      if (result.count !== row._count._all) {
        console.warn(`    wrote ${result.count}, expected ${row._count._all}`)
      }
    }
  }

  console.log(
    apply
      ? `\nDone. Moved ${total} case(s).`
      : `\n${total} case(s) would move. Nothing was written — re-run with --apply.`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
