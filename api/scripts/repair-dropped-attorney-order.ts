/**
 * Restore an attorney order that `submit-for-review` discarded, and re-route.
 *
 * Until the early return in that route was removed, submitting a case that
 * already had a LeadSubmission row (which every manual-review hold creates)
 * answered `{ ok: true }` and wrote nothing. Claimants who ranked their
 * attorneys after their case was held had that order dropped behind a success
 * screen, and the admin release then found no slate to honour and routed by its
 * own ranking instead.
 *
 * The deployed fix stops it happening again but does not recover the cases it
 * already happened to, because the order was never persisted anywhere — it only
 * ever existed in the browser. So the order has to be supplied here.
 *
 * Runs read-only unless APPLY=1, and refuses to touch a case already with an
 * attorney.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/repair-dropped-attorney-order.ts clearcaseiq-api:/app/repair-dropped-attorney-order.ts
 *   docker compose -f docker-compose.deploy.yml --env-file .env.prod exec \
 *     -e ASSESSMENT_ID=<id> -e ATTORNEY_IDS=att1,att2,att3 \
 *     api node ../node_modules/tsx/dist/cli.mjs repair-dropped-attorney-order.ts
 *
 * Add -e APPLY=1 to write. Add -e ROUTE=1 to also start routing once written.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const ATTORNEY_IDS = (process.env.ATTORNEY_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const APPLY = process.env.APPLY === '1'
const ROUTE = process.env.ROUTE === '1'

function parseJson(raw: unknown): any {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

async function main() {
  if (!ASSESSMENT_ID || ATTORNEY_IDS.length === 0) {
    console.log('Set ASSESSMENT_ID and ATTORNEY_IDS=att1,att2,att3 (in the order the claimant chose).')
    return
  }
  if (new Set(ATTORNEY_IDS).size !== ATTORNEY_IDS.length) {
    console.log('ATTORNEY_IDS contains duplicates. The order must be unambiguous.')
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
    console.log('No lead row: this case was never submitted, so there is no dropped order to restore.')
    console.log('Have the claimant submit it normally — the fix now persists the order.')
    return
  }

  // Never reorder a case underneath an attorney already working it.
  if (lead.routingLocked || lead.assignedAttorneyId) {
    console.log(
      `Refusing: the case is already with an attorney (assigned=${lead.assignedAttorneyId || 'none'}, ` +
        `locked=${lead.routingLocked}). Rewriting the queue now would restart the response clock.`,
    )
    return
  }

  // Every attorney named has to be real, active and actually routable, or the
  // restored order would name someone routing will silently skip.
  const attorneys = await prisma.attorney.findMany({
    where: { id: { in: ATTORNEY_IDS } },
    select: { id: true, name: true, isActive: true, isVerified: true },
  })
  const problems: string[] = []
  for (const id of ATTORNEY_IDS) {
    const a = attorneys.find((x) => x.id === id)
    if (!a) {
      problems.push(`${id}: no such attorney`)
      continue
    }
    if (!a.isActive) problems.push(`${a.name} (${id}): isActive=false`)
    if (!a.isVerified) problems.push(`${a.name} (${id}): isVerified=false, routing will skip them`)
  }
  console.log(`Restoring ${ATTORNEY_IDS.length} attorney(s) in order:`)
  ATTORNEY_IDS.forEach((id, i) => {
    const a = attorneys.find((x) => x.id === id)
    console.log(`  ${i + 1}. ${a?.name || '(unknown)'}  ${id}`)
  })
  if (problems.length > 0) {
    console.log('\nBlockers:')
    problems.forEach((p) => console.log(`  - ${p}`))
    console.log('\nFix these first; a restored order pointing at an unroutable attorney')
    console.log('reproduces the same silent nothing the claimant already experienced.')
    return
  }

  const preferences = {
    rankedAttorneyIds: ATTORNEY_IDS,
    mode: 'sequential_ranked_top3',
    // Marked so it is never mistaken for something the claimant did in the
    // product: the order is theirs, the write is ours.
    source: 'admin_repair',
    batchNumber: 1,
    rankedAt: new Date().toISOString(),
  }

  const facts = parseJson(assessment.facts) || {}
  const sourceDetails = parseJson(lead.sourceDetails) || {}

  if (facts.plaintiffAttorneyPreferences || sourceDetails.plaintiffAttorneyPreferences) {
    console.log('\nThis case already carries an attorney order:')
    console.log(`  on facts: ${JSON.stringify(facts.plaintiffAttorneyPreferences ?? null)}`)
    console.log(`  on lead:  ${JSON.stringify(sourceDetails.plaintiffAttorneyPreferences ?? null)}`)
    console.log('Nothing was dropped here. Not overwriting it.')
    return
  }

  if (!APPLY) {
    console.log('\nDRY RUN. Would write to both the facts and the lead sourceDetails:')
    console.log(JSON.stringify(preferences, null, 2))
    console.log('\nRe-run with -e APPLY=1 to write, and -e ROUTE=1 to route immediately after.')
    return
  }

  facts.plaintiffAttorneyPreferences = preferences
  sourceDetails.plaintiffAttorneyPreferences = preferences

  await prisma.$transaction([
    prisma.assessment.update({
      where: { id: ASSESSMENT_ID },
      data: { facts: JSON.stringify(facts) },
    }),
    prisma.leadSubmission.update({
      where: { assessmentId: ASSESSMENT_ID },
      data: {
        sourceDetails: JSON.stringify(sourceDetails),
        lifecycleState: 'routing_active',
        routingLocked: false,
      },
    }),
  ])
  console.log('\nWritten. The order now exists in both places routing reads.')

  if (!ROUTE) {
    console.log('Release the case from the admin manual-review queue to route it,')
    console.log('or re-run with -e ROUTE=1 to route from here.')
    return
  }

  // Imported lazily so a dry run never pulls the routing engine in.
  const { startAssessmentRouting } = await import('../src/lib/assessment-routing')
  const result = await startAssessmentRouting(ASSESSMENT_ID, {
    maxAttorneysPerWave: 1,
    preferTierRouting: false,
    fallbackToClassic: true,
    preferredAttorneyIds: ATTORNEY_IDS,
  })
  console.log('\nRouting result:')
  console.log(`  success:    ${result.success}`)
  console.log(`  gatePassed: ${(result as any).gatePassed}  ${(result as any).gateReason || ''}`)
  console.log(`  routedTo:   ${(result.routedTo || []).join(', ') || '(nobody)'}`)
  if (result.errors?.length) console.log(`  errors:     ${result.errors.join(' | ')}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
