/**
 * Backfill valuations for cases that never got one.
 *
 * Attorney-facing money figures all read the `Prediction` table, so a case that
 * skipped `POST /v1/predict` (anything written directly to the database, e.g. by
 * a seed script) shows a blank value everywhere at once. The app now repairs
 * these lazily as cases are opened, but that only fixes a list after a refresh
 * and only fixes a case once someone visits it. This does the whole book in one
 * pass.
 *
 * Safe to re-run: cases that already have a valuation are skipped, never
 * replaced. It will not overwrite a real prediction with a recomputed one.
 *
 * Usage (prod, inside the api container):
 *   docker exec -w /app clearcaseiq-api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/backfill-case-valuations.ts
 *
 * Config (env vars, all optional):
 *   DRY_RUN=true       report what would change without writing
 *   FIRM_SLUG=<slug>   restrict to one firm's cases
 *   LIMIT=<n>          stop after n cases (default: no limit)
 */
import { PrismaClient } from '@prisma/client'
import { buildPredictionRecord } from '../src/lib/prediction-materializer'

const prisma = new PrismaClient()

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true'
const FIRM_SLUG = process.env.FIRM_SLUG || ''
const LIMIT = Number(process.env.LIMIT || 0)

async function main() {
  let lawFirmId: string | undefined
  if (FIRM_SLUG) {
    const firm = await prisma.lawFirm.findUnique({ where: { slug: FIRM_SLUG }, select: { id: true, name: true } })
    if (!firm) {
      console.error(`No law firm with slug "${FIRM_SLUG}".`)
      process.exit(1)
    }
    lawFirmId = firm.id
    console.log(`Restricting to ${firm.name} (${FIRM_SLUG}).`)
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      predictions: { none: {} },
      ...(lawFirmId ? { lawFirmId } : {}),
    },
    select: {
      id: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      facts: true,
      evidenceFiles: { select: { category: true, originalName: true, aiClassification: true } },
    },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  })

  console.log(`${assessments.length} case${assessments.length === 1 ? '' : 's'} without a valuation.`)
  if (assessments.length === 0) return

  let valued = 0
  let skipped = 0

  for (const assessment of assessments) {
    const record = buildPredictionRecord(assessment as any)
    if (!record) {
      skipped += 1
      console.log(`  skip ${assessment.id} (${assessment.claimType}) — engine returned no value`)
      continue
    }

    const median = JSON.parse(record.bands).median
    if (DRY_RUN) {
      console.log(`  would value ${assessment.id} (${assessment.claimType}) at ${median}`)
    } else {
      await prisma.prediction.create({ data: { assessmentId: assessment.id, ...record } })
      console.log(`  valued ${assessment.id} (${assessment.claimType}) at ${median}`)
    }
    valued += 1
  }

  console.log(
    `\n=== ${DRY_RUN ? 'Dry run: would value' : 'Valued'} ${valued} case${valued === 1 ? '' : 's'}` +
      `${skipped > 0 ? `, skipped ${skipped} the engine could not value` : ''}. ===`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
