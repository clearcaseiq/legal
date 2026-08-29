/**
 * Release cases that admin routing locked without anyone accepting them.
 *
 * `routingLocked` means an attorney accepted the case. Admin manual routing set
 * it at the moment the case was merely offered, so every attorney the admin
 * routed to — except whichever one the loop wrote last — was told "This case has
 * already been assigned to another attorney" while still being shown a running
 * clock and an Accept button. The lock also hid these cases from the routing
 * engine, which refuses to escalate a locked case (CP-812).
 *
 * Admin routing no longer writes the lock. This is for the rows already carrying
 * one when that shipped.
 *
 * Reports and changes nothing unless run with --apply, so the intended writes
 * can be read before any are made. Idempotent: a released case no longer matches.
 *
 * Run:  node ../node_modules/tsx/dist/cli.mjs scripts/repair-falsely-locked-admin-leads.ts
 *       node ../node_modules/tsx/dist/cli.mjs scripts/repair-falsely-locked-admin-leads.ts --apply
 */
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')

async function main() {
  const locked = await prisma.leadSubmission.findMany({
    where: { routingLocked: true, sourceType: 'admin' },
    select: {
      id: true,
      assessmentId: true,
      assignedAttorneyId: true,
      status: true,
      lifecycleState: true,
      createdAt: true,
      assessment: { select: { referenceCode: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Admin-routed cases carrying a routing lock: ${locked.length}`)
  if (!APPLY) console.log('DRY RUN — pass --apply to write. Nothing will change.\n')

  let released = 0
  let genuine = 0

  for (const lead of locked) {
    // Two independent records of a real acceptance, and either one is enough to
    // leave the lock alone. A genuine accept writes lifecycleState
    // 'attorney_matched' through claimCaseForAttorney and moves the attorney's
    // introduction to ACCEPTED; admin routing did neither, leaving the row at
    // 'submitted' with a PENDING introduction. Erring toward keeping a lock is
    // the safe direction: releasing a case an attorney has paid for and is
    // working would put it back on the market.
    const acceptedIntro = await prisma.introduction.findFirst({
      where: { assessmentId: lead.assessmentId, status: 'ACCEPTED' },
      select: { id: true, attorneyId: true },
    })

    const label = lead.assessment?.referenceCode || lead.assessmentId

    if (acceptedIntro || lead.lifecycleState === 'attorney_matched') {
      console.log(`  ${label} — keeping lock (accepted by ${acceptedIntro?.attorneyId ?? lead.assignedAttorneyId})`)
      genuine++
      continue
    }

    console.log(`  ${label} — releasing (status=${lead.status}, assigned=${lead.assignedAttorneyId ?? 'none'})`)

    if (APPLY) {
      // Clear the assignment along with the lock. Admin routing pointed it at
      // whichever attorney the loop wrote last, which is not a claim and which
      // the document and demand routes read as one when refusing every other
      // attorney offered the case. The accept path sets both together.
      await prisma.leadSubmission.update({
        where: { id: lead.id },
        data: { routingLocked: false, assignedAttorneyId: null },
      })
    }
    released++
  }

  console.log(`\n${APPLY ? 'Released' : 'Would release'} ${released}. Genuinely accepted, left alone: ${genuine}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
