import crypto from 'crypto'
import { prisma } from './prisma'
import type { MatterImportReport } from './matter-package-import'

export function matterPackageChecksum(
  files: Array<{ originalname: string; buffer: Buffer }>,
): string {
  const hash = crypto.createHash('sha256')
  for (const file of [...files].sort((a, b) => a.originalname.localeCompare(b.originalname))) {
    hash.update(Buffer.from(file.originalname.normalize('NFC')))
    hash.update(Buffer.from([0]))
    hash.update(file.buffer)
    hash.update(Buffer.from([0]))
  }
  return hash.digest('hex')
}

export async function startOrResumeMatterImport(args: {
  ownerKey: string
  attorneyId: string
  source: string
  sourceChecksum: string
  duplicateMode: 'skip' | 'merge'
  externalIds: string[]
}) {
  const db = prisma as any
  let run = await db.matterImportRun.findFirst({
    where: {
      ownerKey: args.ownerKey,
      source: args.source,
      sourceChecksum: args.sourceChecksum,
      duplicateMode: args.duplicateMode,
      status: { in: ['processing', 'partial', 'failed'] },
    },
    include: { matters: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!run) {
    run = await db.matterImportRun.create({
      data: {
        ownerKey: args.ownerKey,
        attorneyId: args.attorneyId,
        source: args.source,
        sourceChecksum: args.sourceChecksum,
        duplicateMode: args.duplicateMode,
        totalMatters: args.externalIds.length,
        matters: {
          create: args.externalIds.map((externalId) => ({ externalId })),
        },
      },
      include: { matters: true },
    })
  } else {
    run = await db.matterImportRun.update({
      where: { id: run.id },
      data: { status: 'processing', error: null },
      include: { matters: true },
    })
  }
  return run
}

export async function checkpointMatterImport(
  runId: string,
  runMatterId: string,
  report: MatterImportReport,
) {
  const db = prisma as any
  await db.$transaction(async (tx: any) => {
    await tx.matterImportMatter.update({
      where: { id: runMatterId },
      data: {
        assessmentId: report.assessmentId,
        status: report.outcome === 'failed' ? 'failed' : 'completed',
        report: report as any,
        error: report.outcome === 'failed' ? report.reason ?? 'Import failed' : null,
        completedAt: report.outcome === 'failed' ? null : new Date(),
      },
    })
    const rows = await tx.matterImportMatter.findMany({
      where: { runId },
      select: { status: true },
    })
    await tx.matterImportRun.update({
      where: { id: runId },
      data: {
        completedMatters: rows.filter((row: any) => row.status === 'completed').length,
        failedMatters: rows.filter((row: any) => row.status === 'failed').length,
      },
    })
  })
}

export async function finishMatterImport(runId: string) {
  const db = prisma as any
  const matters = await db.matterImportMatter.findMany({
    where: { runId },
    select: { status: true, report: true },
  })
  const reports = matters.map((matter: any) => matter.report).filter(Boolean)
  const reconciliation = reports.reduce(
    (totals: any, report: any) => {
      for (const key of ['created', 'unchanged', 'changed', 'missing']) {
        totals[key] += Number(report.reconciliation?.[key] ?? 0)
      }
      return totals
    },
    { created: 0, unchanged: 0, changed: 0, missing: 0 },
  )
  const failed = matters.filter((matter: any) => matter.status === 'failed').length
  const completed = matters.filter((matter: any) => matter.status === 'completed').length
  return db.matterImportRun.update({
    where: { id: runId },
    data: {
      status: failed > 0 ? 'partial' : 'completed',
      completedMatters: completed,
      failedMatters: failed,
      reconciliation,
      completedAt: failed > 0 ? null : new Date(),
    },
  })
}

const TARGET_DELEGATES: Record<string, string> = {
  CaseContact: 'caseContact',
  MedicalTreatmentEntry: 'medicalTreatmentEntry',
  DamageItem: 'damageItem',
  BillingInvoice: 'billingInvoice',
  TimeEntry: 'timeEntry',
  InsuranceDetail: 'insuranceDetail',
  LienHolder: 'lienHolder',
  CaseExpense: 'caseExpense',
  NegotiationEvent: 'negotiationEvent',
  CaseTask: 'caseTask',
  CaseNote: 'caseNote',
}

/**
 * Compensating rollback. New cases are removed through Assessment cascades.
 * Records merged into pre-existing cases are deleted by their recorded target
 * IDs. Post-import hooks are dispatched only after a run completes, so a
 * partial run has no e-sign or outbound-sync side effects to undo.
 */
export async function rollbackMatterImport(runId: string, ownerKey: string) {
  const db = prisma as any
  const run = await db.matterImportRun.findFirst({
    where: { id: runId, ownerKey },
    include: {
      matters: { include: { records: true } },
    },
  })
  if (!run) throw new Error('Import run not found')
  if (run.status === 'rolled_back') return run
  if (run.status === 'rolling_back') throw new Error('Import rollback is already in progress')
  if (run.status === 'completed') {
    throw new Error('A completed import cannot be rolled back after external intake actions have started')
  }

  await db.matterImportRun.update({ where: { id: run.id }, data: { status: 'rolling_back' } })
  try {
    await db.$transaction(async (tx: any) => {
      for (const matter of [...run.matters].reverse()) {
        const report = matter.report as MatterImportReport | null
        if (report?.outcome === 'created' && matter.assessmentId) {
          // Import rollback is an explicit erasure. Prediction history is
          // otherwise protected from cascading Assessment deletion.
          await tx.attorneyCaseReview.deleteMany({ where: { caseId: matter.assessmentId } })
          await tx.prediction.deleteMany({ where: { assessmentId: matter.assessmentId } })
          await tx.assessment.deleteMany({ where: { id: matter.assessmentId } })
        } else {
          const targets = new Map<string, Set<string>>()
          for (const record of matter.records) {
            const delegate = TARGET_DELEGATES[record.targetModel]
            if (!delegate) continue
            const ids = targets.get(delegate) ?? new Set<string>()
            ids.add(record.targetId)
            targets.set(delegate, ids)
          }
          for (const [delegate, ids] of targets) {
            await tx[delegate].deleteMany({ where: { id: { in: [...ids] } } })
          }
        }
        await tx.matterImportRecord.updateMany({
          where: { matterId: matter.id, rolledBackAt: null },
          data: { rolledBackAt: new Date() },
        })
        await tx.matterImportMatter.update({
          where: { id: matter.id },
          data: { status: 'rolled_back' },
        })
      }
      await tx.matterImportRun.update({
        where: { id: run.id },
        data: { status: 'rolled_back', rolledBackAt: new Date() },
      })
    })
    return db.matterImportRun.findUnique({ where: { id: run.id } })
  } catch (error) {
    await db.matterImportRun.update({
      where: { id: run.id },
      data: { status: 'partial', error: error instanceof Error ? error.message : String(error) },
    })
    throw error
  }
}
