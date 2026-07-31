/**
 * Show where a case stopped on its way to an attorney.
 *
 * The companion script (diagnose-new-matches.ts) answers "why can this attorney
 * not see the case". When the answer turns out to be "the case was never offered
 * to them at all", this one picks up from there and prints the routing state of
 * the case itself: its lifecycle, every introduction raised, whether it is
 * parked waiting for the plaintiff to approve a batch, whether the plaintiff has
 * authorized disclosure, and the routing event log.
 *
 * Read-only. It writes nothing and is safe to run against prod.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-routing.ts clearcaseiq-api:/app/diagnose-routing.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e PLAINTIFF='<name or case name>' api \
 *     node ../node_modules/tsx/dist/cli.mjs diagnose-routing.ts
 *
 * Or ASSESSMENT_ID=... to go straight to one case.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const PLAINTIFF = (process.env.PLAINTIFF || '').trim()
const LIMIT = Number(process.env.LIMIT || 5)

function pretty(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2).split('\n').join('\n     ')
    } catch {
      return value
    }
  }
  return JSON.stringify(value)
}

async function describe(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      caseName: true,
      claimType: true,
      createdAt: true,
      lawFirmId: true,
      facts: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  })
  if (!assessment) {
    console.log(`No assessment ${assessmentId}`)
    return
  }

  const plaintiff = `${assessment.user?.firstName || ''} ${assessment.user?.lastName || ''}`.trim()
  console.log('='.repeat(78))
  console.log(`CASE  ${assessment.caseName || plaintiff || assessment.id}`)
  console.log(`  assessmentId=${assessment.id}`)
  console.log(`  plaintiff=${plaintiff || 'n/a'} <${assessment.user?.email || 'no account'}>`)
  console.log(`  claimType=${assessment.claimType}  created=${assessment.createdAt.toISOString()}`)
  console.log(`  lawFirmId=${assessment.lawFirmId ?? 'null'}`)

  const lead = await prisma.leadSubmission.findUnique({ where: { assessmentId } })
  if (!lead) {
    // Routing only ever acts on a LeadSubmission, so its absence is the whole
    // explanation: nothing downstream will ever look at this case.
    console.log('\n  LEAD: none. The case has no lead submission, so it was never entered into routing.')
    return
  }
  console.log('\n  LEAD')
  console.log(`    status=${lead.status}  lifecycleState=${lead.lifecycleState}  routingLocked=${lead.routingLocked}`)
  console.log(`    assignedAttorneyId=${lead.assignedAttorneyId ?? 'null'}  assignmentType=${lead.assignmentType ?? 'null'}`)
  console.log(`    submittedAt=${lead.submittedAt ? lead.submittedAt.toISOString() : 'null'}`)
  console.log(`    sourceDetails=${pretty(lead.sourceDetails)}`)

  const intros = await prisma.introduction.findMany({
    where: { assessmentId },
    orderBy: { requestedAt: 'asc' },
    select: {
      status: true,
      waveNumber: true,
      requestedAt: true,
      respondedAt: true,
      declineReason: true,
      attorney: { select: { id: true, name: true, email: true } },
    },
  })
  console.log(`\n  INTRODUCTIONS: ${intros.length}`)
  for (const i of intros) {
    console.log(
      `    ${i.status.padEnd(14)} wave=${i.waveNumber}  ${i.attorney.email}  requested=${i.requestedAt.toISOString()}` +
        `${i.respondedAt ? `  responded=${i.respondedAt.toISOString()}` : ''}` +
        `${i.declineReason ? `  reason=${i.declineReason}` : ''}`
    )
  }
  if (intros.length === 0) {
    console.log('    (none — no attorney has been offered this case)')
  }

  // Routing refuses to disclose a case the consumer has not authorized sharing,
  // and that refusal is silent from the attorney's side: no offer is created and
  // nothing appears anywhere in their dashboard.
  const consents = await prisma.consent.findMany({
    where: { assessmentId, consentType: 'attorney_share' },
    orderBy: { createdAt: 'desc' },
  })
  console.log(`\n  SHARE AUTHORIZATION (consentType='attorney_share'): ${consents.length} record(s)`)
  for (const c of consents) {
    const row = c as unknown as Record<string, unknown>
    console.log(`    granted=${row.granted ?? row.accepted ?? 'n/a'}  version=${c.version}  at=${c.createdAt.toISOString()}`)
    if (row.metadata) console.log(`     metadata=${pretty(row.metadata)}`)
  }
  if (consents.length === 0) {
    console.log('    (none — if the pre-routing gate requires one, routing will not offer this case)')
  }

  // Submission writes the authorization twice: this copy into the assessment, and
  // the durable row above. Comparing them says which half failed. Present here but
  // missing above means the consumer did authorize and the insert failed; absent
  // from both means the submission never carried the authorization at all.
  let attorneyShare: unknown = undefined
  try {
    const facts = JSON.parse(assessment.facts || '{}') as Record<string, unknown>
    const factConsents = (facts.consents || {}) as Record<string, unknown>
    attorneyShare = factConsents.attorneyShare
  } catch {
    /* unparseable facts tell us nothing either way */
  }
  console.log('\n  facts.consents.attorneyShare')
  console.log(
    attorneyShare === undefined
      ? '    absent — the submission did not carry a share authorization'
      : `    ${pretty(attorneyShare)}`
  )

  const events = await prisma.routingAnalytics.findMany({
    where: { assessmentId },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })
  console.log(`\n  ROUTING EVENTS: ${events.length}`)
  for (const e of events) {
    const row = e as unknown as Record<string, unknown>
    console.log(`    ${e.createdAt.toISOString()}  ${e.eventType}${e.attorneyId ? `  attorney=${e.attorneyId}` : ''}`)
    if (row.eventData) console.log(`     ${pretty(row.eventData)}`)
  }
  if (events.length === 0) {
    console.log('    (none — routing has never run on this case)')
  }
  console.log('')
}

async function main() {
  if (ASSESSMENT_ID) {
    await describe(ASSESSMENT_ID)
    return
  }

  if (!PLAINTIFF) {
    // Default to the newest cases, which is what "the one we just routed" means.
    const recent = await prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      select: { id: true },
    })
    console.log(`No PLAINTIFF or ASSESSMENT_ID set — showing the ${recent.length} most recent cases.\n`)
    for (const a of recent) await describe(a.id)
    return
  }

  const matches = await prisma.assessment.findMany({
    where: {
      OR: [
        { caseName: { contains: PLAINTIFF, mode: 'insensitive' } },
        { user: { firstName: { contains: PLAINTIFF, mode: 'insensitive' } } },
        { user: { lastName: { contains: PLAINTIFF, mode: 'insensitive' } } },
        { user: { email: { contains: PLAINTIFF, mode: 'insensitive' } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
    select: { id: true },
  })
  if (matches.length === 0) {
    console.log(`No case matching "${PLAINTIFF}".`)
    return
  }
  for (const a of matches) await describe(a.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
