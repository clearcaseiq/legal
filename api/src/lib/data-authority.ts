/**
 * Data authority — ClearCaseIQ as the system of record.
 *
 * `recordCaseChange` is the single choke point every material case mutation
 * calls after it succeeds. It atomically bumps the case's monotonic `revision`
 * and appends an ordered `CaseChangeEvent` to the canonical change feed that
 * external systems sync FROM. It never throws: losing a feed row must not turn
 * a successful mutation into a 500 (same contract as writeAdminAudit).
 *
 * After recording, it fires a best-effort push (webhook + CMS re-export) so
 * downstream systems learn about the change without polling.
 */
import { prisma } from './prisma'
import { logger } from './logger'

/** Origin of an authoritative write. Provenance for conflict resolution. */
export type CaseWriteSource =
  | 'web'
  | 'mobile'
  | 'rose_ai'
  | 'attorney'
  | 'admin'
  | 'cms_inbound'
  | 'reconcile'
  | 'api'
  | 'system'

export type CaseChangeActor = {
  type?: 'user' | 'attorney' | 'ai' | 'system' | 'external'
  id?: string | null
  label?: string | null
}

export type RecordCaseChangeInput = {
  assessmentId: string
  source: CaseWriteSource
  /** Stable verb, e.g. `status_changed`, `assigned`, `demand_generated`. */
  action: string
  entityType?: string
  entityId?: string | null
  summary?: string | null
  actor?: CaseChangeActor
  /** Skip the outbound push (used when the caller batches many changes). */
  skipPush?: boolean
}

export type RecordedChange = { revision: number; seq: number; lawFirmId: string | null }

/**
 * Bump the case revision and append a change event. Returns the new revision +
 * feed cursor, or null if the case is gone / the write failed (never throws).
 */
export async function recordCaseChange(input: RecordCaseChangeInput): Promise<RecordedChange | null> {
  try {
    const event = await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.update({
        where: { id: input.assessmentId },
        data: { revision: { increment: 1 }, lastWriteSource: input.source },
        select: { revision: true, lawFirmId: true },
      })
      const created = await tx.caseChangeEvent.create({
        data: {
          assessmentId: input.assessmentId,
          lawFirmId: assessment.lawFirmId,
          revision: assessment.revision,
          source: input.source,
          actorType: input.actor?.type ?? null,
          actorId: input.actor?.id ?? null,
          actorLabel: input.actor?.label ?? null,
          action: input.action,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          summary: input.summary ?? null,
        },
        select: { seq: true },
      })
      return {
        revision: assessment.revision,
        seq: created.seq,
        lawFirmId: assessment.lawFirmId,
      }
    })

    if (!input.skipPush) {
      // Fire-and-forget: downstream delivery must never block the mutation.
      void emitCaseChange(input.assessmentId, event.revision, event.seq).catch((error) =>
        logger.warn('Case change push failed', {
          assessmentId: input.assessmentId,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return event
  } catch (error) {
    logger.error('Failed to record case change', {
      assessmentId: input.assessmentId,
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Lazy import of the push module keeps the mutation hot path free of the CMS
 * dependency graph and avoids an import cycle (push imports the export service,
 * which may import helpers that record changes).
 */
async function emitCaseChange(assessmentId: string, revision: number, seq: number): Promise<void> {
  const { pushCaseChange } = await import('./data-authority-push')
  await pushCaseChange({ assessmentId, revision, seq })
}
