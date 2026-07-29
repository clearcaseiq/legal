/**
 * Re-date time-barred demo cases so a seeded book stays usable.
 *
 * The case seeder used to draw incident dates from a hardcoded start year, which
 * meant the demo book aged out of the statute of limitations on its own: by 2026
 * most cases seeded against a 2022 anchor were past California's two-year
 * personal-injury period, and they were routed to attorneys anyway because the
 * seeder writes introductions directly and never runs the pre-routing gate.
 *
 * This repairs books created by the old seeder. Every date in the case moves by
 * the same offset, so the incident/treatment chronology stays internally
 * consistent — only the calendar position changes.
 *
 * DEMO DATA ONLY. FIRM_SLUG is required and there is no "all firms" mode, because
 * rewriting the incident date on a real case would falsify the record and destroy
 * the very deadline this is meant to protect.
 *
 * Usage (inside the api container):
 *   docker exec -w /app clearcaseiq-api node ../node_modules/tsx/dist/cli.mjs \
 *     scripts/refresh-expired-demo-case-dates.ts
 *
 * Config:
 *   FIRM_SLUG   required, e.g. "musk-law-firm"
 *   DRY_RUN     "1" to report without writing
 */
import { PrismaClient } from '@prisma/client'
import { SOL_RULES, deriveSOLStatusFromFacts, normalizeClaimTypeForSOL } from '../src/lib/solRules'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || ''
const DRY_RUN = process.env.DRY_RUN === '1'

/** Matches the margin the seeder now leaves, clearing the "expiring soon" band. */
const SOL_MARGIN_DAYS = 400
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
  console.log(`${firm.name}: ${assessments.length} cases${DRY_RUN ? ' (dry run)' : ''}\n`)

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
    if (sol.status !== 'expired') continue
    expired += 1

    const incidentDate = facts.incident?.date ? new Date(facts.incident.date) : null
    if (!incidentDate || Number.isNaN(incidentDate.getTime())) {
      console.log(`  skip ${assessment.id}: no readable incident date`)
      continue
    }

    // Land the incident somewhere inside the live SOL window, keeping the same
    // spread the seeder produces so the repaired book is not uniformly dated.
    const rule = SOL_RULES.CA?.[normalizeClaimTypeForSOL(assessment.claimType)]
    const solDays = (rule?.years ?? 2) * 365.25
    const minAgeDays = 30
    const maxAgeDays = Math.max(minAgeDays + 1, solDays - SOL_MARGIN_DAYS)
    const targetAgeDays = minAgeDays + Math.random() * (maxAgeDays - minAgeDays)
    const targetIncident = new Date(Date.now() - targetAgeDays * DAY_MS)
    const shiftDays = Math.round((targetIncident.getTime() - incidentDate.getTime()) / DAY_MS)

    const nextFacts = shiftFactDates(facts, shiftDays)
    console.log(
      `  ${assessment.id} ${assessment.claimType}: ${facts.incident.date} -> ${nextFacts.incident.date} (+${shiftDays}d)`,
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

  console.log(`\n=== ${expired} expired case(s) found, ${repaired} ${DRY_RUN ? 'would be' : ''} repaired. ===`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
