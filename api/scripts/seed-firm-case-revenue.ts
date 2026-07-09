/**
 * Seed demo "fees collected" (attorney contingency revenue) for a firm's
 * retained cases so the Marketplace Performance page shows a realistic
 * Fees collected / ROI / Average fee instead of $0.
 *
 * For each retained lead we create one BillingPayment whose amount is a
 * contingency fee (FEE_RATE, default 33%) of the case's estimated value
 * (Prediction median band). Idempotent: skips assessments that already have a
 * demo revenue payment (matched by the reference tag).
 *
 * Usage:
 *   FIRM_SLUG=reddy-law-frim node ../node_modules/tsx/dist/cli.mjs scripts/seed-firm-case-revenue.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'reddy-law-frim'
const FEE_RATE = Number(process.env.FEE_RATE || 0.33)
const REFERENCE = 'DEMO-SETTLEMENT-FEE'

function parseJson(value: unknown): any {
  if (!value || typeof value !== 'string') return value || {}
  try { return JSON.parse(value) } catch { return {} }
}

async function main() {
  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  // Retained cases = cases the attorney signed and (for the demo) settled.
  const retained = await prisma.leadSubmission.findMany({
    where: { assessment: { lawFirmId: firm.id }, status: 'retained' },
    select: { assessmentId: true },
  })
  console.log(`Firm ${firm.name}: ${retained.length} retained case(s).`)

  let created = 0
  let skipped = 0
  let totalFees = 0
  for (const row of retained) {
    const existing = await prisma.billingPayment.findFirst({
      where: { assessmentId: row.assessmentId, reference: REFERENCE },
    })
    if (existing) { skipped++; continue }

    const prediction = await prisma.prediction.findFirst({
      where: { assessmentId: row.assessmentId },
      orderBy: { createdAt: 'desc' },
    })
    const bands = parseJson(prediction?.bands)
    const settlement = Number(bands.median ?? bands.p50 ?? bands.p75 ?? 0) || 45000
    const fee = Math.round(settlement * FEE_RATE)
    totalFees += fee

    await prisma.billingPayment.create({
      data: {
        assessmentId: row.assessmentId,
        amount: fee,
        method: 'ach',
        reference: REFERENCE,
        notes: `Demo contingency fee (${Math.round(FEE_RATE * 100)}% of $${settlement.toLocaleString()} settlement).`,
        processor: 'demo',
      },
    })
    created++
  }

  console.log(`\nCreated ${created} fee payment(s), skipped ${skipped} (already seeded).`)
  if (created > 0) console.log(`Total demo fees collected: $${totalFees.toLocaleString()} (avg $${Math.round(totalFees / created).toLocaleString()}/case).`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
