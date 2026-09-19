/**
 * Send one case down the plaintiff's ranked attorney list, now.
 *
 * The path a case in manual review is supposed to take is the admin Release
 * button, which is the only one that reads `rankedAttorneyIds` off the lead.
 * Two things can leave a case unable to use it: the platform-wide routing
 * pause, which stops the release placing anyone, and a release that already
 * failed and left `manualReviewStatus` on 'released', which makes the endpoint
 * answer 400 and drops the case off the queue screen. A case in that state is
 * reachable from no button at all.
 *
 * This is that release, callable directly, honouring the same ranked order and
 * the same disclosure authorization. It is not a force-route: every check the
 * release performs still runs, and a case the plaintiff authorized nobody to
 * see is still refused.
 *
 * Runs read-only unless APPLY=1.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/route-ranked-now.ts clearcaseiq-prod-api:/app/scripts/route-ranked-now.ts
 *   docker exec -e ASSESSMENT_ID=<id> clearcaseiq-prod-api \
 *     node /node_modules/tsx/dist/cli.mjs scripts/route-ranked-now.ts
 *
 * Add -e APPLY=1 to route. Add -e OVERRIDE_PAUSE=1 to route while routing is
 * switched off platform-wide, which is audited as `routing_pause_overridden`.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const APPLY = process.env.APPLY === '1'
const OVERRIDE_PAUSE = process.env.OVERRIDE_PAUSE === '1'
const ACTOR = (process.env.ACTOR || 'route-ranked-now script').trim()

function parseJson(raw: unknown): any {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function rankedIdsFrom(source: any): string[] {
  const prefs = source?.plaintiffAttorneyPreferences
  const ranked = prefs?.rankedAttorneyIds
  return Array.isArray(ranked) ? ranked.map(String) : []
}

async function main() {
  if (!ASSESSMENT_ID) {
    console.log('Set ASSESSMENT_ID.')
    return
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: ASSESSMENT_ID },
    include: { leadSubmission: true },
  })
  if (!assessment) {
    console.log(`No case ${ASSESSMENT_ID}.`)
    return
  }
  const lead = assessment.leadSubmission
  if (!lead) {
    console.log('No lead row, so there is nothing to route. The case was never submitted.')
    return
  }

  // The ranked list routing actually reads lives on the lead; the copy on the
  // facts is what the claimant's UI wrote. Report both when they disagree,
  // because that disagreement is itself the bug on some cases.
  const rankedOnLead = rankedIdsFrom(parseJson(lead.sourceDetails))
  const rankedOnFacts = rankedIdsFrom(parseJson(assessment.facts))
  console.log('== CURRENT STATE ==========================================================')
  console.log(`  manualReviewStatus: ${assessment.manualReviewStatus || '(none)'}`)
  console.log(`  lifecycleState:     ${lead.lifecycleState}`)
  console.log(`  routingLocked:      ${lead.routingLocked}`)
  console.log(`  assignedTo:         ${lead.assignedAttorneyId || '(nobody)'}`)
  console.log(`  ranked on lead:     ${rankedOnLead.length}`)
  console.log(`  ranked on facts:    ${rankedOnFacts.length}`)
  if (rankedOnLead.length === 0) {
    console.log('\nNo ranked list on the lead, so this would route by the engine\'s own')
    console.log('ranking rather than the claimant\'s. Restore the order first with')
    console.log('repair-dropped-attorney-order.ts.')
    return
  }

  if (lead.routingLocked || lead.assignedAttorneyId) {
    console.log('\nRefusing: an attorney already has this case.')
    return
  }

  const attorneys = await prisma.attorney.findMany({
    where: { id: { in: rankedOnLead } },
    select: { id: true, name: true, email: true, isActive: true, isVerified: true },
  })
  const introductions = await prisma.introduction.findMany({
    where: { assessmentId: ASSESSMENT_ID },
    select: { attorneyId: true, status: true },
  })

  console.log('\n== THE ORDER ==============================================================')
  rankedOnLead.forEach((id, i) => {
    const a = attorneys.find((x) => x.id === id)
    const prior = introductions.filter((intro) => intro.attorneyId === id)
    const notes: string[] = []
    if (!a) notes.push('NO SUCH ATTORNEY')
    else {
      if (!a.isActive) notes.push('isActive=false')
      // The engine's candidate query filters on this, so an unverified
      // attorney is not skipped over — they are never a candidate at all.
      if (!a.isVerified) notes.push('isVerified=false, invisible to routing')
    }
    // Any prior offer, whatever its status, takes an attorney out of the
    // ranked walk. An expired one counts.
    if (prior.length > 0) notes.push(`already offered (${prior.map((p) => p.status).join(', ')})`)
    console.log(`  ${i + 1}. ${a?.name || id}${notes.length ? '  -- ' + notes.join('; ') : '  -- eligible'}`)
  })

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with -e APPLY=1 to route.')
    if (!OVERRIDE_PAUSE) {
      console.log('Add -e OVERRIDE_PAUSE=1 as well if routing is switched off platform-wide.')
    }
    return
  }

  const { routeReleasedCaseRespectingConsumerSlate, recordRoutingEvent } = await import(
    '../src/lib/routing-lifecycle'
  )

  if (OVERRIDE_PAUSE) {
    await recordRoutingEvent(ASSESSMENT_ID, null, null, 'routing_pause_overridden', {
      source: 'route_ranked_now_script',
      actorEmail: ACTOR,
    })
  }

  const result = await routeReleasedCaseRespectingConsumerSlate(ASSESSMENT_ID, {
    overrideRoutingDisabled: OVERRIDE_PAUSE,
  })

  console.log('\n== RESULT =================================================================')
  console.log(`  mode:       ${result.mode}`)
  if (result.attorneyId) console.log(`  routed to:  ${result.attorneyId}`)
  if (result.proposedAttorneyIds) console.log(`  proposed:   ${result.proposedAttorneyIds.join(', ')}`)
  if (result.error) console.log(`  error:      ${result.error}`)

  // `ranked_routed` is the only mode that means the claimant's own first
  // choice was contacted. Report what actually exists rather than trusting it.
  const after = await prisma.introduction.findMany({
    where: { assessmentId: ASSESSMENT_ID },
    select: { attorneyId: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\n  introductions now: ${after.length}`)
  for (const intro of after) {
    const a = attorneys.find((x) => x.id === intro.attorneyId)
    console.log(`    ${intro.createdAt.toISOString()}  ${a?.name || intro.attorneyId}  ${intro.status}`)
  }

  if (result.mode === 'held') {
    console.log('\n  Nothing was sent and the case is unchanged, so this is safe to re-run')
    console.log('  once the cause above is dealt with.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
