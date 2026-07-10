/**
 * Zero out the Match Quality + Marketplace Performance analytics for the Salman
 * Law Firm so the acquisition P&L reads a clean slate after a fresh reseed.
 *
 * What it clears (scoped to the firm's attorney rows only):
 *   - PlatformPayment rows (routing/subscription spend) -> "Routing spend",
 *     "Return on spend", "Cost per retained", "Refund rate" all go to 0.
 *   - Stored AttorneyDashboard counters (totalLeadsReceived / totalLeadsAccepted
 *     / totalFeesCollected / totalPlatformSpend) -> the FIRM Match Quality view
 *     reads these stored columns, so stale values from the old case book are reset.
 *   - Any lingering BillingPayment rows tied to the firm's assessments (normally
 *     already cascade-deleted with the cases).
 *
 * It does NOT touch the 10 fresh new-match leads — those legitimately show as
 * "Matches routed". Everything downstream (accepted / retained / spend / fees /
 * ROI) reads 0.
 *
 * SAFETY: dry-run by default. Writes only when CONFIRM=DELETE is set.
 *
 * Usage (local):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/zero-salman-marketplace.ts            # dry-run
 *   CONFIRM=DELETE node ../node_modules/tsx/dist/cli.mjs scripts/zero-salman-marketplace.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const CONFIRM = process.env.CONFIRM === 'DELETE'

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) {
    console.error(`No firm with slug "${FIRM_SLUG}". Nothing to zero.`)
    return
  }
  console.log(`Firm: ${firm.name} (id=${firm.id})`)

  const attorneys = await prisma.attorney.findMany({ where: { lawFirmId: firm.id }, select: { id: true, name: true, email: true } })
  const attorneyIds = attorneys.map((a) => a.id)
  console.log(`Firm attorneys: ${attorneys.length}`)
  for (const a of attorneys) console.log(`  - ${a.name} <${a.email}> (${a.id})`)

  const platformCount = attorneyIds.length
    ? await prisma.platformPayment.count({ where: { attorneyId: { in: attorneyIds } } })
    : 0
  const billingCount = await prisma.billingPayment.count({ where: { assessment: { lawFirmId: firm.id } } })
  const dashboards = attorneyIds.length
    ? await prisma.attorneyDashboard.findMany({
        where: { attorneyId: { in: attorneyIds } },
        select: { attorneyId: true, totalLeadsReceived: true, totalLeadsAccepted: true, totalFeesCollected: true, totalPlatformSpend: true },
      })
    : []

  console.log(`\nPlatformPayment rows to delete: ${platformCount}`)
  console.log(`BillingPayment rows to delete:  ${billingCount}`)
  console.log(`AttorneyDashboard rows to reset: ${dashboards.length}`)
  for (const d of dashboards) {
    console.log(
      `  - dash ${d.attorneyId}: received=${d.totalLeadsReceived} accepted=${d.totalLeadsAccepted} ` +
      `fees=${d.totalFeesCollected} spend=${d.totalPlatformSpend}`,
    )
  }

  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing changed. Re-run with CONFIRM=DELETE to apply.')
    return
  }

  if (platformCount) {
    const r = await prisma.platformPayment.deleteMany({ where: { attorneyId: { in: attorneyIds } } })
    console.log(`\nDeleted ${r.count} platform payments.`)
  }
  if (billingCount) {
    const r = await prisma.billingPayment.deleteMany({ where: { assessment: { lawFirmId: firm.id } } })
    console.log(`Deleted ${r.count} billing payments.`)
  }
  if (attorneyIds.length) {
    const r = await prisma.attorneyDashboard.updateMany({
      where: { attorneyId: { in: attorneyIds } },
      data: { totalLeadsReceived: 0, totalLeadsAccepted: 0, totalFeesCollected: 0, totalPlatformSpend: 0 },
    })
    console.log(`Reset ${r.count} attorney dashboard counters to 0.`)
  }

  console.log('\nDone. Match Quality + Marketplace Performance now read a clean slate for the firm.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
