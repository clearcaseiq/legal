import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { parseCaseFacts } from './case-facts'

/**
 * Extra supporting documents the client or the attorney thinks belong on the
 * case, beyond the fixed Supporting Documents checklist. Stored on the case
 * facts; uploads answering one carry the subcategory `suggested:<id>`.
 */
export type SuggestedBy = 'plaintiff' | 'attorney'

export type SuggestedDocument = {
  id: string
  label: string
  note: string | null
  suggestedBy: SuggestedBy
  suggestedByName: string | null
  createdAt: string
}

export type SuggestedDocumentView = SuggestedDocument & { subcategory: string; fileCount: number }

export const SUGGESTED_DOC_CATEGORY = 'other'

export function suggestedSubcategory(id: string): string {
  return `suggested:${id}`
}

function readList(facts: any): SuggestedDocument[] {
  const list = facts?.suggestedDocuments
  return Array.isArray(list) ? list.filter((d: any) => d && typeof d.id === 'string' && typeof d.label === 'string') : []
}

async function loadFacts(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  return assessment ? (parseCaseFacts(assessment.facts) as any) : null
}

async function saveList(assessmentId: string, facts: any, list: SuggestedDocument[]) {
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { facts: JSON.stringify({ ...facts, suggestedDocuments: list }) },
  })
}

export async function listSuggestedDocuments(assessmentId: string): Promise<SuggestedDocumentView[]> {
  const facts = await loadFacts(assessmentId)
  const list = readList(facts)
  if (!list.length) return []
  const counts = await prisma.evidenceFile.groupBy({
    by: ['subcategory'],
    where: { assessmentId, subcategory: { in: list.map((d) => suggestedSubcategory(d.id)) } },
    _count: { _all: true },
  })
  const bySub = new Map(counts.map((row) => [row.subcategory, row._count._all]))
  return list.map((d) => ({
    ...d,
    subcategory: suggestedSubcategory(d.id),
    fileCount: bySub.get(suggestedSubcategory(d.id)) || 0,
  }))
}

export async function addSuggestedDocument(
  assessmentId: string,
  input: { label: string; note?: string | null; suggestedBy: SuggestedBy; suggestedByName?: string | null },
): Promise<SuggestedDocument | null> {
  const facts = await loadFacts(assessmentId)
  if (!facts) return null
  const label = input.label.trim().slice(0, 120)
  if (!label) return null
  const list = readList(facts)
  const existing = list.find((d) => d.label.toLowerCase() === label.toLowerCase())
  if (existing) return existing
  const doc: SuggestedDocument = {
    id: crypto.randomUUID().slice(0, 12),
    label,
    note: input.note?.trim().slice(0, 500) || null,
    suggestedBy: input.suggestedBy,
    suggestedByName: input.suggestedByName?.trim() || null,
    createdAt: new Date().toISOString(),
  }
  await saveList(assessmentId, facts, [...list, doc])
  return doc
}

/**
 * Remove a suggestion. Each side may only remove its own, and never one that
 * already has files, so a document the other side uploaded can't vanish.
 */
export async function removeSuggestedDocument(
  assessmentId: string,
  id: string,
  by: SuggestedBy,
): Promise<'removed' | 'not_found' | 'forbidden' | 'has_files'> {
  const facts = await loadFacts(assessmentId)
  const list = readList(facts)
  const doc = list.find((d) => d.id === id)
  if (!facts || !doc) return 'not_found'
  if (doc.suggestedBy !== by) return 'forbidden'
  const files = await prisma.evidenceFile.count({ where: { assessmentId, subcategory: suggestedSubcategory(id) } })
  if (files > 0) return 'has_files'
  await saveList(assessmentId, facts, list.filter((d) => d.id !== id))
  return 'removed'
}

/** Tell the other side a document was suggested. Best effort. */
export async function notifySuggestedDocument(assessmentId: string, doc: SuggestedDocument): Promise<void> {
  try {
    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId },
      select: { id: true, assignedAttorneyId: true, assessment: { select: { userId: true } } },
    })
    if (!lead) return
    const notifications = await import('./case-notifications')
    if (doc.suggestedBy === 'plaintiff' && lead.assignedAttorneyId) {
      await notifications.notifyAttorneyInApp({
        attorneyId: lead.assignedAttorneyId,
        assessmentId,
        leadId: lead.id,
        eventType: 'suggested_document',
        subject: 'Client suggested a supporting document',
        body: doc.note ? `${doc.label} — ${doc.note}` : doc.label,
        link: `/attorney-dashboard/cases/${lead.id}/documents?view=requests`,
      })
    } else if (doc.suggestedBy === 'attorney' && lead.assessment?.userId) {
      await notifications.notifyPlaintiffInApp({
        userId: lead.assessment.userId,
        assessmentId,
        eventType: 'suggested_document',
        subject: 'Your attorney suggested a document to upload',
        body: doc.note ? `${doc.label} — ${doc.note}` : doc.label,
        link: `/evidence-upload/${assessmentId}?from=dashboard`,
      })
    }
    const { emitCaseUpdatedForLead, emitTasksUpdated } = await import('./realtime')
    void emitCaseUpdatedForLead(lead.id, 'suggested_document')
    void emitTasksUpdated(assessmentId)
  } catch (error: any) {
    logger.warn('Failed to notify about suggested document', { assessmentId, error: error?.message })
  }
}
