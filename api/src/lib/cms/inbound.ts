/**
 * Inbound status sync (reconciliation).
 *
 * When a CMS notifies us (via webhook) that a matter's status changed, we map
 * the external matter id back to our assessment (using the outbound sync log).
 * ClearCaseIQ is the source of truth, so the external status is NOT applied
 * directly — it is filed as an ExternalWriteProposal a firm user reviews and
 * approves ("ours wins" with a human in the loop).
 */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { createExternalWriteProposal } from '../case-reconciliation'

export interface InboundMatterStatusEvent {
  connectionId: string
  externalMatterId: string
  status: string
  raw?: unknown
}

/** Resolve which assessment an external matter id corresponds to. */
export async function resolveAssessmentForMatter(
  connectionId: string,
  externalMatterId: string
): Promise<string | null> {
  const link = await prisma.cmsSyncLog.findFirst({
    where: {
      connectionId,
      operation: 'create_matter',
      externalType: 'matter',
      externalId: externalMatterId,
      status: 'success',
    },
    orderBy: { createdAt: 'desc' },
    select: { assessmentId: true },
  })
  return link?.assessmentId ?? null
}

export async function applyInboundMatterStatus(event: InboundMatterStatusEvent): Promise<{
  matched: boolean
  assessmentId: string | null
}> {
  const assessmentId = await resolveAssessmentForMatter(event.connectionId, event.externalMatterId)

  await prisma.cmsSyncLog.create({
    data: {
      connectionId: event.connectionId,
      assessmentId,
      direction: 'inbound',
      operation: 'status_update',
      status: assessmentId ? 'success' : 'skipped',
      externalType: 'matter',
      externalId: event.externalMatterId,
      message: `status=${event.status}`,
    },
  })

  if (!assessmentId) {
    logger.warn('Inbound CMS status had no matching assessment', { event })
    return { matched: false, assessmentId: null }
  }

  // "Ours wins": file the external status as a proposal for human review rather
  // than overwriting the canonical case. Approval (in the reconciliation inbox)
  // is the only path that mutates the record.
  const connection = await prisma.cmsConnection.findUnique({
    where: { id: event.connectionId },
    select: { provider: true },
  })
  await createExternalWriteProposal({
    assessmentId,
    field: 'status',
    proposedValue: event.status,
    source: 'cms_inbound',
    connectionId: event.connectionId,
    provider: connection?.provider ?? null,
  }).catch((error) => logger.warn('Failed to file inbound status proposal', { error }))

  return { matched: true, assessmentId }
}
