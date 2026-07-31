/**
 * Explain why a routed case is missing from an attorney's "New Matches".
 *
 * The dashboard applies four independent gates, and a case that fails any one of
 * them disappears with no explanation anywhere in the UI. This replays all four
 * against production data and names the one that is failing.
 *
 * Read-only. It writes nothing and is safe to run against prod.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-new-matches.ts clearcaseiq-api:/app/diagnose-new-matches.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e ATTORNEY_EMAIL=shivan@... api \
 *     node ../node_modules/tsx/dist/cli.mjs diagnose-new-matches.ts
 *
 * Optional:
 *   ATTORNEY_NAME=<sub>   find the attorney by name instead of email
 *   ASSESSMENT_ID=...     focus on one case instead of the whole caseload
 *   PLAINTIFF=<substring> focus by plaintiff name
 *   DEADLINE_MINUTES=...  the admin "attorney response deadline" (default 1440).
 *                         Read it off the admin matching-rules screen; the expiry
 *                         verdict below is only as right as this number.
 *
 * With neither ATTORNEY_EMAIL nor ATTORNEY_NAME it lists attorneys and stops, so
 * it can be run first just to find the right address.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ATTORNEY_EMAIL = (process.env.ATTORNEY_EMAIL || '').trim()
const ATTORNEY_NAME = (process.env.ATTORNEY_NAME || '').trim()
const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const PLAINTIFF = (process.env.PLAINTIFF || '').trim().toLowerCase()
const DEADLINE_MINUTES = Number(process.env.DEADLINE_MINUTES || 24 * 60)

const TERMINAL = ['EXPIRED', 'DECLINED']

function hoursAgo(d: Date | null | undefined): string {
  if (!d) return 'n/a'
  return `${((Date.now() - d.getTime()) / 3_600_000).toFixed(1)}h ago`
}

async function main() {
  const select = { id: true, name: true, email: true, isActive: true, lawFirmId: true, createdAt: true }

  if (!ATTORNEY_EMAIL && !ATTORNEY_NAME) {
    const all = await prisma.attorney.findMany({ select, orderBy: { createdAt: 'desc' }, take: 40 })
    console.log('\nSet ATTORNEY_EMAIL (or ATTORNEY_NAME). Most recent attorneys:\n')
    for (const a of all) console.log(`  ${a.email}   ${a.name}   active=${a.isActive}`)
    return
  }

  // The dashboard resolves the attorney with findFirst by email. Duplicate rows
  // are a recurring cause of an empty dashboard: routing points at one id while
  // the login resolves the other, and nothing in the UI hints at it. Resolving by
  // name has to collapse to a single email first, or the duplicate check below
  // would be comparing rows that were never meant to be the same person.
  let email = ATTORNEY_EMAIL
  if (!email) {
    const byName = await prisma.attorney.findMany({
      where: { name: { contains: ATTORNEY_NAME, mode: 'insensitive' } },
      select,
      orderBy: { createdAt: 'asc' },
    })
    const emails = [...new Set(byName.map((a) => a.email))]
    if (emails.length === 0) {
      console.error(`\nNo attorney whose name contains "${ATTORNEY_NAME}".`)
      process.exit(1)
    }
    if (emails.length > 1) {
      console.error(`\n"${ATTORNEY_NAME}" matches several people. Re-run with ATTORNEY_EMAIL set to one of:`)
      for (const a of byName) console.error(`  ${a.email}   ${a.name}`)
      process.exit(1)
    }
    email = emails[0]
    console.log(`\nName "${ATTORNEY_NAME}" resolved to ${email}`)
  }

  const rows = await prisma.attorney.findMany({
    where: { email },
    select,
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\nAttorney rows for ${email}: ${rows.length}`)
  for (const r of rows) {
    console.log(`  - ${r.id}  active=${r.isActive}  firm=${r.lawFirmId}  created=${r.createdAt.toISOString()}`)
  }
  if (rows.length === 0) {
    console.error('\nNo attorney resolves by this email — the dashboard would 403.')
    process.exit(1)
  }
  if (rows.length > 1) {
    console.log('  !! More than one row. The dashboard uses the FIRST; routing may point at another.')
  }

  const attorney = rows[0]
  console.log(`\nDashboard resolves to: ${attorney.id} (${attorney.name})`)
  console.log(`Response deadline in use for this report: ${DEADLINE_MINUTES} min\n`)

  // Every case connected to this attorney by any route, including introductions
  // already in a terminal state — those are invisible to the dashboard, and
  // saying so is the whole point of the report.
  const where: any = ASSESSMENT_ID
    ? { assessmentId: ASSESSMENT_ID }
    : {
        OR: [
          { assignedAttorneyId: attorney.id },
          { assessment: { introductions: { some: { attorneyId: attorney.id } } } },
        ],
      }

  const leads = await prisma.leadSubmission.findMany({
    where,
    select: {
      id: true,
      assessmentId: true,
      status: true,
      lifecycleState: true,
      routingLocked: true,
      assignedAttorneyId: true,
      submittedAt: true,
      createdAt: true,
      assessment: {
        select: {
          caseName: true,
          user: { select: { firstName: true, lastName: true } },
          introductions: {
            where: { attorneyId: attorney.id },
            orderBy: { requestedAt: 'desc' },
            select: { id: true, status: true, requestedAt: true, waveNumber: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const filtered = PLAINTIFF
    ? leads.filter((l) => {
        const name = `${l.assessment?.user?.firstName || ''} ${l.assessment?.user?.lastName || ''}`.toLowerCase()
        return name.includes(PLAINTIFF) || (l.assessment?.caseName || '').toLowerCase().includes(PLAINTIFF)
      })
    : leads

  console.log(`Cases connected to this attorney: ${filtered.length}\n`)

  let shown = 0
  for (const lead of filtered) {
    const intro = lead.assessment?.introductions?.[0] || null
    const plaintiff = `${lead.assessment?.user?.firstName || ''} ${lead.assessment?.user?.lastName || ''}`.trim()
    const label = lead.assessment?.caseName || plaintiff || lead.assessmentId

    // Gate 1: visibility. Assigned, or holding a non-terminal introduction.
    const visible =
      lead.assignedAttorneyId === attorney.id || (intro !== null && !TERMINAL.includes(intro.status))

    // Gate 2: New Matches only lists leads still in 'submitted'.
    const isSubmitted = lead.status === 'submitted'

    // Gate 3 and 4 reproduce the offer-expiry guard, including its fallback to
    // the lead's own timestamps when there is no Introduction row.
    const base = intro?.requestedAt || lead.submittedAt || lead.createdAt || null
    const expiresAt = base ? new Date(base.getTime() + DEADLINE_MINUTES * 60_000) : null
    const statusOpen = !intro || !TERMINAL.includes(intro.status)
    const notLapsed = !expiresAt || expiresAt.getTime() > Date.now()

    const appears = visible && isSubmitted && statusOpen && notLapsed
    if (appears && !ASSESSMENT_ID && !PLAINTIFF) {
      shown++
      continue // Only detail the cases that are missing.
    }

    console.log(`${appears ? 'SHOWS' : 'HIDDEN'}  ${label}`)
    console.log(`   assessmentId=${lead.assessmentId}`)
    console.log(`   lead.status=${lead.status}  lifecycle=${lead.lifecycleState}  locked=${lead.routingLocked}`)
    console.log(`   assignedAttorneyId=${lead.assignedAttorneyId ?? 'null'}`)
    console.log(
      intro
        ? `   introduction: status=${intro.status} wave=${intro.waveNumber} requestedAt=${intro.requestedAt.toISOString()} (${hoursAgo(intro.requestedAt)})`
        : '   introduction: NONE for this attorney'
    )
    console.log(
      `   offer clock: base=${base ? base.toISOString() : 'none'}${intro ? ' (introduction)' : ' (fallback: lead submitted/created)'}` +
        `  expires=${expiresAt ? expiresAt.toISOString() : 'never'}`
    )
    if (!appears) {
      const reasons: string[] = []
      if (!visible) reasons.push('not visible (no assignment, and no non-terminal introduction)')
      if (!isSubmitted) reasons.push(`lead.status is '${lead.status}', New Matches lists only 'submitted'`)
      if (!statusOpen) reasons.push(`introduction is ${intro?.status}`)
      if (!notLapsed) {
        reasons.push(
          intro
            ? 'response window lapsed'
            : 'response window lapsed — measured from the case submission date, NOT from when it was routed here, because there is no Introduction row'
        )
      }
      console.log(`   REASON: ${reasons.join('; ')}`)
    }
    console.log('')
  }

  if (!ASSESSMENT_ID && !PLAINTIFF) {
    console.log(`(${shown} further case(s) appear correctly and were not detailed.)`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
