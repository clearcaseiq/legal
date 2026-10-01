/**
 * Negotiation entries the firm shares with the plaintiff for an accept/decline
 * decision, plus the proof files (carrier letters, emails) backing each entry.
 *
 * Proof files are EvidenceFile rows on the same case. The `/uploads/evidence/`
 * mount already authorizes reads per case, so the plaintiff can open them by
 * `fileUrl` without a separate download route.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { notifyAttorneyInApp, notifyPlaintiffInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'

export const CLIENT_DECISIONS = ['accepted', 'declined'] as const
export type ClientDecision = (typeof CLIENT_DECISIONS)[number]

export type NegotiationProofFile = {
  id: string
  originalName: string
  fileUrl: string | null
  mimetype: string | null
}

export function parseProofFileIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

/** Keeps only ids that are evidence files on this case, so an entry cannot point at another case's documents. */
export async function sanitizeProofFileIds(assessmentId: string, raw: unknown): Promise<string[]> {
  const ids = [...new Set(parseProofFileIds(raw))].slice(0, 20)
  if (!ids.length) return []
  const found = await prisma.evidenceFile.findMany({
    where: { id: { in: ids }, assessmentId },
    select: { id: true },
  })
  const ok = new Set(found.map((f) => f.id))
  return ids.filter((id) => ok.has(id))
}

export async function loadProofFiles(records: Array<{ proofFileIds?: string | null }>) {
  const ids = [...new Set(records.flatMap((r) => parseProofFileIds(r.proofFileIds)))]
  const byId = new Map<string, NegotiationProofFile>()
  if (!ids.length) return byId
  const files = await prisma.evidenceFile.findMany({
    where: { id: { in: ids } },
    select: { id: true, originalName: true, fileUrl: true, mimetype: true },
  })
  for (const f of files) byId.set(f.id, f)
  return byId
}

export function withProofFiles<T extends { proofFileIds?: string | null }>(
  record: T,
  byId: Map<string, NegotiationProofFile>,
): Omit<T, 'proofFileIds'> & { proofFileIds: string[]; proofFiles: NegotiationProofFile[] } {
  const ids = parseProofFileIds(record.proofFileIds)
  return {
    ...record,
    proofFileIds: ids,
    proofFiles: ids.map((id) => byId.get(id)).filter((f): f is NegotiationProofFile => Boolean(f)),
  }
}

const EVENT_LABEL: Record<string, string> = {
  offer: 'settlement offer',
  counter: 'counteroffer',
  demand: 'demand',
}

function moneyLabel(amount: number | null | undefined) {
  return typeof amount === 'number' && amount > 0
    ? `$${Math.round(amount).toLocaleString('en-US')}`
    : null
}

/** Tells the attorney handling the case that the client answered. */
export async function notifyAttorneyOfClientDecision(input: {
  assessmentId: string
  eventId: string
  eventType: string
  amount: number | null
  decision: ClientDecision
  note: string | null
}) {
  try {
    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId: input.assessmentId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead?.assignedAttorneyId) return false
    const what = EVENT_LABEL[input.eventType] || 'negotiation entry'
    const amount = moneyLabel(input.amount)
    const verb = input.decision === 'accepted' ? 'accepted' : 'declined'
    return notifyAttorneyInApp({
      attorneyId: lead.assignedAttorneyId,
      assessmentId: input.assessmentId,
      eventType: ATTORNEY_EVENTS.negotiation_decision,
      subject: `Client ${verb} the ${what}`,
      body: [amount ? `${amount} ${what} ${verb}.` : `The ${what} was ${verb}.`, input.note ? `Note: ${input.note}` : null]
        .filter(Boolean)
        .join(' '),
      leadId: lead.id,
      link: `/attorney-dashboard/cases/${lead.id}/negotiation`,
      payload: { negotiationEventId: input.eventId, decision: input.decision },
    })
  } catch (err) {
    logger.warn('notifyAttorneyOfClientDecision failed', {
      assessmentId: input.assessmentId,
      error: (err as Error).message,
    })
    return false
  }
}

export async function notifyPlaintiffOfNegotiationDecision(input: {
  assessmentId: string
  eventId: string
  eventType: string
  amount: number | null
  attorneyId?: string | null
}) {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: input.assessmentId },
      select: { userId: true },
    })
    if (!assessment?.userId) return false
    const what = EVENT_LABEL[input.eventType] || 'negotiation update'
    const amount = moneyLabel(input.amount)
    return notifyPlaintiffInApp({
      userId: assessment.userId,
      attorneyId: input.attorneyId ?? null,
      assessmentId: input.assessmentId,
      eventType: 'plaintiff.negotiation_decision_requested',
      subject: 'Your attorney needs your decision',
      body: amount
        ? `Review the ${amount} ${what} on your case and accept or decline it.`
        : `Review the ${what} on your case and accept or decline it.`,
      link: '/dashboard',
      payload: { negotiationEventId: input.eventId },
    })
  } catch (err) {
    logger.warn('notifyPlaintiffOfNegotiationDecision failed', {
      assessmentId: input.assessmentId,
      error: (err as Error).message,
    })
    return false
  }
}
