/**
 * Workflow signal helpers for the case-pipeline redesign.
 *
 * Two responsibilities:
 *  1. Apply-time CONDITION evaluation: decide whether a conditional step should
 *     be snapshotted onto a case, based on fields resolved from the Assessment.
 *  2. Read-only AI MILESTONE derivation: compute whether an `ai_milestone` step
 *     is "done" from data already present (documents, negotiation events, tasks,
 *     case status). These are never toggled by users.
 *
 * Live execution of AI actions/automations is intentionally out of scope here.
 */
import { prisma } from './prisma'

// ---------------------------------------------------------------------------
// Conditions (apply-time)
// ---------------------------------------------------------------------------

export type ConditionOp = 'eq' | 'neq' | 'in' | 'notin'

export const CONDITION_FIELDS: { value: string; label: string }[] = [
  { value: 'claimType', label: 'Case type' },
  { value: 'state', label: 'State' },
  { value: 'status', label: 'Case status' },
]

export const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'in', label: 'is one of' },
  { value: 'notin', label: 'is none of' },
]

export interface ConditionContext {
  claimType: string
  state: string
  status: string
}

/** Resolve the small set of case fields conditions can reference. */
export function resolveConditionContext(assessment: any): ConditionContext {
  return {
    claimType: String(assessment?.claimType || '').toLowerCase(),
    state: String(assessment?.venueState || '').toLowerCase(),
    status: String(assessment?.status || '').toLowerCase(),
  }
}

interface StepCondition {
  conditionField?: string | null
  conditionOp?: string | null
  conditionValue?: string | null
}

/**
 * Returns true when the step should be included for this case. Steps without a
 * complete condition (missing field/op/value) are always included.
 */
export function evaluateStepCondition(step: StepCondition, ctx: ConditionContext): boolean {
  const field = (step.conditionField || '').trim()
  const op = (step.conditionOp || '').trim() as ConditionOp
  const rawValue = step.conditionValue

  if (!field || !op || rawValue == null || String(rawValue).trim() === '') return true

  const actual = String((ctx as any)[field] ?? '').toLowerCase()
  const values = String(rawValue)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  if (values.length === 0) return true

  switch (op) {
    case 'eq':
      return actual === values[0]
    case 'neq':
      return actual !== values[0]
    case 'in':
      return values.includes(actual)
    case 'notin':
      return !values.includes(actual)
    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// AI milestones (read-only, derived)
// ---------------------------------------------------------------------------

export const AI_SIGNALS: { value: string; label: string; description: string }[] = [
  { value: 'documents_complete', label: 'Documents complete', description: 'All requested documents received' },
  { value: 'treatment_complete', label: 'Treatment complete', description: 'Medical treatment checkpoint done' },
  { value: 'demand_sent', label: 'Demand sent', description: 'A demand letter or demand event exists' },
  { value: 'offer_received', label: 'Offer received', description: 'An insurer/adjuster offer was logged' },
  { value: 'settled', label: 'Settled', description: 'Case settled / offer accepted' },
  { value: 'settlement_finalized', label: 'Settlement finalized', description: 'Settlement agreement reached; funds pending' },
  { value: 'disbursement_complete', label: 'Disbursed', description: 'Funds disbursed to the client' },
]

const AI_SIGNAL_KEYS = new Set(AI_SIGNALS.map((s) => s.value))

export function isValidAiSignal(key: unknown): key is string {
  return typeof key === 'string' && AI_SIGNAL_KEYS.has(key)
}

export interface SignalContext {
  documentsComplete: boolean
  treatmentComplete: boolean
  /** A demand letter has been drafted (any status). Drives DEMAND_PREPARATION. */
  demandDrafted: boolean
  demandSent: boolean
  offerReceived: boolean
  settled: boolean
  /** Settlement agreement reached (scenario finalized). Drives SETTLEMENT_PENDING. */
  settlementFinalized: boolean
  /** Funds disbursed to the client. Drives DISBURSEMENT. */
  disbursementComplete: boolean
}

const SETTLED_STATUSES = new Set(['settled', 'closed', 'resolved', 'won'])

/**
 * Load the derivation context for a case in a handful of cheap queries. Returns
 * all-false when the assessment can't be resolved.
 */
export async function loadSignalContext(assessmentId: string): Promise<SignalContext> {
  const empty: SignalContext = {
    documentsComplete: false,
    treatmentComplete: false,
    demandDrafted: false,
    demandSent: false,
    offerReceived: false,
    settled: false,
    settlementFinalized: false,
    disbursementComplete: false,
  }
  if (!assessmentId) return empty

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      status: true,
      leadSubmission: { select: { id: true } },
      settlementScenario: { select: { status: true } },
    },
  })
  if (!assessment) return empty

  const leadId = (assessment as any).leadSubmission?.id as string | undefined

  // "Treatment" work = clinical/medical checkpoint tasks (confirm treatment
  // status/complete, MMI/discharge, treatment gap, monitor treatment). Treatment
  // is only "complete" once ALL of these firm-side tasks are done — not just one.
  const treatmentTaskFilter = {
    assessmentId,
    mergedIntoId: null,
    OR: [
      { checkpointType: { in: ['medical_checkpoint', 'treatment_status', 'treatment_gap', 'monitor_treatment'] } },
      { title: { contains: 'treatment', mode: 'insensitive' as const } },
      { title: { contains: 'MMI', mode: 'insensitive' as const } },
      { title: { contains: 'maximum medical', mode: 'insensitive' as const } },
      { title: { contains: 'discharge', mode: 'insensitive' as const } },
    ],
  }
  // Document-request keys that represent medical/treatment records. A pending one
  // means the attorney is still asking for treatment docs → treatment re-opens.
  const MEDICAL_DOC_REQUEST_KEYS = [
    'medical_records',
    'bills',
    'medical_bills',
    'medical',
    'prior_treatment',
    'prior_medical',
    'prior_records',
  ]

  const [
    pendingDocs,
    totalDocs,
    evidenceCount,
    treatmentTasksTotal,
    treatmentTasksOpen,
    pendingMedicalReqRows,
    demandDrafts,
    demandLetters,
    demandEvents,
    offerEvents,
    acceptedEvents,
  ] = await Promise.all([
    leadId
      ? (prisma as any).documentRequest.count({ where: { leadId, status: { not: 'completed' } } })
      : Promise.resolve(0),
    leadId ? (prisma as any).documentRequest.count({ where: { leadId } }) : Promise.resolve(0),
    // Evidence uploaded directly (no formal document request) still counts toward
    // the "documents complete" Auto milestone (CP-581).
    (prisma as any).evidenceFile.count({ where: { assessmentId } }).catch(() => 0),
    (prisma as any).caseTask.count({ where: treatmentTaskFilter }).catch(() => 0),
    (prisma as any).caseTask
      .count({ where: { ...treatmentTaskFilter, status: { in: ['open', 'in_progress'] } } })
      .catch(() => 0),
    leadId
      ? (prisma as any).documentRequest
          .findMany({ where: { leadId, status: { not: 'completed' } }, select: { requestedDocs: true } })
          .catch(() => [])
      : Promise.resolve([]),
    (prisma as any).demandLetter.count({ where: { assessmentId } }),
    (prisma as any).demandLetter.count({ where: { assessmentId, sentAt: { not: null } } }),
    (prisma as any).negotiationEvent.count({ where: { assessmentId, eventType: 'demand' } }),
    (prisma as any).negotiationEvent.count({ where: { assessmentId, eventType: 'offer' } }),
    (prisma as any).negotiationEvent.count({ where: { assessmentId, status: 'accepted' } }),
  ])

  const status = String((assessment as any).status || '').toLowerCase()
  const settlementStatus = String((assessment as any).settlementScenario?.status || '').toLowerCase()

  const pendingMedicalDocRequest = (pendingMedicalReqRows as Array<{ requestedDocs: string | null }>).some(
    (row) => {
      try {
        const keys = JSON.parse(row.requestedDocs || '[]')
        return Array.isArray(keys) && keys.some((k: unknown) => MEDICAL_DOC_REQUEST_KEYS.includes(String(k).toLowerCase()))
      } catch {
        return false
      }
    },
  )

  return {
    // Prefer formal document-request completion; fall back to uploaded evidence
    // when the firm never opened document requests for the case.
    documentsComplete:
      (totalDocs > 0 && pendingDocs === 0) || (totalDocs === 0 && evidenceCount > 0),
    // Complete only when treatment tasks exist, none remain open, and the attorney
    // isn't currently requesting more treatment/medical records. A new medical doc
    // request flips this false → the stage engine pulls the case back to Treatment.
    treatmentComplete: treatmentTasksTotal > 0 && treatmentTasksOpen === 0 && !pendingMedicalDocRequest,
    demandDrafted: demandDrafts > 0,
    demandSent: demandLetters > 0 || demandEvents > 0,
    offerReceived: offerEvents > 0,
    settled: acceptedEvents > 0 || SETTLED_STATUSES.has(status),
    settlementFinalized: settlementStatus === 'finalized' || settlementStatus === 'disbursed',
    disbursementComplete: settlementStatus === 'disbursed',
  }
}

/** Map a signal key to a boolean from the loaded context. */
export function deriveSignal(signal: string | null | undefined, ctx: SignalContext): boolean {
  switch (signal) {
    case 'documents_complete':
      return ctx.documentsComplete
    case 'treatment_complete':
      return ctx.treatmentComplete
    case 'demand_sent':
      return ctx.demandSent
    case 'offer_received':
      return ctx.offerReceived
    case 'settled':
      return ctx.settled
    case 'settlement_finalized':
      return ctx.settlementFinalized
    case 'disbursement_complete':
      return ctx.disbursementComplete
    default:
      return false
  }
}
