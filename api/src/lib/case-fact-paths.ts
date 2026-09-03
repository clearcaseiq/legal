/**
 * The allowlist of `facts` paths a proposal may target, and typed access to them.
 *
 * `RECONCILABLE_FIELDS` in `case-reconciliation.ts` does this for the three
 * scalar `Assessment` columns an external system may propose changes to. This is
 * the same idea for fields inside the facts document, which is where almost
 * everything a specialist would capture on a call actually lives.
 *
 * It is an allowlist for the same reason the other one is: without it, "propose
 * a change to a field" means "write anything anywhere in the case document",
 * and a specialist could set `consents.hipaa` or overwrite the plaintiff's own
 * medical review as easily as a phone number.
 *
 * Proposals store values as strings, because `ExternalWriteProposal` holds
 * `currentValue`/`proposedValue` as nullable text and has to render them side by
 * side for a human. Each spec therefore carries the type needed to put the value
 * back into the document as the shape the rest of the code expects — writing
 * `"1200"` where every reader does arithmetic on `damages.wage_loss` would be a
 * quiet corruption.
 */
import type { CaseFacts } from './case-facts'

export type FactValueType = 'string' | 'number' | 'boolean'

export type FactPathSpec = {
  /** Shown to the specialist proposing and to the claimant confirming. */
  label: string
  type: FactValueType
  /**
   * Additional paths that must receive the same value.
   *
   * Several facts keys exist twice under different names — `insurance.carrier`
   * alongside `insurance.defendant_carrier`, `claim_number` alongside
   * `claimNumber` — and `question-facts-sync.ts` writes both because different
   * readers look at different ones. Writing only the canonical key would leave
   * the document internally inconsistent and show the old value wherever the
   * duplicate is read.
   */
  mirrors?: string[]
  /** Longest accepted string, mirroring the intake validators. */
  maxLength?: number
}

/**
 * Paths a specialist may propose a value for.
 *
 * Deliberately narrow: facts a claimant can state plainly on a phone call and
 * confirm afterwards. Anything derived (`damagesLedger`, `med_charges_source`),
 * anything consent-bearing (`consents.*`) and anything the claimant authored as
 * a review of our own output (`plaintiffMedicalReview`) is absent on purpose.
 */
export const PROPOSABLE_FACT_PATHS: Record<string, FactPathSpec> = {
  'incident.date': { label: 'Date of incident', type: 'string', maxLength: 40 },
  'incident.location': { label: 'Where it happened', type: 'string', maxLength: 300 },
  'incident.narrative': { label: 'What happened', type: 'string', maxLength: 5000 },

  'damages.med_charges': { label: 'Medical charges billed', type: 'number' },
  'damages.med_paid': { label: 'Medical charges already paid', type: 'number' },
  'damages.wage_loss': { label: 'Lost wages', type: 'number' },
  'damages.future_medical': { label: 'Expected future medical costs', type: 'number' },
  'damages.estimated_property_damage': { label: 'Property damage', type: 'number' },
  'damages.bills_complete': { label: 'All medical bills accounted for', type: 'boolean' },

  'insurance.claim_number': { label: 'Claim number', type: 'string', maxLength: 120, mirrors: ['insurance.claimNumber'] },
  'insurance.defendant_carrier': {
    label: "Other party's insurer",
    type: 'string',
    maxLength: 160,
    mirrors: ['insurance.carrier'],
  },
  'insurance.defendant_coverage_limits': {
    label: 'Policy limit',
    type: 'string',
    maxLength: 80,
    mirrors: ['insurance.policy_limit'],
  },
  'insurance.adjuster_contacted': { label: 'Adjuster has made contact', type: 'boolean' },
  'insurance.recorded_statement': { label: 'Gave a recorded statement', type: 'boolean' },

  'caseAcceleration.wageLoss.employerName': { label: 'Employer', type: 'string', maxLength: 160 },
  'caseAcceleration.wageLoss.positionTitle': { label: 'Job title', type: 'string', maxLength: 160 },
  'caseAcceleration.wageLoss.datesMissed': { label: 'Work missed', type: 'string', maxLength: 200 },
}

export function isProposableFactPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(PROPOSABLE_FACT_PATHS, path)
}

export function factPathLabel(path: string): string {
  return PROPOSABLE_FACT_PATHS[path]?.label ?? path
}

function readRaw(facts: CaseFacts, path: string): unknown {
  let cursor: any = facts
  for (const key of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = cursor[key]
  }
  return cursor
}

/** Returns undefined only when the object is absent along the way. */
function writeRaw(facts: CaseFacts, path: string, value: unknown): CaseFacts {
  const [head, ...rest] = path.split('.')
  // Rebuilt rather than mutated so the mutator stays a pure function of what it
  // was handed, which is what makes replaying it after a lost race safe.
  if (rest.length === 0) return { ...facts, [head]: value }

  const child = facts[head]
  const branch = child && typeof child === 'object' && !Array.isArray(child) ? (child as CaseFacts) : {}
  return { ...facts, [head]: writeRaw(branch, rest.join('.'), value) }
}

/**
 * The stored value as a string, or null when the field is unset.
 *
 * Null means "nothing there" for display and comparison. A boolean `false` is
 * something there, so it renders as `"false"` rather than collapsing to null.
 */
export function readFactPath(facts: CaseFacts, path: string): string | null {
  const value = readRaw(facts, path)
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Objects and arrays are not proposable, but a document in the wild may hold
  // one where a scalar is expected; showing JSON beats showing "[object Object]".
  return JSON.stringify(value)
}

export type FactValueParse =
  | { ok: true; value: string | number | boolean | null }
  | { ok: false; reason: string }

/** Turn a proposal's stored string back into the type the document expects. */
export function parseFactValue(path: string, raw: string | null): FactValueParse {
  const spec = PROPOSABLE_FACT_PATHS[path]
  if (!spec) return { ok: false, reason: 'unsupported_field' }

  // Clearing a field is a legitimate correction: "no, I never missed work".
  if (raw === null || raw.trim() === '') return { ok: true, value: null }
  const trimmed = raw.trim()

  if (spec.type === 'number') {
    const parsed = Number(trimmed.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(parsed)) return { ok: false, reason: 'not_a_number' }
    if (parsed < 0) return { ok: false, reason: 'negative' }
    return { ok: true, value: parsed }
  }

  if (spec.type === 'boolean') {
    const lowered = trimmed.toLowerCase()
    if (['true', 'yes', '1'].includes(lowered)) return { ok: true, value: true }
    if (['false', 'no', '0'].includes(lowered)) return { ok: true, value: false }
    return { ok: false, reason: 'not_a_boolean' }
  }

  if (spec.maxLength && trimmed.length > spec.maxLength) return { ok: false, reason: 'too_long' }
  return { ok: true, value: trimmed }
}

/**
 * Apply a parsed value at its path and at any mirror of it.
 *
 * Null clears the key rather than storing an explicit null, so a cleared field
 * reads as unanswered — which is what the diff in `case-facts-diff.ts`
 * distinguishes, and what every `facts?.x?.y` reader already treats as absent.
 */
export function applyFactPath(facts: CaseFacts, path: string, value: string | number | boolean | null): CaseFacts {
  const spec = PROPOSABLE_FACT_PATHS[path]
  if (!spec) return facts

  let next = facts
  for (const target of [path, ...(spec.mirrors ?? [])]) {
    next = value === null ? clearFactPath(next, target) : writeRaw(next, target, value)
  }
  return next
}

function clearFactPath(facts: CaseFacts, path: string): CaseFacts {
  const keys = path.split('.')
  const last = keys.pop() as string
  const parentPath = keys.join('.')
  const parent = parentPath ? readRaw(facts, parentPath) : facts

  if (!parent || typeof parent !== 'object') return facts
  if (!Object.prototype.hasOwnProperty.call(parent, last)) return facts

  const { [last]: _removed, ...remaining } = parent as Record<string, unknown>
  return parentPath ? writeRaw(facts, parentPath, remaining) : (remaining as CaseFacts)
}
