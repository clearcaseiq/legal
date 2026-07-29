/**
 * Move demo cases to a recent, still-filable incident date.
 *
 * The case seeder used to draw incident dates from a hardcoded start year, which
 * meant a demo book aged out of the statute of limitations on its own: by 2026
 * most cases seeded against a 2022 anchor were past California's two-year
 * personal-injury period, and they were routed to attorneys anyway because the
 * seeder writes introductions directly and never runs the pre-routing gate.
 *
 * Every date in a case moves by the same offset, so the incident/treatment
 * chronology stays internally consistent — only the calendar position changes.
 *
 * DEMO DATA ONLY. FIRM_SLUG is required and there is no "all firms" mode, because
 * rewriting the incident date on a real case would falsify the record and destroy
 * the very deadline this is meant to protect.
 *
 * Usage (inside the api container):
 *   docker exec -w /app -e FIRM_SLUG=musk-law-firm clearcaseiq-api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/refresh-demo-case-dates.ts
 *
 * Config:
 *   FIRM_SLUG      required, e.g. "musk-law-firm"
 *   SCOPE          "expired" (default) re-dates only time-barred cases;
 *                  "all" re-dates every case in the book
 *   MAX_AGE_DAYS   oldest incident date to produce, in days (default 330).
 *                  Clamped per claim type so the result is never near its SOL.
 *   DRY_RUN        "1" to report without writing
 */
import { PrismaClient } from '@prisma/client'
import { SOL_RULES, deriveSOLStatusFromFacts, normalizeClaimTypeForSOL } from '../src/lib/solRules'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || ''
const SCOPE = process.env.SCOPE === 'all' ? 'all' : 'expired'
const DRY_RUN = process.env.DRY_RUN === '1'
/**
 * 330 days rather than a flat 365: it still reads as "within the last year" but
 * keeps a two-year claim above the 365-days-remaining threshold, so a repaired
 * book does not come back as a wall of "deadline approaching" warnings.
 */
const MAX_AGE_DAYS = Number(process.env.MAX_AGE_DAYS || 330)
const MIN_AGE_DAYS = 30
const DAY_MS = 24 * 3600 * 1000

function parseFacts(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * How old the incident may be for this claim type.
 *
 * Capped by the requested window and by the claim's own limitation period, so a
 * short-SOL type (California med-mal runs one year) still lands with room to
 * spare instead of being dated right up against its deadline.
 */
function maxAgeDaysFor(claimType: string): number {
  const rule = SOL_RULES.CA?.[normalizeClaimTypeForSOL(claimType)]
  const solDays = (rule?.years ?? 2) * 365.25
  const safetyDays = Math.max(60, solDays * 0.15)
  return Math.max(MIN_AGE_DAYS + 1, Math.min(MAX_AGE_DAYS, solDays - safetyDays))
}

function shiftIsoDate(value: unknown, shiftDays: number): unknown {
  if (typeof value !== 'string') return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const shifted = new Date(parsed.getTime() + shiftDays * DAY_MS)
  // Preserve the original shape: date-only strings stay date-only.
  return value.length <= 10 ? shifted.toISOString().split('T')[0] : shifted.toISOString()
}

/** Move every date the case carries by the same offset. */
function shiftFactDates(facts: Record<string, any>, shiftDays: number): Record<string, any> {
  const next = JSON.parse(JSON.stringify(facts)) as Record<string, any>

  if (next.incident?.date) next.incident.date = shiftIsoDate(next.incident.date, shiftDays)
  if (next.incident?.discoveryDate) next.incident.discoveryDate = shiftIsoDate(next.incident.discoveryDate, shiftDays)
  if (next.incident?.discoveredDate) next.incident.discoveredDate = shiftIsoDate(next.incident.discoveredDate, shiftDays)
  if (next.discoveryDate) next.discoveryDate = shiftIsoDate(next.discoveryDate, shiftDays)

  for (const key of ['injuries', 'treatment', 'chronology'] as const) {
    if (!Array.isArray(next[key])) continue
    next[key] = next[key].map((entry: any) =>
      entry && typeof entry === 'object' ? { ...entry, date: shiftIsoDate(entry.date, shiftDays) } : entry,
    )
  }

  return next
}

async function main() {
  if (!FIRM_SLUG) {
    console.error('FIRM_SLUG is required. This script only re-dates demo books.')
    process.exit(1)
  }

  const firm = await prisma.lawFirm.findUnique({ where: { slug: FIRM_SLUG }, select: { id: true, name: true } })
  if (!firm) {
    console.error(`No law firm found with slug "${FIRM_SLUG}".`)
    process.exit(1)
  }

  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true },
  })
  console.log(
    `${firm.name}: ${assessments.length} cases | scope=${SCOPE} | window=${MIN_AGE_DAYS}-${MAX_AGE_DAYS} days${DRY_RUN ? ' | dry run' : ''}\n`,
  )

  let expired = 0
  let repaired = 0

  for (const assessment of assessments) {
    const facts = parseFacts(assessment.facts)
    const sol = deriveSOLStatusFromFacts({
      facts,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
    })
    if (sol.status === 'expired') expired += 1
    if (SCOPE === 'expired' && sol.status !== 'expired') continue

    const incidentDate = facts.incident?.date ? new Date(facts.incident.date) : null
    if (!incidentDate || Number.isNaN(incidentDate.getTime())) {
      console.log(`  skip ${assessment.id}: no readable incident date`)
      continue
    }

    // Spread the book across the window rather than stacking every case on one
    // date, so the repaired caseload still looks like a real intake pipeline.
    const maxAge = maxAgeDaysFor(assessment.claimType)
    const targetAgeDays = MIN_AGE_DAYS + Math.random() * (maxAge - MIN_AGE_DAYS)
    const targetIncident = new Date(Date.now() - targetAgeDays * DAY_MS)
    const shiftDays = Math.round((targetIncident.getTime() - incidentDate.getTime()) / DAY_MS)
    if (shiftDays === 0) continue

    const nextFacts = shiftFactDates(facts, shiftDays)
    const direction = shiftDays > 0 ? '+' : ''
    console.log(
      `  ${assessment.id} ${assessment.claimType}: ${facts.incident.date} -> ${nextFacts.incident.date} (${direction}${shiftDays}d)`,
    )
    if (DRY_RUN) {
      repaired += 1
      continue
    }

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { facts: JSON.stringify(nextFacts) },
    })

    // Evidence capture dates travel with the incident, or the exhibit list ends
    // up predating the collision it documents.
    const evidence = await prisma.evidenceFile.findMany({
      where: { assessmentId: assessment.id, captureDate: { not: null } },
      select: { id: true, captureDate: true },
    })
    for (const file of evidence) {
      if (!file.captureDate) continue
      await prisma.evidenceFile.update({
        where: { id: file.id },
        data: { captureDate: new Date(file.captureDate.getTime() + shiftDays * DAY_MS) },
      })
    }

    // Release anything the SOL sweep already pulled out of routing.
    await prisma.leadSubmission.updateMany({
      where: { assessmentId: assessment.id, lifecycleState: 'not_routable_yet' },
      data: { lifecycleState: 'attorney_matched' },
    })

    repaired += 1
  }

  console.log(
    `\n=== ${expired} of ${assessments.length} case(s) were time-barred. ${repaired} ${DRY_RUN ? 'would be' : ''} re-dated. ===`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
