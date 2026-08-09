/**
 * Phase D smoke test — negotiation & settlement stage engine.
 *
 * Asserts:
 *   1. An offer negotiation event advances the stage to NEGOTIATION.
 *   2. Finalizing the settlement scenario advances to SETTLEMENT_PENDING and
 *      materializes the settlement checklist.
 *   3. Marking it disbursed advances to DISBURSEMENT and materializes the
 *      disbursement checklist.
 *   4. computeSettlement surfaces status/finalizedAt/disbursedAt.
 *   5. loadSignalContext derives settlementFinalized / disbursementComplete.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-d.ts
 */
import { prisma } from '../src/lib/prisma'
import { computeTargetCaseStage, syncCaseStage } from '../src/lib/case-stage'
import { loadSignalContext } from '../src/lib/workflow-signals'
import { computeSettlement } from '../src/lib/settlement'
import { SETTLEMENT_MILESTONE, DISBURSEMENT_MILESTONE } from '../src/lib/settlement-prep'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass += 1
    console.log(`  \u2713 ${label}`)
  } else {
    fail += 1
    console.log(`  \u2717 ${label}`, extra ?? '')
  }
}

async function main() {
  console.log('\n=== Phase D smoke test (negotiation & settlement) ===\n')

  const incident = new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString()
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      status: 'retained',
      caseStage: 'DEMAND_SENT',
      facts: JSON.stringify({ incident: { date: incident } }),
    },
  })
  const assessmentId = assessment.id

  console.log('1) Offer → NEGOTIATION')
  await prisma.negotiationEvent.create({
    data: { assessmentId, eventType: 'offer', amount: 40000, status: 'open' },
  })
  const afterOffer = await syncCaseStage(assessmentId, { source: 'attorney', force: true })
  check('offer advances stage to NEGOTIATION', afterOffer === 'NEGOTIATION', afterOffer)

  console.log('\n2) Finalize → SETTLEMENT_PENDING + settlement checklist')
  // Give it a gross recovery to finalize against.
  await prisma.settlementScenario.create({
    data: { assessmentId, grossAmount: 75000, status: 'finalized', finalizedAt: new Date(), finalizedByName: 'Test Attorney' },
  })
  const sig1 = await loadSignalContext(assessmentId)
  check('settlementFinalized signal set', sig1.settlementFinalized === true, sig1)
  const targetFinal = await computeTargetCaseStage(assessmentId)
  check('target stage is SETTLEMENT_PENDING', targetFinal === 'SETTLEMENT_PENDING', targetFinal)
  const afterFinal = await syncCaseStage(assessmentId, { source: 'attorney', force: true })
  check('stage advanced to SETTLEMENT_PENDING', afterFinal === 'SETTLEMENT_PENDING', afterFinal)
  const settlementTasks = await prisma.caseTask.count({ where: { assessmentId, milestoneType: SETTLEMENT_MILESTONE } })
  check('settlement checklist created', settlementTasks >= 4, settlementTasks)

  const s1 = await computeSettlement(assessmentId)
  check('computeSettlement exposes status=finalized', s1.status === 'finalized', s1.status)
  check('computeSettlement exposes finalizedAt', !!s1.finalizedAt, s1.finalizedAt)

  console.log('\n3) Disburse → DISBURSEMENT + disbursement checklist')
  await prisma.settlementScenario.update({
    where: { assessmentId },
    data: { status: 'disbursed', disbursedAt: new Date(), disbursedByName: 'Test Attorney' },
  })
  const sig2 = await loadSignalContext(assessmentId)
  check('disbursementComplete signal set', sig2.disbursementComplete === true, sig2)
  const targetDisb = await computeTargetCaseStage(assessmentId)
  check('target stage is DISBURSEMENT', targetDisb === 'DISBURSEMENT', targetDisb)
  const afterDisb = await syncCaseStage(assessmentId, { source: 'attorney', force: true })
  check('stage advanced to DISBURSEMENT', afterDisb === 'DISBURSEMENT', afterDisb)
  const disbTasks = await prisma.caseTask.count({ where: { assessmentId, milestoneType: DISBURSEMENT_MILESTONE } })
  check('disbursement checklist created', disbTasks >= 4, disbTasks)

  const s2 = await computeSettlement(assessmentId)
  check('computeSettlement exposes status=disbursed', s2.status === 'disbursed', s2.status)

  console.log('\n4) Monotonic guard')
  // Removing the offer must NOT regress the stage below DISBURSEMENT.
  await prisma.negotiationEvent.deleteMany({ where: { assessmentId } })
  const afterDelete = await syncCaseStage(assessmentId, { source: 'system', force: true })
  check('stage stays at DISBURSEMENT (monotonic)', afterDelete === 'DISBURSEMENT', afterDelete)

  // Cleanup
  await prisma.caseTask.deleteMany({ where: { assessmentId } }).catch(() => {})
  await prisma.settlementScenario.deleteMany({ where: { assessmentId } }).catch(() => {})
  await prisma.negotiationEvent.deleteMany({ where: { assessmentId } }).catch(() => {})
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
