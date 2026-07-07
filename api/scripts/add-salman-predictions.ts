/**
 * Add valuation predictions (Est. Value + viability) to the Salman Law Firm demo
 * cases using the SAME engine the live API uses (computeFeatures ->
 * predictViabilityHeuristic). The seed created assessments + facts but no
 * Prediction rows, so the attorney dashboard showed $0 estimated value and a 0%
 * viability breakdown (see A3-09, A3-29). This writes one Prediction per Salman
 * assessment with:
 *   - bands      (value p25/median/p75)  -> Est. Value / pipeline value
 *   - viability  (overall/liability/causation/damages) -> Viability Breakdown
 *   - explain    (heuristic explainability)
 * and syncs the LeadSubmission quality scores to match so every view is
 * consistent.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/add-salman-predictions.ts clearcaseiq-api:/app/add-salman-predictions.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs add-salman-predictions.ts
 *
 * Idempotent: skips assessments that already have a prediction (set FORCE=1 to
 * add a fresh prediction and re-sync scores).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FORCE = process.env.FORCE === '1'

function clamp01(n: number): number { return Math.max(0, Math.min(1, Number(n) || 0)) }

type Engine = {
  computeFeatures: (a: any) => any
  predictViabilityHeuristic: (features: any) => any
}

/**
 * Load the live valuation engine. In the production runtime image only the
 * compiled JS is shipped (dist/lib/prediction.js) and this script is typically
 * copied to /app, so a static `../src/...` import can't resolve. Probe the likely
 * locations at runtime and use whichever exports the engine functions.
 */
async function loadEngine(): Promise<Engine> {
  const candidates = [
    './dist/lib/prediction.js',
    '../dist/lib/prediction.js',
    './lib/prediction.js',
    '../src/lib/prediction',
    './src/lib/prediction',
  ]
  for (const candidate of candidates) {
    try {
      const imported: any = await import(candidate)
      const mod = imported?.computeFeatures ? imported : imported?.default ?? imported
      if (mod?.computeFeatures && mod?.predictViabilityHeuristic) return mod as Engine
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('Could not locate the valuation engine (expected dist/lib/prediction.js).')
}

async function main() {
  const { computeFeatures, predictViabilityHeuristic } = await loadEngine()
  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true },
  })
  console.log(`Firm: ${firm.name} — ${assessments.length} assessments`)

  let created = 0
  let skipped = 0
  let totalMedian = 0
  for (const a of assessments) {
    const existing = await prisma.prediction.findFirst({ where: { assessmentId: a.id } })
    if (existing && !FORCE) { skipped++; continue }

    // Real engine: features -> heuristic valuation. viability.liability is the
    // deterministic rules-based liability score; value_bands are derived from the
    // documented specials + injury severity + venue/insurance constraints.
    const features = computeFeatures(a as any)
    const resp = predictViabilityHeuristic(features)
    const bands: any = resp.value_bands || {}
    const median = Number(bands.median ?? bands.p50 ?? 0) || 0
    totalMedian += median

    await prisma.prediction.create({
      data: {
        assessmentId: a.id,
        modelVersion: resp.modelVersion,
        viability: JSON.stringify(resp.viability),
        bands: JSON.stringify(resp.value_bands),
        explain: JSON.stringify(resp.explainability),
      },
    })

    // Keep the LeadSubmission quality scores in sync with the prediction so views
    // that read those columns agree with the Viability Breakdown.
    const v: any = resp.viability || {}
    await prisma.leadSubmission.updateMany({
      where: { assessmentId: a.id },
      data: {
        viabilityScore: clamp01(v.overall),
        liabilityScore: clamp01(v.liability),
        causationScore: clamp01(v.causation),
        damagesScore: clamp01(v.damages),
      },
    })
    created++
  }

  console.log(`\nCreated ${created} predictions, skipped ${skipped} (already had one).`)
  if (created > 0) console.log(`Average Est. Value (median): $${Math.round(totalMedian / created).toLocaleString('en-US')}`)
  console.log("Done. Refresh Salman's dashboard — Est. Value, pipeline value, and the viability breakdown will populate.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
