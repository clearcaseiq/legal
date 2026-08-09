/**
 * Phase A smoke test — case-stage spine + Day-1 opening checklist + auto-advance.
 *
 * Seeds a retained case, runs the exact retention logic, and asserts:
 *   1. caseStage stamps OPENING on retention
 *   2. the Day-1 checklist is created (incl. an SOL deadline task)
 *   3. the stage advances monotonically as signals arrive
 *      (offer logged → NEGOTIATION; then a document check → never regresses)
 *
 * Creates everything under a disposable namespace and deletes it at the end.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-a.ts
 */
import { prisma } from '../src/lib/prisma'
import { createCaseOpeningTasks } from '../src/lib/case-opening'
import { openCaseStage, syncCaseStage, computeTargetCaseStage } from '../src/lib/case-stage'

const NS = `phaseA-test-${Date.now()}`
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
  console.log(`\n=== Phase A smoke test (${NS}) ===\n`)

  // --- Seed: attorney + retained assessment/lead --------------------------
  const attorney = await prisma.attorney.create({
    data: {
      name: 'Phase A Test Attorney',
      email: `${NS}@example.test`,
      barState: 'CA',
      specialties: 'auto',
      venues: 'CA',
    } as any,
  })

  const incidentDate = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() // 60 days ago
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      status: 'DRAFT',
      facts: JSON.stringify({ incident: { date: incidentDate } }),
    },
  })

  await prisma.leadSubmission.create({
    data: {
      assessmentId: assessment.id,
      sourceType: 'direct',
      status: 'retained',
      lifecycleState: 'engaged',
      routingLocked: true,
      assignedAttorneyId: attorney.id,
      assignmentType: 'exclusive',
    },
  })

  const assessmentId = assessment.id

  // --- 1. Retention: Day-1 tasks + OPENING --------------------------------
  console.log('1) Retention → Day-1 checklist + OPENING')
  const created = await createCaseOpeningTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
  await openCaseStage(assessmentId, { source: 'attorney' })

  const afterOpen = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { caseStage: true, caseStageAt: true },
  })
  const tasks = await prisma.caseTask.findMany({ where: { assessmentId } })
  const solTask = tasks.find((t) => t.taskType === 'statute' && t.deadlineType === 'sol')
  const openingTasks = tasks.filter((t) => t.milestoneType === 'case_opening')

  check('created >= 10 Day-1 tasks (incl. SOL)', created >= 10, { created })
  check('caseStage = OPENING', afterOpen?.caseStage === 'OPENING', afterOpen)
  check('caseStageAt stamped', !!afterOpen?.caseStageAt)
  check('SOL deadline task auto-created', !!solTask, solTask?.title)
  check('SOL task has a future due date', !!solTask?.dueDate && solTask!.dueDate!.getTime() > Date.now())
  check('opening tasks tagged case_opening', openingTasks.length >= 10, { count: openingTasks.length })
  check('opening tasks are NOT held for AI review', openingTasks.every((t) => !t.reviewStatus))

  // --- 2. Idempotency ------------------------------------------------------
  console.log('\n2) Idempotency (re-run creates nothing)')
  const createdAgain = await createCaseOpeningTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
  check('re-run creates 0 tasks', createdAgain === 0, { createdAgain })

  // --- 3. Derivation floor -------------------------------------------------
  console.log('\n3) Derivation with no signals → OPENING')
  const target0 = await computeTargetCaseStage(assessmentId)
  check('target stage = OPENING (checklist still open)', target0 === 'OPENING', { target0 })

  // --- 4. Auto-advance on offer -------------------------------------------
  console.log('\n4) Log an insurer offer → NEGOTIATION')
  await prisma.negotiationEvent.create({
    data: { assessmentId, eventType: 'offer', amount: 25000, status: 'open', counterpartyType: 'insurer' },
  })
  const target1 = await computeTargetCaseStage(assessmentId)
  const advanced = await syncCaseStage(assessmentId, { source: 'system' })
  check('target stage = NEGOTIATION', target1 === 'NEGOTIATION', { target1 })
  check('caseStage advanced to NEGOTIATION', advanced === 'NEGOTIATION', { advanced })

  // --- 5. Monotonic: opening tasks done must NOT regress ------------------
  console.log('\n5) Complete opening tasks → stage never regresses')
  await prisma.caseTask.updateMany({
    where: { assessmentId, milestoneType: 'case_opening' },
    data: { status: 'done', completedAt: new Date() },
  })
  const resolved = await syncCaseStage(assessmentId, { source: 'system' })
  check('caseStage stays NEGOTIATION (no regress to INVESTIGATION)', resolved === 'NEGOTIATION', { resolved })

  // --- 6. Settlement signal advances further ------------------------------
  console.log('\n6) Accept the offer → SETTLEMENT_PENDING')
  await prisma.negotiationEvent.updateMany({
    where: { assessmentId, eventType: 'offer' },
    data: { status: 'accepted' },
  })
  const resolved2 = await syncCaseStage(assessmentId, { source: 'system' })
  check('caseStage advanced to SETTLEMENT_PENDING', resolved2 === 'SETTLEMENT_PENDING', { resolved2 })

  // --- Cleanup ------------------------------------------------------------
  await prisma.negotiationEvent.deleteMany({ where: { assessmentId } })
  await prisma.caseTask.deleteMany({ where: { assessmentId } })
  await prisma.caseChangeEvent.deleteMany({ where: { assessmentId } }).catch(() => {})
  await prisma.leadSubmission.deleteMany({ where: { assessmentId } })
  await prisma.auditLog.deleteMany({ where: { entityId: assessmentId } }).catch(() => {})
  await prisma.assessment.delete({ where: { id: assessmentId } })
  await prisma.attorney.delete({ where: { id: attorney.id } })

  console.log(`\n=== Result: ${pass} passed, ${fail} failed ===\n`)
  if (fail > 0) process.exit(1)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
