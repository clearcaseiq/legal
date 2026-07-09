/**
 * Clear the Salman Law Firm demo caseload so it can be re-seeded cleanly.
 *
 * Deletes every Assessment routed to the firm (lawFirmId == firm.id). Thanks to
 * the schema's `onDelete: Cascade` on the assessment relation, this also removes
 * the dependent LeadSubmission, Introduction, EvidenceFile, Prediction,
 * FirmCaseAssignment, tasks, reminders, chat rooms/messages, etc. The firm, its
 * offices, and the attorney/admin login are LEFT INTACT so re-seeding just
 * re-populates cases.
 *
 * SAFETY: dry-run by default. It only writes when CONFIRM=DELETE is set.
 *
 * Optional flags:
 *   REMOVE_DUPLICATE_ATTORNEYS=1  also delete extra attorney rows sharing the
 *     seed email that are NOT the email-resolved login attorney (cleans up the
 *     duplicate a mis-run seed created). The login attorney is never removed.
 *
 * Usage (local):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/clear-salman-cases.ts            # dry-run
 *   CONFIRM=DELETE node ../node_modules/tsx/dist/cli.mjs scripts/clear-salman-cases.ts
 *
 * Usage (prod, inside the api container):
 *   docker cp api/scripts/clear-salman-cases.ts clearcaseiq-api:/app/clear-salman-cases.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs clear-salman-cases.ts                  # dry-run
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec -e CONFIRM=DELETE api \
 *     node ../node_modules/tsx/dist/cli.mjs clear-salman-cases.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FIRM_ADMIN_EMAIL = (process.env.LOGIN_EMAIL || 'salman@salmanlawfirm.com').trim()
const CONFIRM = process.env.CONFIRM === 'DELETE'
const REMOVE_DUPLICATE_ATTORNEYS = process.env.REMOVE_DUPLICATE_ATTORNEYS === '1'

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) {
    console.error(`No firm with slug "${FIRM_SLUG}". Nothing to clear.`)
    return
  }
  console.log(`Firm: ${firm.name} (id=${firm.id})`)

  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    select: { id: true, claimType: true },
  })
  console.log(`\nAssessments routed to firm: ${assessments.length}`)
  const byType: Record<string, number> = {}
  for (const a of assessments) byType[a.claimType || '(none)'] = (byType[a.claimType || '(none)'] || 0) + 1
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`)

  const dupAttorneys = REMOVE_DUPLICATE_ATTORNEYS
    ? await (async () => {
        const login = await prisma.attorney.findFirst({ where: { email: FIRM_ADMIN_EMAIL } })
        const all = await prisma.attorney.findMany({ where: { lawFirmId: firm.id } })
        return all.filter((a) => !login || a.id !== login.id)
      })()
    : []
  if (REMOVE_DUPLICATE_ATTORNEYS) {
    console.log(`\nDuplicate attorney rows to remove (keeping login ${FIRM_ADMIN_EMAIL}): ${dupAttorneys.length}`)
    for (const a of dupAttorneys) console.log(`  - ${a.email} (id=${a.id})`)
  }

  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing deleted. Re-run with CONFIRM=DELETE to actually clear.')
    return
  }

  const ids = assessments.map((a) => a.id)
  if (ids.length) {
    const res = await prisma.assessment.deleteMany({ where: { id: { in: ids } } })
    console.log(`\nDeleted ${res.count} assessments (dependent cases/routing cascaded).`)
  } else {
    console.log('\nNo assessments to delete.')
  }

  if (REMOVE_DUPLICATE_ATTORNEYS && dupAttorneys.length) {
    const res = await prisma.attorney.deleteMany({ where: { id: { in: dupAttorneys.map((a) => a.id) } } })
    console.log(`Deleted ${res.count} duplicate attorney rows.`)
  }

  const remaining = await prisma.assessment.count({ where: { lawFirmId: firm.id } })
  console.log(`\nAssessments now routed to firm: ${remaining}`)
  console.log('Done. Firm, offices, and the login attorney/admin are intact — safe to re-seed.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
