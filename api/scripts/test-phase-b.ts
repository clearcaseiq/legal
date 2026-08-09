/**
 * Phase B smoke test — structured damages ledger + write-through.
 *
 * Asserts:
 *   1. rollups bucket items correctly (medical billed/paid/outstanding, future,
 *      wage loss, property, OOP, earning capacity)
 *   2. write-through updates facts.damages.{medical,lostWages,other} + future
 *   3. an empty ledger never clobbers existing facts.damages
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-b.ts
 */
import { prisma } from '../src/lib/prisma'
import { summarizeDamages, writeThroughDamages } from '../src/lib/damages-ledger'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ ${label}`, extra ?? '')
  }
}

async function main() {
  console.log('\n=== Phase B smoke test (damages ledger) ===\n')

  // Seed a case that already has a manual facts.damages blob (to prove the
  // empty-ledger no-clobber guarantee).
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      status: 'DRAFT',
      facts: JSON.stringify({ damages: { medical: 999, lostWages: 111 } }),
    },
  })
  const assessmentId = assessment.id

  console.log('1) Empty ledger must not clobber facts.damages')
  const emptySummary = await writeThroughDamages(assessmentId, { source: 'system' })
  const afterEmpty = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  const factsEmpty = JSON.parse(afterEmpty!.facts)
  check('empty ledger itemCount = 0', emptySummary.itemCount === 0, emptySummary.itemCount)
  check('facts.damages preserved (medical still 999)', factsEmpty.damages.medical === 999, factsEmpty.damages)

  console.log('\n2) Add ledger items across buckets')
  const items = [
    { category: 'medical', description: 'ER visit', amount: 12000, billingStatus: 'billed' },
    { category: 'medical', description: 'PT paid', amount: 3000, billingStatus: 'paid' },
    { category: 'medical', description: 'Ortho outstanding', amount: 2000, billingStatus: 'outstanding' },
    { category: 'future_medical', description: 'Injections', amount: 8000, isFuture: true },
    { category: 'lost_wages', description: 'Missed work', amount: 5000 },
    { category: 'lost_earning_capacity', description: 'Reduced capacity', amount: 20000, isFuture: true },
    { category: 'property_damage', description: 'Vehicle', amount: 4000 },
    { category: 'out_of_pocket', description: 'Meds/mileage', amount: 500 },
  ]
  for (const it of items) {
    await (prisma as any).damageItem.create({ data: { assessmentId, ...it, source: 'manual' } })
  }

  const summary = await summarizeDamages(assessmentId)
  check('medical.billed = 17000', summary.medical.billed === 17000, summary.medical)
  check('medical.paid = 3000', summary.medical.paid === 3000, summary.medical)
  check('medical.outstanding = 2000', summary.medical.outstanding === 2000, summary.medical)
  check('medical.incurred = 17000', summary.medical.incurred === 17000, summary.medical)
  check('futureMedical = 8000', summary.futureMedical === 8000, summary.futureMedical)
  check('lostWages = 5000', summary.lostWages === 5000, summary.lostWages)
  check('lostEarningCapacity = 20000', summary.lostEarningCapacity === 20000, summary.lostEarningCapacity)
  check('propertyDamage = 4000', summary.propertyDamage === 4000, summary.propertyDamage)
  check('outOfPocket = 500', summary.outOfPocket === 500, summary.outOfPocket)
  // specials = medical(17000) + wages(5000) + property(4000) + OOP(500) = 26500
  check('totals.specials = 26500', summary.totals.specials === 26500, summary.totals)
  // future = futureMedical(8000) + earningCapacity(20000) = 28000
  check('totals.future = 28000', summary.totals.future === 28000, summary.totals)
  check('totals.grand = 54500', summary.totals.grand === 54500, summary.totals)

  console.log('\n3) Write-through maps rollups into facts.damages')
  await writeThroughDamages(assessmentId, { source: 'attorney' })
  const after = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  const facts = JSON.parse(after!.facts)
  check('facts.damages.medical = 17000', facts.damages.medical === 17000, facts.damages)
  check('facts.damages.lostWages = 5000', facts.damages.lostWages === 5000, facts.damages)
  // other = property(4000) + OOP(500) + futureCost(0) + earningCapacity(20000) + other(0) = 24500
  check('facts.damages.other = 24500', facts.damages.other === 24500, facts.damages)
  check('facts.damages.futureMedical = 8000', facts.damages.futureMedical === 8000, facts.damages)
  check('facts.damagesLedger snapshot present', !!facts.damagesLedger && facts.damagesLedger.itemCount === 8, facts.damagesLedger?.itemCount)

  // Cleanup
  await (prisma as any).damageItem.deleteMany({ where: { assessmentId } })
  await prisma.caseChangeEvent.deleteMany({ where: { assessmentId } }).catch(() => {})
  await prisma.assessment.delete({ where: { id: assessmentId } })

  console.log(`\n=== Result: ${pass} passed, ${fail} failed ===\n`)
  if (fail > 0) process.exit(1)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
