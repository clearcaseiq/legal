/**
 * Demand readiness — the one place that decides whether a file may move toward a
 * demand.
 *
 * Four engines used to answer this question independently: the Case Coach
 * (`case-coach.ts`), the command center's next-best-action
 * (`case-command-center.ts`), the readiness automation plan
 * (`readiness-automation.ts`), and the attorney work queue
 * (`attorney-work-queue.ts`). Each had its own threshold and none of them looked
 * at treatment at all, so a file with no records, no specials and a live 255-day
 * treatment gap was told to "move into demand drafting" on the strength of a
 * documentation score alone. A demand goes out to an adjuster and anchors the
 * negotiation permanently, so the cost of sending one early is not symmetrical
 * with the cost of sending one late.
 *
 * The rule this module enforces: treatment must be COMPLETE (discharge or MMI)
 * before a demand is proposed, drafted, or counted as ready. Two consequences
 * worth stating plainly, because both were previously implicit and wrong:
 *
 *  - Silence is not completion. A long stretch with no recorded treatment means
 *    either the client is still treating and we lack the records, or they
 *    stopped and nobody documented why. Both block a demand; neither is MMI.
 *  - Absence of an "ongoing" flag is not completion either. Intake rarely sets a
 *    per-visit status, so treating "nothing said ongoing" as finished would let
 *    almost any case through. Completion has to be affirmative.
 *
 * Everything here is deterministic. No LLM output reaches these decisions.
 */
import type { PrismaClient } from '@prisma/client'

export type TreatmentPosture = 'complete' | 'active' | 'gap' | 'unknown'

/**
 * Days of silence after which treatment continuity is considered broken. Matches
 * the threshold the command center and work queue already used for flagging a
 * gap, so a file cannot be "gap flagged" and "demand ready" at the same time.
 */
export const OPEN_TREATMENT_GAP_DAYS = 45

/** Per-visit statuses that affirmatively mean treatment on that course ended. */
const COMPLETED_TREATMENT_STATUSES = new Set([
  'complete',
  'completed',
  'discharged',
  'released',
  'finished',
  'concluded',
  'mmi',
])

const ONGOING_TREATMENT_STATUSES = new Set(['ongoing', 'active', 'continuing', 'in_progress', 'current'])

export interface TreatmentPostureResult {
  posture: TreatmentPosture
  /** Days since the most recent recorded treatment; null when nothing is on file. */
  daysSinceLastTreatment: number | null
  /** Largest gap between two consecutive recorded visits. */
  largestGapDays: number
  /** How many dated treatment entries were found across facts and chronology. */
  entryCount: number
  /** Plain-language explanation, safe to show an attorney. */
  detail: string
}

export interface TreatmentPostureInput {
  facts?: Record<string, any> | null
  /**
   * True when a person or the workflow has affirmatively marked treatment
   * complete / MMI reached (a done `medical_checkpoint` task or the
   * `treatment_complete` workflow milestone). This is the strongest signal and
   * outranks stale intake answers.
   */
  completionSignal?: boolean
  /** Treatment dates derived from records (medical chronology), if loaded. */
  chronologyDates?: Array<string | Date | null | undefined>
  now?: Date
}

export interface DemandBlocker {
  key: string
  title: string
  detail: string
}

export interface DemandGate {
  ready: boolean
  blockers: DemandBlocker[]
  treatment: TreatmentPostureResult
  /** One line explaining the verdict, suitable for task notes or a tooltip. */
  detail: string
}

export interface DemandGateInput {
  treatment: TreatmentPostureResult
  /** Documented medical specials. A demand with no specials has nothing to anchor. */
  documentedMedicalBills?: number | null
  /** Whether medical records are actually on file (not merely claimed at intake). */
  hasMedicalRecords?: boolean
  /**
   * Structured liability posture (Phase B). A demand should not go out while
   * fault is denied or contested without provable support — the adjuster will
   * simply deny. Sourced from the LiabilityRecord (facts.liabilityRecord).
   */
  liability?: {
    posture?: string | null
    /** Derived liability strength, 0-100. */
    strength?: number | null
  } | null
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true) return true
  const s = String(value ?? '').trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === 'y'
}

/** Every treatment-ish entry we can find on the raw facts blob. */
function collectTreatmentEntries(facts: Record<string, any>): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = []
  for (const key of ['treatment', 'medicalTreatment', 'treatments']) {
    const arr = Array.isArray(facts?.[key]) ? facts[key] : []
    for (const item of arr) {
      if (item && typeof item === 'object') out.push(item as Record<string, any>)
      else if (item) out.push({ type: item })
    }
  }
  return out
}

/** Loose per-case fields that also carry a last-treatment date. */
const LOOSE_TREATMENT_DATE_KEYS = ['lastTreatmentDate', 'treatmentEndDate', 'lastVisit', 'dischargeDate']

function collectTreatmentDates(
  facts: Record<string, any>,
  entries: Array<Record<string, any>>,
  chronologyDates: Array<string | Date | null | undefined>,
): Date[] {
  const dates: Date[] = []
  for (const entry of entries) {
    for (const key of ['endDate', 'lastDate', 'date', 'startDate', 'visitDate', 'treatmentDate']) {
      const d = toDate(entry?.[key])
      if (d) dates.push(d)
    }
  }
  const medical = (facts?.medical && typeof facts.medical === 'object' ? facts.medical : {}) as Record<string, any>
  for (const key of LOOSE_TREATMENT_DATE_KEYS) {
    const d = toDate(medical[key]) || toDate(facts?.[key])
    if (d) dates.push(d)
  }
  for (const value of chronologyDates) {
    const d = toDate(value)
    if (d) dates.push(d)
  }
  return dates.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * Classify where the client is in their medical treatment.
 *
 * Order matters. An explicit human/workflow signal wins outright; then an
 * explicit "still treating" answer; then the shape of the recorded visits.
 */
export function deriveTreatmentPosture(input: TreatmentPostureInput): TreatmentPostureResult {
  const facts = (input.facts && typeof input.facts === 'object' ? input.facts : {}) as Record<string, any>
  const now = input.now ?? new Date()
  const medical = (facts.medical && typeof facts.medical === 'object' ? facts.medical : {}) as Record<string, any>

  const entries = collectTreatmentEntries(facts)
  const dates = collectTreatmentDates(facts, entries, input.chronologyDates ?? [])
  const entryCount = dates.length

  const lastDate = dates.length ? dates[dates.length - 1] : null
  const daysSinceLastTreatment = lastDate
    ? Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000))
    : null

  let largestGapDays = 0
  for (let i = 1; i < dates.length; i += 1) {
    largestGapDays = Math.max(
      largestGapDays,
      Math.floor((dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000),
    )
  }

  const base = { daysSinceLastTreatment, largestGapDays, entryCount }

  if (input.completionSignal) {
    return {
      ...base,
      posture: 'complete',
      detail: 'Treatment is marked complete (discharge / MMI recorded on the file).',
    }
  }

  const statuses = entries.map((e) => normalizeStatus(e?.status ?? e?.treatmentStatus))
  const saysOngoing =
    statuses.some((s) => ONGOING_TREATMENT_STATUSES.has(s)) ||
    isTruthyFlag(medical.stillTreating) ||
    isTruthyFlag(facts.stillTreating) ||
    normalizeStatus(medical.treatmentStatus) === 'ongoing'

  if (saysOngoing) {
    return {
      ...base,
      posture: 'active',
      detail: 'The client is still treating, so the damages picture is not final yet.',
    }
  }

  if (entryCount === 0) {
    return {
      ...base,
      posture: 'unknown',
      detail: 'No treatment is recorded on the file, so there is no basis to say care has finished.',
    }
  }

  // Affirmative completion: an explicit terminal status on every recorded course,
  // or an MMI/discharge flag. Deliberately NOT "no entry said ongoing".
  const factsSayComplete =
    isTruthyFlag(medical.treatmentComplete) ||
    isTruthyFlag(medical.mmi) ||
    Boolean(toDate(medical.mmiDate) || toDate(medical.dischargeDate)) ||
    COMPLETED_TREATMENT_STATUSES.has(normalizeStatus(medical.treatmentStatus)) ||
    (statuses.length > 0 && statuses.every((s) => COMPLETED_TREATMENT_STATUSES.has(s)))

  if (factsSayComplete) {
    return {
      ...base,
      posture: 'complete',
      detail: 'Treatment records show the course of care has ended.',
    }
  }

  if (
    (daysSinceLastTreatment != null && daysSinceLastTreatment >= OPEN_TREATMENT_GAP_DAYS) ||
    largestGapDays >= OPEN_TREATMENT_GAP_DAYS
  ) {
    const gap = daysSinceLastTreatment != null && daysSinceLastTreatment >= OPEN_TREATMENT_GAP_DAYS
      ? daysSinceLastTreatment
      : largestGapDays
    return {
      ...base,
      posture: 'gap',
      detail: `No treatment recorded for ${gap} days and no discharge or MMI note on file. Care may still be ongoing, or it ended without documentation.`,
    }
  }

  return {
    ...base,
    posture: 'active',
    detail: 'Treatment appears to be continuing; no discharge or MMI has been recorded.',
  }
}

const TREATMENT_BLOCKER_TITLE: Record<Exclude<TreatmentPosture, 'complete'>, string> = {
  active: 'Client is still treating',
  gap: 'Treatment status unconfirmed',
  unknown: 'No treatment documented',
}

/**
 * Decide whether the file may move toward a demand. `ready` is false unless
 * every blocker clears — a demand cannot be recalled once it is with a carrier.
 */
export function evaluateDemandGate(input: DemandGateInput): DemandGate {
  const blockers: DemandBlocker[] = []
  const treatment = input.treatment

  if (treatment.posture !== 'complete') {
    blockers.push({
      key: 'treatment_incomplete',
      title: TREATMENT_BLOCKER_TITLE[treatment.posture],
      detail: `${treatment.detail} A demand should not go out before treatment is complete or the client has reached maximum medical improvement, because the special damages are still moving.`,
    })
  }

  if (input.hasMedicalRecords === false) {
    blockers.push({
      key: 'no_medical_records',
      title: 'No medical records on file',
      detail: 'Records are the backbone of the damages section; a demand cannot be substantiated without them.',
    })
  }

  const bills = Number(input.documentedMedicalBills ?? 0)
  if (!Number.isFinite(bills) || bills <= 0) {
    blockers.push({
      key: 'no_documented_specials',
      title: 'No documented medical specials',
      detail: 'There are no documented medical bills to anchor the demand figure.',
    })
  }

  // Liability must be provable. A denied claim — or a disputed one with thin
  // support — will bounce off the adjuster, so resolve the fault picture first.
  if (input.liability) {
    const posture = String(input.liability.posture || 'clear').toLowerCase()
    const strength = Number(input.liability.strength ?? 100)
    const contested = posture === 'denied' || posture === 'disputed'
    if (posture === 'denied' || (contested && strength < 45)) {
      blockers.push({
        key: 'liability_not_established',
        title: 'Liability not yet established',
        detail:
          posture === 'denied'
            ? 'Fault is denied. Lock down the police report, witnesses, and a documented theory of liability before demanding — an adjuster will reject a demand on a denied claim.'
            : 'Fault is disputed and the liability support is thin. Strengthen the record (report, witnesses, photos/video) before the demand goes out.',
      })
    }
  }

  const ready = blockers.length === 0
  return {
    ready,
    blockers,
    treatment,
    detail: ready
      ? 'Treatment is complete and the damages record is documented, so the file can move to demand drafting.'
      : `Not ready for a demand: ${blockers.map((b) => b.title.toLowerCase()).join('; ')}.`,
  }
}

/**
 * Which of these assessments have an affirmative treatment-complete signal.
 *
 * Mirrors `loadSignalContext`'s `treatment_complete` derivation (a done
 * `medical_checkpoint` task) and additionally honours a completed
 * `treatment_complete` workflow milestone, so ticking the "Treatment complete /
 * MMI reached" step in the firm's default PI workflow unblocks the demand.
 * Batched because the work queue evaluates a whole caseload at once.
 */
export async function loadTreatmentCompletionSignals(
  prisma: PrismaClient,
  assessmentIds: string[],
): Promise<Set<string>> {
  const ids = Array.from(new Set(assessmentIds.filter(Boolean)))
  const done = new Set<string>()
  if (ids.length === 0) return done

  const db = prisma as any
  const safe = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return (await run()) ?? fallback
    } catch {
      return fallback
    }
  }

  const [checkpointTasks, workflowItems] = await Promise.all([
    safe<Array<{ assessmentId: string }>>(
      () =>
        db.caseTask.findMany({
          where: { assessmentId: { in: ids }, checkpointType: 'medical_checkpoint', status: 'done' },
          select: { assessmentId: true },
        }),
      [],
    ),
    safe<Array<{ caseWorkflow?: { assessmentId?: string } }>>(
      () =>
        db.caseWorkflowItem.findMany({
          where: {
            caseWorkflow: { assessmentId: { in: ids } },
            aiSignal: 'treatment_complete',
            status: 'done',
          },
          select: { caseWorkflow: { select: { assessmentId: true } } },
        }),
      [],
    ),
  ])

  for (const row of checkpointTasks) {
    if (row?.assessmentId) done.add(row.assessmentId)
  }
  for (const row of workflowItems) {
    const id = row?.caseWorkflow?.assessmentId
    if (id) done.add(id)
  }
  return done
}

/** Single-case convenience wrapper around {@link loadTreatmentCompletionSignals}. */
export async function hasTreatmentCompletionSignal(
  prisma: PrismaClient,
  assessmentId: string,
): Promise<boolean> {
  if (!assessmentId) return false
  const set = await loadTreatmentCompletionSignals(prisma, [assessmentId])
  return set.has(assessmentId)
}
