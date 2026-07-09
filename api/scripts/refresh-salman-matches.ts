/**
 * Refresh the Salman Law Firm demo "New Matches" so they re-appear in the inbox.
 *
 * WHY: every routed match carries a response window (introduction.requestedAt +
 * defaultAttorneyResponseDeadlineMinutes, default 24h). The seed backdates
 * requestedAt to when it ran, so once ~24h passes the background offer-expiry
 * sweep flips each still-PENDING introduction to EXPIRED. The frontend then hides
 * expired offers from "New Matches", and because they were never accepted they're
 * not in "Active Cases" either — so the demo dashboard looks empty even though the
 * cases are correctly routed (DASHBOARD query still returns them).
 *
 * This script resets every submitted (pre-acceptance) lead routed to the firm back
 * to a *fresh* New Match: introduction status PENDING, requestedAt = now,
 * respondedAt = null, lead unlocked + assigned to the login attorney. That restarts
 * the response window so all matches show under New Matches again (for the length
 * of the window). Re-run whenever the demo book has aged out.
 *
 * Idempotent + read-only unless it finds submitted leads to refresh. It never
 * creates or deletes cases and never touches accepted/active cases.
 *
 * Usage (local):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/refresh-salman-matches.ts
 *
 * Usage (prod, inside the api container):
 *   docker cp api/scripts/refresh-salman-matches.ts clearcaseiq-api:/app/refresh-salman-matches.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs refresh-salman-matches.ts
 *
 * If Salman's prod login was ever repointed to a different email, pass
 * LOGIN_EMAIL='that-email' so the intros are refreshed on the right attorney.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const LOGIN_EMAIL = (process.env.LOGIN_EMAIL || 'salman@salmanlawfirm.com').trim()
const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) {
    console.error(`No firm with slug "${FIRM_SLUG}". Nothing to refresh.`)
    return
  }
  const attorney = await prisma.attorney.findFirst({ where: { email: LOGIN_EMAIL } })
  if (!attorney) {
    console.error(`No attorney resolves by email "${LOGIN_EMAIL}" (the dashboard would 404).`)
    return
  }
  console.log(`Firm: ${firm.name} (id=${firm.id})`)
  console.log(`Login attorney: ${attorney.email} (id=${attorney.id})`)

  // Grab EVERY lead routed to the firm (any status). The demo matches routinely get
  // advanced out of 'submitted' by the offer-expiry sweep + escalation once their
  // response window lapses, which leaves them showing in neither New Matches (needs
  // 'submitted') nor Active Cases (needs an accepted/retained status). We reset the
  // whole book back to fresh, pre-acceptance New Matches.
  const leads = await prisma.leadSubmission.findMany({
    where: { assessment: { lawFirmId: firm.id } },
    select: { id: true, assessmentId: true, status: true },
  })
  console.log(`\nLeads routed to firm (any status): ${leads.length}`)
  const byStatus: Record<string, number> = {}
  for (const l of leads) byStatus[l.status || '(none)'] = (byStatus[l.status || '(none)'] || 0) + 1
  for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${n}`)
  if (leads.length === 0) {
    console.log('\nNothing to refresh. (Re-seed with NEW_MATCHES to create some.)')
    return
  }

  if (DRY_RUN) {
    console.log(`\nDRY_RUN=1 — would reset all ${leads.length} lead(s) above to fresh "submitted" New Matches`)
    console.log('  (introductions -> PENDING, requestedAt = now, routing unlocked, firm-case assignments cleared).')
    console.log('Re-run without DRY_RUN=1 to apply.')
    return
  }

  // Drop any firm-case assignments so the reset matches are truly pre-acceptance
  // (the seed only creates assignments for accepted/retained cases, not New Matches).
  const assessmentIds = leads.map((l) => l.assessmentId)
  const removedAssignments = await prisma.firmCaseAssignment.deleteMany({
    where: { assessmentId: { in: assessmentIds }, lawFirmId: firm.id },
  })
  if (removedAssignments.count > 0) console.log(`\nCleared ${removedAssignments.count} firm-case assignment(s) (back to pre-acceptance).`)

  const now = new Date()
  let refreshed = 0
  for (const lead of leads) {
    // Keep the lead a fresh, unlocked, pre-acceptance match owned by the login attorney.
    await prisma.leadSubmission.update({
      where: { id: lead.id },
      data: {
        status: 'submitted',
        lifecycleState: 'routing_active',
        routingLocked: false,
        assignedAttorneyId: attorney.id,
      },
    })

    // Restart the attorney's offer timer so the sweep no longer treats it as stale.
    const intro = await prisma.introduction.findFirst({
      where: { assessmentId: lead.assessmentId, attorneyId: attorney.id },
    })
    if (intro) {
      await prisma.introduction.update({
        where: { id: intro.id },
        data: { status: 'PENDING', requestedAt: now, respondedAt: null },
      })
    } else {
      await prisma.introduction.create({
        data: {
          assessmentId: lead.assessmentId,
          attorneyId: attorney.id,
          status: 'PENDING',
          message: `New match routed to ${firm.name} (demo book).`,
          requestedAt: now,
          waveNumber: 1,
        },
      })
    }
    refreshed += 1
  }

  console.log(`\nRefreshed ${refreshed} New Match offer(s): PENDING, requestedAt reset to now.`)
  console.log('They will show under "New Matches" again for the length of the response window (default 24h).')
  console.log('Tip: re-run this whenever the demo book ages out, or accept a few to populate Active Cases.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
