/**
 * Clear the demo caseload for a SINGLE attorney login (by email) so it can be
 * re-seeded cleanly — the per-attorney analogue of clear-salman-cases.ts.
 *
 * Deletes every Assessment that is either assigned to the attorney's leads
 * (LeadSubmission.assignedAttorneyId) or that the attorney holds an Introduction
 * on. Thanks to the schema's onDelete: Cascade on the assessment relations, this
 * also removes the dependent LeadSubmission, Introduction, EvidenceFile,
 * Prediction, InsuranceDetail, FirmCaseAssignment, tasks, chat rooms, etc. The
 * attorney, firm, office, and login user are LEFT INTACT so re-seeding just
 * re-populates cases.
 *
 * SAFETY: dry-run by default. Writes only when CONFIRM=DELETE is set.
 *
 * Usage (prod, inside the api container):
 *   docker cp api/scripts/clear-attorney-cases.ts clearcaseiq-api:/app/clear-attorney-cases.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e ATTORNEY_EMAIL=sreddy20871@gmail.com api \
 *     node ../node_modules/tsx/dist/cli.mjs clear-attorney-cases.ts                 # dry-run
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e ATTORNEY_EMAIL=sreddy20871@gmail.com -e CONFIRM=DELETE api \
 *     node ../node_modules/tsx/dist/cli.mjs clear-attorney-cases.ts
 *
 * Usage (local / any DB via DATABASE_URL):
 *   ATTORNEY_EMAIL=sreddy20871@gmail.com node ../node_modules/tsx/dist/cli.mjs scripts/clear-attorney-cases.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ATTORNEY_EMAIL = (process.env.ATTORNEY_EMAIL || 'sreddy20871@gmail.com').trim()
const CONFIRM = process.env.CONFIRM === 'DELETE'

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const attorney = await prisma.attorney.findFirst({
    where: { OR: [{ email: ATTORNEY_EMAIL }, { email: ATTORNEY_EMAIL.toLowerCase() }, { email: ATTORNEY_EMAIL.toUpperCase() }] },
    select: { id: true, name: true, email: true },
  })
  if (!attorney) {
    console.error(`No attorney found for "${ATTORNEY_EMAIL}". Nothing to clear.`)
    return
  }
  console.log(`Attorney: ${attorney.name} <${attorney.email}> (${attorney.id})`)

  // Assessment ids reachable from this attorney's leads or introductions.
  const [byLead, byIntro] = await Promise.all([
    prisma.leadSubmission.findMany({ where: { assignedAttorneyId: attorney.id }, select: { assessmentId: true } }),
    prisma.introduction.findMany({ where: { attorneyId: attorney.id }, select: { assessmentId: true } }),
  ])
  const ids = Array.from(new Set([...byLead, ...byIntro].map((r) => r.assessmentId).filter(Boolean))) as string[]

  const assessments = ids.length
    ? await prisma.assessment.findMany({ where: { id: { in: ids } }, select: { id: true, claimType: true } })
    : []
  console.log(`\nAssessments tied to this attorney: ${assessments.length}`)
  const byType: Record<string, number> = {}
  for (const a of assessments) byType[a.claimType || '(none)'] = (byType[a.claimType || '(none)'] || 0) + 1
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`)

  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing deleted. Re-run with CONFIRM=DELETE to actually clear.')
    return
  }

  if (assessments.length) {
    const res = await prisma.assessment.deleteMany({ where: { id: { in: assessments.map((a) => a.id) } } })
    console.log(`\nDeleted ${res.count} assessments (dependent cases/routing/evidence cascaded).`)
  } else {
    console.log('\nNo assessments to delete.')
  }

  const remaining = await prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } })
  const remainingIntros = await prisma.introduction.count({ where: { attorneyId: attorney.id } })
  console.log(`Remaining leads: ${remaining}, introductions: ${remainingIntros}.`)
  console.log('Done. Attorney, firm, office, and login are intact — safe to re-seed.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
