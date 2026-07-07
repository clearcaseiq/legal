/**
 * Create upcoming consultation Appointments for Salman Law Firm's consult-stage
 * cases so the consult calendar is populated.
 *
 * Context: the demo seed routes ~17 cases to the "consultation_scheduled"
 * lifecycle stage but never created Appointment rows, so the consult calendar
 * rendered "No upcoming consultations" even though the pipeline showed consults
 * scheduled (the data inconsistency behind A3-26). This backfills real future
 * SCHEDULED appointments for those cases, linked to the firm's lead attorney, so
 * both the calendar and the (now calendar-sourced) notification show them.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/add-salman-appointments.ts clearcaseiq-api:/app/add-salman-appointments.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs add-salman-appointments.ts
 *
 * Idempotent: skips cases that already have a future SCHEDULED appointment.
 * Set FORCE=1 to add another appointment even if one already exists.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FIRM_ADMIN_EMAIL = process.env.FIRM_ADMIN_EMAIL || 'salman@salmanlawfirm.com'
const FORCE = process.env.FORCE === '1'
const TYPES = ['video', 'phone', 'in_person'] as const

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function businessHour(): number { return 9 + Math.floor(Math.random() * 8) } // 9am..4pm

async function main() {
  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  // Use the same lead attorney the seed assigns cases to (matches the attorneyId
  // the attorney dashboard queries appointments by).
  const attorney =
    (await prisma.attorney.findFirst({ where: { email: FIRM_ADMIN_EMAIL } })) ||
    (await prisma.attorney.findFirst({ where: { lawFirmId: firm.id }, orderBy: { createdAt: 'asc' } }))
  if (!attorney) { console.error('No attorney found for firm'); process.exit(1) }

  // Consult-stage leads: lifecycle "consultation_scheduled" (seed maps this to
  // status "consulted").
  const leads = await prisma.leadSubmission.findMany({
    where: {
      assignedAttorneyId: attorney.id,
      OR: [{ lifecycleState: 'consultation_scheduled' }, { status: 'consulted' }],
    },
    select: { id: true, assessmentId: true, assessment: { select: { userId: true } } },
  })
  console.log(`Firm: ${firm.name} — attorney ${attorney.name} — ${leads.length} consult-stage leads`)

  const now = new Date()
  let created = 0
  let skipped = 0
  for (const lead of leads) {
    if (!lead.assessmentId || !lead.assessment?.userId) { skipped++; continue }

    const existing = await prisma.appointment.findFirst({
      where: {
        attorneyId: attorney.id,
        assessmentId: lead.assessmentId,
        status: 'SCHEDULED',
        scheduledAt: { gte: now },
      },
      select: { id: true },
    })
    if (existing && !FORCE) { skipped++; continue }

    // Spread consults across the next 1..14 days at a business-hours slot.
    const scheduledAt = new Date(now)
    scheduledAt.setDate(scheduledAt.getDate() + 1 + Math.floor(Math.random() * 14))
    scheduledAt.setHours(businessHour(), rand([0, 15, 30, 45]), 0, 0)

    const type = rand(TYPES)
    await prisma.appointment.create({
      data: {
        userId: lead.assessment.userId,
        attorneyId: attorney.id,
        assessmentId: lead.assessmentId,
        type,
        status: 'SCHEDULED',
        scheduledAt,
        duration: rand([30, 45, 60]),
        notes: 'Initial consultation (demo).',
        meetingUrl: type === 'video' ? 'https://meet.clearcaseiq.com/demo' : null,
        phoneNumber: type === 'phone' ? '(213) 555-0100' : null,
        location: type === 'in_person' ? '600 Wilshire Blvd, Suite 1500, Los Angeles, CA' : null,
      },
    })
    created++
  }

  console.log(`\nCreated ${created} appointments, skipped ${skipped} (already scheduled or missing data).`)
  console.log("Done. Refresh Salman's dashboard — the consult calendar will populate.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
