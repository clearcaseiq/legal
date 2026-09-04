/**
 * Case lifecycle stage engine — the post-retention "Case" spine.
 *
 * The Assessment IS the case-of-record; `Assessment.caseStage` tracks where the
 * matter sits in the ClearCaseIQ case lifecycle once it is retained. Stage is
 * DERIVED from signals already present on the case (treatment complete, demand
 * sent, offer received, settled) and advances MONOTONICALLY — it never moves
 * backwards, because a case that has sent a demand shouldn't drop back to
 * "treatment" just because a new document arrives.
 *
 * This is intentionally deterministic and cheap: it reuses `loadSignalContext`
 * (documents / treatment / demand / offer / settled) plus a couple of counts, so
 * it is safe to call fire-and-forget on every "new info" event.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'
import { isCaseRetained } from './case-coach-loop'
import { loadSignalContext } from './workflow-signals'

export const CASE_STAGES = [
  'OPENING',
  'INVESTIGATION',
  'TREATMENT',
  'RECORD_COLLECTION',
  'DEMAND_PREPARATION',
  'DEMAND_SENT',
  'NEGOTIATION',
  'SETTLEMENT_PENDING',
  'DISBURSEMENT',
  'CLOSED',
] as const

export type CaseStage = (typeof CASE_STAGES)[number]

const STAGE_ORDER: Record<CaseStage, number> = CASE_STAGES.reduce(
  (acc, stage, idx) => {
    acc[stage] = idx
    return acc
  },
  {} as Record<CaseStage, number>,
)

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  OPENING: 'Case opening',
  INVESTIGATION: 'Investigation',
  TREATMENT: 'Medical treatment',
  RECORD_COLLECTION: 'Records & bills',
  DEMAND_PREPARATION: 'Demand preparation',
  DEMAND_SENT: 'Demand sent',
  NEGOTIATION: 'Negotiation',
  SETTLEMENT_PENDING: 'Settlement pending',
  DISBURSEMENT: 'Disbursement',
  CLOSED: 'Closed',
}

function isCaseStage(value: unknown): value is CaseStage {
  return typeof value === 'string' && (CASE_STAGES as readonly string[]).includes(value)
}

/**
 * Assessment statuses that mean the matter is over.
 *
 * `close` writes `'closed'`, but cases also reach the end by being won, settled
 * or otherwise resolved, and those are set elsewhere. Exported so callers that
 * need to *select* finished cases — the admin closed-cases list, for one — ask
 * the same question this module does rather than growing a fourth private copy
 * of the list (see also `workflow-signals` and `marketplace-performance`).
 */
export const CLOSED_STATUSES = new Set(['closed', 'won', 'resolved', 'settled'])

/**
 * Stages that cannot be reached without an active representation. Mirrors
 * `STAGES_PROVING_REPRESENTATION` in the web app's `caseStatus.ts`, which uses
 * them to unfreeze the plaintiff pipeline when the retained flag is lagging.
 */
const STAGES_PROVING_REPRESENTATION = new Set<CaseStage>([
  'DEMAND_PREPARATION',
  'DEMAND_SENT',
  'NEGOTIATION',
  'SETTLEMENT_PENDING',
  'DISBURSEMENT',
])

/** Does the case have any documented treatment activity yet? */
function hasTreatmentActivity(facts: any): boolean {
  const treatment = facts?.treatment
  if (Array.isArray(treatment) && treatment.length > 0) return true
  const medical = facts?.medical
  if (medical && typeof medical === 'object' && Object.keys(medical).length > 0) return true
  const providers = facts?.providers
  if (Array.isArray(providers) && providers.length > 0) return true
  return false
}

/**
 * Compute the stage a case SHOULD be in from its current signals, independent of
 * what is persisted. Floor is OPENING for any retained case.
 */
export async function computeTargetCaseStage(assessmentId: string): Promise<CaseStage> {
  const [ctx, assessment, openingTotal, openingOpen] = await Promise.all([
    loadSignalContext(assessmentId),
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true, facts: true },
    }),
    prisma.caseTask.count({ where: { assessmentId, milestoneType: 'case_opening' } }),
    prisma.caseTask.count({ where: { assessmentId, milestoneType: 'case_opening', status: { not: 'done' } } }),
  ])

  const status = String(assessment?.status || '').toLowerCase()
  if (CLOSED_STATUSES.has(status)) return 'CLOSED'

  // Resolution signals take priority (highest stage wins).
  if (ctx.disbursementComplete) return 'DISBURSEMENT'
  if (ctx.settled || ctx.settlementFinalized) return 'SETTLEMENT_PENDING'
  if (ctx.offerReceived) return 'NEGOTIATION'
  if (ctx.demandSent) return 'DEMAND_SENT'

  // A demand has been drafted (but not yet sent) → we are actively preparing the
  // demand package, regardless of whether every ancillary document is in.
  if (ctx.demandDrafted) return 'DEMAND_PREPARATION'

  // Treatment complete → we're collecting records / prepping the demand.
  if (ctx.treatmentComplete) {
    return ctx.documentsComplete ? 'DEMAND_PREPARATION' : 'RECORD_COLLECTION'
  }

  let facts: any = {}
  try {
    facts = assessment?.facts ? JSON.parse(assessment.facts) : {}
  } catch {
    facts = {}
  }
  if (hasTreatmentActivity(facts)) return 'TREATMENT'

  // Opening checklist finished (all Day-1 tasks done) → move to investigation.
  if (openingTotal > 0 && openingOpen === 0) return 'INVESTIGATION'

  return 'OPENING'
}

/**
 * Advance a retained case's persisted stage to match its signals. Monotonic:
 * never regresses. No-ops for non-retained (intake-only) cases. Records a
 * change-feed event when the stage actually moves. Never throws.
 */
export async function syncCaseStage(
  assessmentId: string,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; force?: boolean },
): Promise<CaseStage | null> {
  try {
    if (!opts?.force && !(await isCaseRetained(assessmentId))) return null

    const current = await prisma.assessment
      .findUnique({ where: { id: assessmentId }, select: { caseStage: true } })
      .then((a) => (isCaseStage(a?.caseStage) ? (a!.caseStage as CaseStage) : null))
      .catch(() => null)

    const target = await computeTargetCaseStage(assessmentId)

    // Monotonic by default: keep the higher of current vs target so the stage
    // never regresses — EXCEPT for one deliberate exception. When a case is still
    // preparing its demand (DEMAND_PREPARATION) and treatment re-opens (the
    // attorney asked for more treatment records, or a treatment task was
    // re-opened), computeTargetCaseStage returns TREATMENT. In that case we pull
    // the case back to Treatment so the plaintiff pipeline reflects reality.
    // This never fires once a demand is drafted/sent (target would be
    // DEMAND_PREPARATION / DEMAND_SENT or higher), so a case that has demanded is
    // never dragged backward.
    const isTreatmentReopen = current === 'DEMAND_PREPARATION' && target === 'TREATMENT'
    const resolved: CaseStage =
      current && STAGE_ORDER[current] >= STAGE_ORDER[target] && !isTreatmentReopen
        ? current
        : target

    if (resolved === current) return current

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { caseStage: resolved, caseStageAt: new Date() },
    })

    void recordCaseChange({
      assessmentId,
      source: opts?.source ?? 'system',
      action: 'stage_changed',
      entityType: 'case',
      summary: `Case stage → ${CASE_STAGE_LABELS[resolved]}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })

    // Entering a stage materializes its checklist so the team doesn't have to
    // remember it. Idempotent (dedupes by title), so re-entry is a no-op.
    const enteredFrom = STAGE_ORDER[(current ?? 'OPENING') as CaseStage]
    if (resolved === 'DEMAND_PREPARATION' && enteredFrom < STAGE_ORDER.DEMAND_PREPARATION) {
      try {
        const { createDemandPrepTasks } = await import('./demand-prep')
        await createDemandPrepTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
      } catch (e: any) {
        logger.warn('createDemandPrepTasks failed', { assessmentId, error: e?.message })
      }
    }
    if (resolved === 'SETTLEMENT_PENDING' && enteredFrom < STAGE_ORDER.SETTLEMENT_PENDING) {
      try {
        const { createSettlementTasks } = await import('./settlement-prep')
        await createSettlementTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
      } catch (e: any) {
        logger.warn('createSettlementTasks failed', { assessmentId, error: e?.message })
      }
    }
    if (resolved === 'DISBURSEMENT' && enteredFrom < STAGE_ORDER.DISBURSEMENT) {
      try {
        const { createDisbursementTasks } = await import('./settlement-prep')
        await createDisbursementTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
      } catch (e: any) {
        logger.warn('createDisbursementTasks failed', { assessmentId, error: e?.message })
      }
    }
    if (resolved === 'CLOSED' && enteredFrom < STAGE_ORDER.CLOSED) {
      try {
        const { createCloseoutTasks } = await import('./case-closeout')
        await createCloseoutTasks(assessmentId, { createdByName: 'ClearCaseIQ' })
      } catch (e: any) {
        logger.warn('createCloseoutTasks failed', { assessmentId, error: e?.message })
      }
    }

    // A firm does not send a demand or negotiate a settlement on a case it was
    // never retained for, so reaching one of these stages with the lead still
    // un-retained means the retainer never completed — usually a signature
    // request that was sent and left hanging. The plaintiff pipeline now infers
    // representation from the stage so the client is not left staring at
    // "Consultation", but the lead record is still wrong and conversion
    // reporting still counts it as unretained, so say so loudly.
    if (STAGES_PROVING_REPRESENTATION.has(resolved)) {
      const lead = await prisma.leadSubmission
        .findFirst({ where: { assessmentId }, select: { id: true, status: true, lifecycleState: true } })
        .catch(() => null)
      const retained =
        lead?.status === 'retained' || lead?.lifecycleState === 'engaged' || lead?.lifecycleState === 'retained'
      if (lead && !retained) {
        logger.warn('Case reached a post-retention stage but the lead is not marked retained', {
          assessmentId,
          leadId: lead.id,
          stage: resolved,
          leadStatus: lead.status,
          lifecycleState: lead.lifecycleState,
        })
      }
    }

    logger.info('Case stage advanced', { assessmentId, from: current, to: resolved })
    return resolved
  } catch (error: any) {
    logger.warn('syncCaseStage failed', { assessmentId, error: error?.message })
    return null
  }
}

/**
 * Reopen a closed case: recompute the stage from current signals and set it
 * UNCONDITIONALLY (this is the one path allowed to regress, since a reopened
 * matter should drop back from CLOSED to wherever its signals actually put it).
 * The caller is responsible for clearing the closing status first.
 */
export async function reopenCaseStage(
  assessmentId: string,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system' },
): Promise<CaseStage | null> {
  try {
    const target = await computeTargetCaseStage(assessmentId)
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { caseStage: target, caseStageAt: new Date() },
    })
    void recordCaseChange({
      assessmentId,
      source: opts?.source ?? 'attorney',
      action: 'case_reopened',
      entityType: 'case',
      summary: `Case reopened → ${CASE_STAGE_LABELS[target]}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
    logger.info('Case reopened', { assessmentId, to: target })
    return target
  } catch (error: any) {
    logger.warn('reopenCaseStage failed', { assessmentId, error: error?.message })
    return null
  }
}

/**
 * Stamp OPENING on a freshly-retained case. Idempotent — leaves an already-set
 * stage untouched so we never regress a case that is further along.
 */
export async function openCaseStage(
  assessmentId: string,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system' },
): Promise<CaseStage | null> {
  return syncCaseStage(assessmentId, { source: opts?.source ?? 'attorney', force: true })
}
