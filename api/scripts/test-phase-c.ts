/**
 * Phase C smoke test — demand preparation & package.
 *
 * Asserts:
 *   1. buildDemandLetterSections sources specials from the structured damages
 *      ledger (facts.damages.medical/lostWages/other), builds the chronology
 *      from facts.treatment[], and addresses comparative fault when on record.
 *   2. evaluateDemandGate blocks on denied/weak liability.
 *   3. A drafted (unsent) demand advances the stage to DEMAND_PREPARATION and
 *      materializes the demand-prep checklist; marking it sent advances to
 *      DEMAND_SENT.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-c.ts
 */
import { prisma } from '../src/lib/prisma'
import { buildDemandLetterSections, renderDemandLetter } from '../src/lib/demand-letter'
import { evaluateDemandGate, deriveTreatmentPosture } from '../src/lib/demand-readiness'
import { computeTargetCaseStage, syncCaseStage } from '../src/lib/case-stage'
import { DEMAND_PREP_MILESTONE } from '../src/lib/demand-prep'

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
  console.log('\n=== Phase C smoke test (demand prep & package) ===\n')

  console.log('1) Demand assembly from structured ledger facts')
  const facts = {
    incident: { date: 'March 3, 2025', narrative: 'rear-ended at a red light' },
    injuries: [{ type: 'neck' }],
    damages: { medical: 18000, med_charges: 18000, lostWages: 6000, wage_loss: 6000, futureMedical: 4000, other: 1500 },
    treatment: [
      { provider: 'ER', type: 'er', startDate: '2025-03-03', diagnosis: 'cervical strain' },
      { provider: 'Ortho', type: 'follow_up', startDate: '2025-05-10' },
    ],
    liability: { comparativeNegligence: 0.1 },
    liabilityRecord: { faultPosture: 'clear', strength: 82, defendantName: 'Delgado Trucking', faultTheory: 'The defendant ran the light and struck our client from behind.' },
  }
  const sections = buildDemandLetterSections({
    assessment: { venueState: 'CA', venueCounty: 'Los Angeles', claimType: 'auto' },
    facts,
    targetAmount: 75000,
    recipient: { name: 'Acme Adjuster', address: 'PO Box 1' },
  })
  const letter = renderDemandLetter(sections)
  check('medical specials from ledger ($18,000)', letter.includes('$18,000'), sections.damagesSummary)
  check('lost wages from ledger ($6,000)', letter.includes('$6,000'), sections.damagesSummary)
  check('future medical from ledger ($4,000)', letter.includes('$4,000'))
  check('other economic line present ($1,500)', letter.includes('$1,500'), sections.damagesSummary)
  check('chronology built from facts.treatment', /Delgado|Ortho|ER/.test(sections.treatmentTimeline) && sections.treatmentTimeline.includes('2025'), sections.treatmentTimeline)
  check('liability uses fault theory', sections.liability.includes('ran the light'), sections.liability)
  check('comparative fault addressed', /comparative/i.test(sections.liability), sections.liability)

  console.log('\n2) Liability gate blocker')
  const posture = deriveTreatmentPosture({ facts: { medical: { mmi: true }, treatment: [{ startDate: '2025-03-03', status: 'completed' }] } })
  const gateDenied = evaluateDemandGate({
    treatment: posture,
    documentedMedicalBills: 18000,
    hasMedicalRecords: true,
    liability: { posture: 'denied', strength: 30 },
  })
  check('denied liability blocks demand', !gateDenied.ready && gateDenied.blockers.some((b) => b.key === 'liability_not_established'), gateDenied.blockers.map((b) => b.key))
  const gateClear = evaluateDemandGate({
    treatment: posture,
    documentedMedicalBills: 18000,
    hasMedicalRecords: true,
    liability: { posture: 'clear', strength: 82 },
  })
  check('clear liability does not add blocker', !gateClear.blockers.some((b) => b.key === 'liability_not_established'), gateClear.blockers.map((b) => b.key))

  console.log('\n3) Stage transitions (drafted → sent) + demand-prep tasks')
  const incident = new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString()
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      status: 'retained',
      caseStage: 'TREATMENT',
      facts: JSON.stringify({ incident: { date: incident } }),
    },
  })
  const assessmentId = assessment.id
  // A drafted-but-unsent demand.
  const demand = await prisma.demandLetter.create({
    data: { assessmentId, targetAmount: 75000, recipient: 'Acme', content: 'draft', status: 'DRAFT' },
  })

  const targetDrafted = await computeTargetCaseStage(assessmentId)
  check('drafted demand → DEMAND_PREPARATION target', targetDrafted === 'DEMAND_PREPARATION', targetDrafted)

  const stageAfterDraft = await syncCaseStage(assessmentId, { source: 'system', force: true })
  check('stage advanced to DEMAND_PREPARATION', stageAfterDraft === 'DEMAND_PREPARATION', stageAfterDraft)

  const prepTasks = await prisma.caseTask.count({ where: { assessmentId, milestoneType: DEMAND_PREP_MILESTONE } })
  check('demand-prep checklist created', prepTasks >= 5, prepTasks)

  // Mark it sent.
  await prisma.demandLetter.update({ where: { id: demand.id }, data: { status: 'SENT', sentAt: new Date() } })
  const targetSent = await computeTargetCaseStage(assessmentId)
  check('sent demand → DEMAND_SENT target', targetSent === 'DEMAND_SENT', targetSent)
  const stageAfterSent = await syncCaseStage(assessmentId, { source: 'attorney', force: true })
  check('stage advanced to DEMAND_SENT', stageAfterSent === 'DEMAND_SENT', stageAfterSent)

  // Cleanup
  await prisma.demandLetter.deleteMany({ where: { assessmentId } }).catch(() => {})
  await prisma.caseTask.deleteMany({ where: { assessmentId } }).catch(() => {})
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
