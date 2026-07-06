/**
 * Diagnose + repair routing for the Salman Law Firm demo book.
 *
 * Why: an earlier seed run may have created the 50 assessments but left the
 * lead/introduction routing rows missing or pointed at a different attorney id,
 * so the attorney dashboard (which lists leads where assignedAttorneyId == the
 * email-resolved attorney OR an introduction exists) shows nothing. The seed's
 * idempotent top-up counts assessments (50) and creates 0, so it never repairs.
 *
 * This script prints the exact linkage BEFORE, re-links every firm assessment to
 * the email-resolved lead attorney (idempotent), then prints AFTER counts. It
 * never deletes anything.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/fix-salman-routing.ts clearcaseiq-api:/app/fix-salman-routing.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs fix-salman-routing.ts
 *
 * Set DRY_RUN=1 to only diagnose without writing.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FIRM_ADMIN_EMAIL = 'salman@salmanlawfirm.com'
const DRY_RUN = process.env.DRY_RUN === '1'

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

async function dashboardWhereCount(attorneyId: string) {
  return prisma.leadSubmission.count({
    where: {
      OR: [
        { assignedAttorneyId: attorneyId },
        { assessment: { introductions: { some: { attorneyId } } } },
      ],
    },
  })
}

async function report(label: string, firmId: string, attorneyId: string) {
  const assessments = await prisma.assessment.count({ where: { lawFirmId: firmId } })
  const assessmentIds = (await prisma.assessment.findMany({ where: { lawFirmId: firmId }, select: { id: true } })).map(a => a.id)
  const leadsForFirmAssessments = assessmentIds.length
    ? await prisma.leadSubmission.count({ where: { assessmentId: { in: assessmentIds } } })
    : 0
  const assignedToAttorney = await prisma.leadSubmission.count({ where: { assignedAttorneyId: attorneyId } })
  const introsForAttorney = await prisma.introduction.count({ where: { attorneyId } })
  const dash = await dashboardWhereCount(attorneyId)
  console.log(`\n----- ${label} -----`)
  console.log(`  assessments (lawFirmId == firm):            ${assessments}`)
  console.log(`  leadSubmissions on those assessments:       ${leadsForFirmAssessments}`)
  console.log(`  leadSubmissions assignedAttorneyId==attorney: ${assignedToAttorney}`)
  console.log(`  introductions attorneyId==attorney:         ${introsForAttorney}`)
  console.log(`  DASHBOARD query would return:               ${dash}  <-- what Salman sees`)
}

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  // Detect duplicate attorney rows with the same email (a common cause of the
  // dashboard resolving a *different* attorney id than the one routing points to).
  const attorneys = await prisma.attorney.findMany({ where: { email: FIRM_ADMIN_EMAIL } })
  console.log(`\nAttorney rows with email ${FIRM_ADMIN_EMAIL}: ${attorneys.length}`)
  for (const a of attorneys) console.log(`  - ${a.id}  lawFirmId=${a.lawFirmId}  active=${a.isActive}`)

  // getAttorneyFromReq uses findFirst by email — replicate that exactly.
  const attorney = await prisma.attorney.findFirst({ where: { email: FIRM_ADMIN_EMAIL } })
  if (!attorney) { console.error('No attorney resolves by email (dashboard would 403).'); process.exit(1) }
  console.log(`\nEmail-resolved attorney (what the dashboard uses): ${attorney.id}`)
  console.log(`Firm: ${firm.name} (${firm.id})`)

  const adminUser = await prisma.user.findUnique({ where: { email: FIRM_ADMIN_EMAIL } })

  await report('BEFORE', firm.id, attorney.id)

  if (DRY_RUN) {
    console.log('\nDRY_RUN=1 — no changes written.')
    return
  }

  // Deterministic order so the distribution is stable across re-runs.
  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, claimType: true },
  })

  // Give the demo book a realistic pipeline spread. Crucially a good chunk are
  // brand-new matches (status 'submitted' + PENDING introduction, not yet
  // assigned) so the dashboard's default "New Matches" view is populated; the
  // rest are active/retained cases.
  type Stage = 'new' | 'contacted' | 'consulted' | 'retained'
  const lifecycleFor: Record<Exclude<Stage, 'new'>, string> = {
    contacted: 'attorney_matched',
    consulted: 'consultation_scheduled',
    retained: 'engaged',
  }
  const stageFor = (i: number): Stage => {
    const m = i % 10
    if (m < 4) return 'new'        // 40% -> New Matches
    if (m < 6) return 'contacted'  // 20%
    if (m < 8) return 'consulted'  // 20%
    return 'retained'              // 20%
  }

  const counts: Record<Stage, number> = { new: 0, contacted: 0, consulted: 0, retained: 0 }
  let i = 0
  for (const a of assessments) {
    const stage = stageFor(i++)
    counts[stage]++
    const isNew = stage === 'new'

    // Introduction: PENDING (offered) for new matches, ACCEPTED for active cases.
    const existingIntro = await prisma.introduction.findFirst({ where: { assessmentId: a.id, attorneyId: attorney.id } })
    if (existingIntro) {
      await prisma.introduction.update({
        where: { id: existingIntro.id },
        data: {
          status: isNew ? 'PENDING' : 'ACCEPTED',
          respondedAt: isNew ? null : new Date(),
        },
      })
    } else {
      await prisma.introduction.create({
        data: {
          assessmentId: a.id, attorneyId: attorney.id,
          status: isNew ? 'PENDING' : 'ACCEPTED',
          message: isNew ? 'New plaintiff match for Salman Law Firm.' : 'Accepted by Salman Law Firm.',
          respondedAt: isNew ? null : new Date(), waveNumber: 1,
        },
      })
    }

    // Lead submission: new matches are unassigned + 'submitted'; active cases are
    // assigned + locked to the lead attorney.
    const leadData = isNew
      ? { assignedAttorneyId: null as string | null, assignmentType: 'shared', status: 'submitted', lifecycleState: 'routing_active', routingLocked: false }
      : { assignedAttorneyId: attorney.id, assignmentType: 'exclusive', status: stage, lifecycleState: lifecycleFor[stage as Exclude<Stage, 'new'>], routingLocked: true }

    const existingLead = await prisma.leadSubmission.findUnique({ where: { assessmentId: a.id } })
    if (existingLead) {
      await prisma.leadSubmission.update({ where: { assessmentId: a.id }, data: leadData })
    } else {
      await prisma.leadSubmission.create({
        data: {
          assessmentId: a.id,
          viabilityScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
          liabilityScore: Number((0.6 + Math.random() * 0.4).toFixed(2)),
          causationScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
          damagesScore: Number((0.5 + Math.random() * 0.45).toFixed(2)),
          sourceType: rand(['organic_search', 'referral', 'paid_ad', 'direct']),
          hotnessLevel: rand(['hot', 'warm']),
          evidenceChecklist: JSON.stringify({ photos: true, bills: true, medical_records: true }),
          ...leadData,
        },
      })
    }

    if (adminUser) {
      const existingAssignment = await prisma.firmCaseAssignment.findFirst({ where: { assessmentId: a.id, lawFirmId: firm.id } })
      if (!existingAssignment) {
        try {
          await prisma.firmCaseAssignment.create({
            data: {
              lawFirmId: firm.id, assessmentId: a.id, assignedAttorneyId: attorney.id, assignedUserId: adminUser.id,
              role: 'lead_attorney', status: 'active', assignedById: adminUser.id,
              notes: 'Routing repair.',
            },
          })
        } catch { /* ignore unique/constraint */ }
      }
    }
  }

  console.log(`\nPipeline distribution applied: new(submitted)=${counts.new}, contacted=${counts.contacted}, consulted=${counts.consulted}, retained=${counts.retained}`)
  await report('AFTER', firm.id, attorney.id)
  const newMatches = await prisma.leadSubmission.count({ where: { status: 'submitted', assessment: { lawFirmId: firm.id } } })
  console.log(`\nLeads that will show under "New Matches" (status=submitted): ${newMatches}`)
  console.log('Done. Refresh Salman\'s dashboard — New Matches + Active Cases will both be populated.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
