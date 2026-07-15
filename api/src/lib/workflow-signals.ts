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
]

const AI_SIGNAL_KEYS = new Set(AI_SIGNALS.map((s) => s.value))

export function isValidAiSignal(key: unknown): key is string {
  return typeof key === 'string' && AI_SIGNAL_KEYS.has(key)
}

export interface SignalContext {
  documentsComplete: boolean
  treatmentComplete: boolean
  demandSent: boolean
  offerReceived: boolean
  settled: boolean
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
    demandSent: false,
    offerReceived: false,
    settled: false,
  }
  if (!assessmentId) return empty

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, status: true, leadSubmission: { select: { id: true } } },
  })
  if (!assessment) return empty

  const leadId = (assessment as any).leadSubmission?.id as string | undefined

  const [pendingDocs, totalDocs, treatmentDone, demandLetters, demandEvents, offerEvents, acceptedEvents] =
    await Promise.all([
      leadId
        ? (prisma as any).documentRequest.count({ where: { leadId, status: { not: 'completed' } } })
        : Promise.resolve(0),
      leadId ? (prisma as any).documentRequest.count({ where: { leadId } }) : Promise.resolve(0),
      (prisma as any).caseTask.count({
        where: { assessmentId, checkpointType: 'medical_checkpoint', status: 'done' },
      }),
      (prisma as any).demandLetter.count({ where: { assessmentId, sentAt: { not: null } } }),
      (prisma as any).negotiationEvent.count({ where: { assessmentId, eventType: 'demand' } }),
      (prisma as any).negotiationEvent.count({ where: { assessmentId, eventType: 'offer' } }),
      (prisma as any).negotiationEvent.count({ where: { assessmentId, status: 'accepted' } }),
    ])

  const status = String((assessment as any).status || '').toLowerCase()

  return {
    documentsComplete: totalDocs > 0 && pendingDocs === 0,
    treatmentComplete: treatmentDone > 0,
    demandSent: demandLetters > 0 || demandEvents > 0,
    offerReceived: offerEvents > 0,
    settled: acceptedEvents > 0 || SETTLED_STATUSES.has(status),
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
    default:
      return false
  }
}
