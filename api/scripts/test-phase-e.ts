/**
 * Phase E smoke test — litigation sub-track + CLOSED close-out.
 *
 * Asserts:
 *   1. Filing suit sets litigationStatus/litigationFiledAt and materializes the
 *      litigation checklist (milestoneType 'litigation'), idempotently.
 *   2. Closing a case (status='closed' + syncCaseStage force) advances to CLOSED
 *      and materializes the close-out checklist (milestoneType 'closeout').
 *   3. Reopen recomputes the stage and is allowed to regress below CLOSED.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/test-phase-e.ts
 */
import { prisma } from '../src/lib/prisma'
import { computeTargetCaseStage, syncCaseStage, reopenCaseStage } from '../src/lib/case-stage'
import { setLitigationStatus, LITIGATION_MILESTONE } from '../src/lib/litigation'
import { CLOSEOUT_MILESTONE } from '../src/lib/case-closeout'

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
  console.log('\n=== Phase E smoke test (litigation + close-out) ===\n')

  const incident = new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString()
  const assessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      status: 'retained',
      caseStage: 'NEGOTIATION',
      facts: JSON.stringify({ incident: { date: incident } }),
    },
  })
  const assessmentId = assessment.id
  // A live offer so the reopen recompute lands at NEGOTIATION from real signals.
  await prisma.negotiationEvent.create({
    data: { assessmentId, eventType: 'offer', amount: 40000, status: 'open' },
  })

  console.log('1) File suit → litigation checklist')
  const lit = await setLitigationStatus(assessmentId, 'filed', { source: 'attorney', actorName: 'Test Attorney' })
  check('litigationStatus persisted = filed', lit.status === 'filed', lit.status)
  check('litigationFiledAt stamped', !!lit.filedAt, lit.filedAt)
  const litRow = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { litigationStatus: true, litigationFiledAt: true },
  })
  check('assessment.litigationStatus = filed', litRow?.litigationStatus === 'filed', litRow?.litigationStatus)
  const litTasks = await prisma.caseTask.count({ where: { assessmentId, milestoneType: LITIGATION_MILESTONE } })
  check('litigation checklist created', litTasks >= 5, litTasks)

  console.log('\n2) Idempotency — re-setting to a later active status does not duplicate')
  await setLitigationStatus(assessmentId, 'discovery', { source: 'attorney', actorName: 'Test Attorney' })
  const litTasks2 = await prisma.caseTask.count({ where: { assessmentId, milestoneType: LITIGATION_MILESTONE } })
  check('no duplicate litigation tasks', litTasks2 === litTasks, { before: litTasks, after: litTasks2 })
  // Stage must NOT be disturbed by the litigation sub-track.
  const stageAfterLit = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { caseStage: true } })
  check('caseStage unaffected by litigation track', stageAfterLit?.caseStage === 'NEGOTIATION', stageAfterLit?.caseStage)

  console.log('\n3) Close → CLOSED + close-out checklist')
  await prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'closed', closedAt: new Date() } })
  const targetClosed = await computeTargetCaseStage(assessmentId)
  check('target stage is CLOSED', targetClosed === 'CLOSED', targetClosed)
  const afterClose = await syncCaseStage(assessmentId, { source: 'attorney', force: true })
  check('stage advanced to CLOSED', afterClose === 'CLOSED', afterClose)
  const closeoutTasks = await prisma.caseTask.count({ where: { assessmentId, milestoneType: CLOSEOUT_MILESTONE } })
  check('close-out checklist created', closeoutTasks >= 5, closeoutTasks)

  console.log('\n4) Reopen → regresses below CLOSED')
  await prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'retained', closedAt: null } })
  const reopened = await reopenCaseStage(assessmentId, { source: 'attorney' })
  check('reopen recomputed a non-CLOSED stage', reopened !== null && reopened !== 'CLOSED', reopened)
  check('reopen landed at NEGOTIATION (from the live offer signal)', reopened === 'NEGOTIATION', reopened)

  // Cleanup
  await prisma.caseTask.deleteMany({ where: { assessmentId } }).catch(() => {})
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
