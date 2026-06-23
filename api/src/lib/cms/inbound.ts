/**
 * Inbound status sync (Phase 3, scaffold).
 *
 * When a CMS notifies us (via webhook) that a matter's status changed, we map
 * the external matter id back to our assessment (using the outbound sync log)
 * and record the update. Extend `applyInboundMatterStatus` to mutate platform
 * state (e.g. case tracker stage) as product requirements firm up.
 */
import { prisma } from '../prisma'
import { logger } from '../logger'

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

  // Scaffold: surface the CMS status as a case note for visibility. Replace with
  // a richer case-tracker stage mapping when the product defines the mapping.
  await prisma.caseNote.create({
    data: {
      assessmentId,
      message: `CMS status update: ${event.status}`,
      noteType: 'update',
      authorName: 'CMS Integration',
    },
  }).catch((error) => logger.warn('Failed to write inbound status note', { error }))

  return { matched: true, assessmentId }
}
