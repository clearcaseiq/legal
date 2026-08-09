/**
 * Phase B final smoke test — medical timeline write-through + ledger-driven gaps.
 *
 * Asserts:
 *   1. medical entries + status write through to facts.treatment[] / facts.medical.*
 *   2. treatment-gap detection on the timeline
 *   3. buildGaps surfaces the new ledger-driven gaps:
 *      - empty damages ledger -> damages gap
 *      - contested liability w/o report/witnesses -> liability gap
 *      - unconfirmed insurance coverage -> insurance gap
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-b-final.ts
 */
import { prisma } from '../src/lib/prisma'
import { createMedicalEntry, upsertMedicalStatus, getMedicalTimeline } from '../src/lib/medical-record'
import { upsertLiabilityRecord } from '../src/lib/liability-record'
import { buildCaseIntelligence } from '../src/lib/case-intelligence'

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
  console.log('\n=== Phase B final smoke test (medical + gaps) ===\n')

  const incident = new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString()
  // Realistic mid-stage case: the coarse documentation gaps are already
  // satisfied (records/bills/report/photos/wage on file, limits + carrier known)
  // so the ADDITIVE ledger-driven gaps are the ones that should surface.
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'DRAFT',
      facts: JSON.stringify({
        incident: { date: incident, narrative: 'rear-ended at a light' },
        evidence: ['medical_records', 'medical_bills', 'police_report', 'photos'],
        injuries: [{ type: 'neck', lifestyleImpact: ['cannot lift kids'] }],
        insurance: { policy_limit: 100000, carrier: 'Acme Mutual' },
        damages: { extracted_wage_loss: 4000 },
        injuryDetails: { priorInjury: 'none' },
      }),
    },
  })
  const assessmentId = assessment.id
  // Clear first-party coverage gap with a confirmed client UM row.
  await (prisma as any).insuranceDetail.create({
    data: { assessmentId, carrierName: 'Client Mutual', insuredParty: 'client', coverageType: 'um', coverageConfirmed: true, claimStatus: 'not_opened' },
  })

  console.log('1) Medical timeline write-through')
  await createMedicalEntry(assessmentId, {
    provider: 'ER',
    visitType: 'er',
    startDate: new Date(Date.now() - 290 * 24 * 3600 * 1000).toISOString(),
    status: 'completed',
    billedAmount: 8000,
  })
  // A second visit ~120 days later to force a treatment gap.
  await createMedicalEntry(assessmentId, {
    provider: 'Ortho',
    visitType: 'follow_up',
    startDate: new Date(Date.now() - 170 * 24 * 3600 * 1000).toISOString(),
    status: 'completed',
    billedAmount: 4000,
  })
  await upsertMedicalStatus(assessmentId, { treatmentStatus: 'mmi', mmi: true, mmiDate: new Date().toISOString(), symptoms: ['neck pain', 'headaches'] })

  const timeline = await getMedicalTimeline(assessmentId)
  check('2 visits recorded', timeline.visitCount === 2, timeline.visitCount)
  check('treatment gap detected', timeline.gaps.length >= 1, timeline.gaps)

  const a1 = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  const f1 = JSON.parse(a1!.facts)
  check('facts.treatment[] written (2)', Array.isArray(f1.treatment) && f1.treatment.length === 2, f1.treatment?.length)
  check('facts.medical.mmi = true', f1.medical?.mmi === true, f1.medical)
  check('facts.medical.treatmentStatus = mmi', f1.medical?.treatmentStatus === 'mmi', f1.medical)
  check('facts.medical.symptoms present', Array.isArray(f1.medical?.symptoms) && f1.medical.symptoms.includes('neck pain'), f1.medical?.symptoms)

  console.log('\n2) Ledger-driven gaps in buildCaseIntelligence')
  // No damage items + contested liability + unconfirmed insurance.
  await upsertLiabilityRecord(assessmentId, {
    faultPosture: 'disputed',
    policeReportStatus: 'none',
    hasWitnesses: false,
  })
  await (prisma as any).insuranceDetail.create({
    data: { assessmentId, carrierName: 'Acme Mutual', insuredParty: 'defendant', coverageConfirmed: false, claimStatus: 'not_opened' },
  })

  const intel = await buildCaseIntelligence(assessmentId)
  const gapKeys = (intel?.gaps || []).map((g: any) => g.key)
  check('intelligence built', !!intel, intel === null ? 'null' : 'ok')
  check('damages gap surfaced', gapKeys.includes('damages_ledger_empty'), gapKeys)
  check('liability_evidence gap surfaced', gapKeys.includes('liability_evidence'), gapKeys)
  check('coverage_unconfirmed gap surfaced', gapKeys.includes('coverage_unconfirmed'), gapKeys)

  // Cleanup
  await (prisma as any).medicalTreatmentEntry.deleteMany({ where: { assessmentId } }).catch(() => {})
  await (prisma as any).medicalCaseRecord.deleteMany({ where: { assessmentId } }).catch(() => {})
  await (prisma as any).liabilityRecord.deleteMany({ where: { assessmentId } }).catch(() => {})
  await (prisma as any).insuranceDetail.deleteMany({ where: { assessmentId } }).catch(() => {})
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
