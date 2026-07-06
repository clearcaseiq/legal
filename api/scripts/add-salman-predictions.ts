/**
 * Add valuation predictions (Est. Value) to the Salman Law Firm demo cases.
 *
 * The seed created assessments + facts but no Prediction rows, so the attorney
 * dashboard shows $0 estimated value (Est. Value / pipeline value read from
 * assessment.predictions[].bands.median). This computes realistic value bands
 * from each case's documented specials + injury severity + comparative fault and
 * writes one Prediction per Salman assessment.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/add-salman-predictions.ts clearcaseiq-api:/app/add-salman-predictions.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs add-salman-predictions.ts
 *
 * Idempotent: skips assessments that already have a prediction (set FORCE=1 to
 * overwrite / add a fresh prediction).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FORCE = process.env.FORCE === '1'
const MODEL_VERSION = 'seed-valuation-v1'

function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function round(n: number, step = 500): number { return Math.max(0, Math.round(n / step) * step) }

function painMultiplier(severity: number): number {
  if (severity >= 4) return 3.5
  if (severity >= 3) return 2.4
  if (severity >= 2) return 1.6
  return 1.1
}

function computeBands(facts: any): { p25: number; median: number; p75: number; severity: number; specials: number } {
  const d = facts?.damages || {}
  const specials =
    num(d.med_charges) + num(d.wage_loss) + num(d.future_medical) +
    num(d.estimated_property_damage) + num(d.services)

  const injuries: any[] = Array.isArray(facts?.injuries) ? facts.injuries : []
  const severity = injuries.length
    ? Math.round(injuries.reduce((s, i) => s + num(i.severity || 2), 0) / injuries.length)
    : 2

  // Comparative fault reduces recovery (facts.liability.comparativeFault like "5%").
  const compRaw = String(facts?.liability?.comparativeFault || '0').replace('%', '')
  const comparative = Math.min(0.5, Math.max(0, num(compRaw) / 100))

  const gross = specials * (1 + painMultiplier(severity))
  const median = round(gross * (1 - comparative))
  const p25 = round(median * 0.6)
  const p75 = round(median * 1.75)
  return { p25, median, p75, severity, specials }
}

async function main() {
  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    select: { id: true, claimType: true, facts: true, leadSubmission: { select: { viabilityScore: true, liabilityScore: true, causationScore: true, damagesScore: true } } },
  })
  console.log(`Firm: ${firm.name} — ${assessments.length} assessments`)

  let created = 0
  let skipped = 0
  let totalMedian = 0
  for (const a of assessments) {
    const existing = await prisma.prediction.findFirst({ where: { assessmentId: a.id } })
    if (existing && !FORCE) { skipped++; continue }

    let facts: any = {}
    try { facts = JSON.parse(a.facts) } catch { facts = {} }
    const { p25, median, p75, severity, specials } = computeBands(facts)
    totalMedian += median

    const ls = a.leadSubmission
    const viability = {
      overall: Number((ls?.viabilityScore ?? 0.7).toFixed(2)),
      liability: Number((ls?.liabilityScore ?? 0.7).toFixed(2)),
      causation: Number((ls?.causationScore ?? 0.65).toFixed(2)),
      damages: Number((ls?.damagesScore ?? 0.7).toFixed(2)),
    }
    const explain = {
      summary: `Estimated on documented specials of $${specials.toLocaleString('en-US')} with injury severity ${severity}/4.`,
      drivers: [
        `Documented medical + wage specials`,
        `Injury severity ${severity}/4`,
        `Comparative fault adjustment applied`,
      ],
      model: MODEL_VERSION,
    }

    await prisma.prediction.create({
      data: {
        assessmentId: a.id,
        modelVersion: MODEL_VERSION,
        viability: JSON.stringify(viability),
        bands: JSON.stringify({ p25, median, p75 }),
        explain: JSON.stringify(explain),
      },
    })
    created++
  }

  console.log(`\nCreated ${created} predictions, skipped ${skipped} (already had one).`)
  if (created > 0) console.log(`Average Est. Value (median): $${Math.round(totalMedian / created).toLocaleString('en-US')}`)
  console.log('Done. Refresh Salman\'s dashboard — Est. Value / pipeline value will populate.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
