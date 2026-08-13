/**
 * Collect evidence tasks (medical records, bills): if matching files are already
 * on the case, mark the open Collect tasks done and reconcile Workflow.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

export type EvidenceCollectKind = 'medical_records' | 'bills'

const KIND_CONFIG: Record<
  EvidenceCollectKind,
  {
    categories: string[]
    titleMatchers: RegExp[]
    note: string
    label: string
  }
> = {
  medical_records: {
    categories: ['medical_records', 'medical'],
    titleMatchers: [
      /collect medical records?/i,
      /request medical records?/i,
      /secure medical records?/i,
      /obtain medical records?/i,
      /obtain medic/i,
      /medical records?\s*(&|and)\s*bills/i,
      /all medical records/i,
    ],
    note: 'Completed — medical records on file.',
    label: 'Medical records',
  },
  bills: {
    categories: ['bills', 'medical_bills'],
    titleMatchers: [
      /collect medical bills?/i,
      /request medical bills?/i,
      /secure medical bills?/i,
      /collect (medical )?bills\b/i,
      /obtain medical bills?/i,
      /medical records?\s*(&|and)\s*bills/i,
      /itemized damages/i,
      /damages ledger/i,
    ],
    note: 'Completed — medical bills on file.',
    label: 'Medical bills',
  },
}

function isCombinedRecordsAndBillsTitle(title: string): boolean {
  return /medical records?\s*(&|and)\s*bills/i.test(title) || /all medical records/i.test(title)
}

function titleMatchesKind(title: string, kind: EvidenceCollectKind): boolean {
  const t = String(title || '')
  if (!KIND_CONFIG[kind].titleMatchers.some((re) => re.test(t))) return false
  // Combined titles are only completed when THIS kind's check runs AND the
  // caller confirms both sides are on file (see checkCollectEvidence).
  if (isCombinedRecordsAndBillsTitle(t)) return true
  if (kind === 'medical_records' && /bills/i.test(t) && !/records?/i.test(t)) return false
  if (kind === 'bills' && /records?/i.test(t) && !/bills/i.test(t)) return false
  return true
}

async function evidenceOnFile(assessmentId: string, categories: string[]): Promise<string | null> {
  const file = await prisma.evidenceFile.findFirst({
    where: {
      assessmentId,
      OR: categories.map((category) => ({
        category: { equals: category, mode: 'insensitive' as const },
      })),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return file?.id || null
}

async function completeMatchingTasks(
  assessmentId: string,
  kind: EvidenceCollectKind,
  opts: { bothOnFile: boolean },
): Promise<number> {
  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
  })
  let completed = 0
  for (const task of open) {
    const title = String(task.title || '')
    if (!titleMatchesKind(title, kind)) continue
    if (isCombinedRecordsAndBillsTitle(title) && !opts.bothOnFile) continue

    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: {
        status: 'done',
        completedAt: new Date(),
        notes: `${task.notes || ''}\n${KIND_CONFIG[kind].note}`.trim(),
      },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  if (completed) {
    logger.info('Completed evidence collect tasks', { assessmentId, kind, completed })
  }
  return completed
}

/** Attorney Collect click: complete matching tasks when evidence is already on file. */
export async function checkCollectEvidence(
  leadId: string,
  kind: EvidenceCollectKind,
): Promise<{
  onFile: boolean
  completedTasks: number
  evidenceFileId: string | null
  label: string
}> {
  const cfg = KIND_CONFIG[kind]
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { assessmentId: true },
  })
  if (!lead?.assessmentId) {
    return { onFile: false, completedTasks: 0, evidenceFileId: null, label: cfg.label }
  }

  const evidenceFileId = await evidenceOnFile(lead.assessmentId, cfg.categories)
  const otherKind: EvidenceCollectKind = kind === 'medical_records' ? 'bills' : 'medical_records'
  const otherOnFile = Boolean(
    await evidenceOnFile(lead.assessmentId, KIND_CONFIG[otherKind].categories),
  )
  const bothOnFile = Boolean(evidenceFileId) && otherOnFile

  let completedTasks = 0
  if (evidenceFileId) {
    completedTasks = await completeMatchingTasks(lead.assessmentId, kind, { bothOnFile })
    // Case-data path crosses off Workflow steps that match records/bills.
    const { reconcileWorkflowProgress } = await import('./workflow-reconcile')
    await reconcileWorkflowProgress(lead.assessmentId).catch(() => undefined)
  }

  return {
    onFile: Boolean(evidenceFileId),
    completedTasks,
    evidenceFileId,
    label: cfg.label,
  }
}
