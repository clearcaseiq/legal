/**
 * The single choke point for writing `Assessment.facts`.
 *
 * `facts` is one `@db.Text` JSON blob holding the whole case. Before this
 * module, fourteen sites across ten files each did their own
 * findUnique → JSON.parse → mutate → JSON.stringify → update, which caused two
 * problems that no amount of care at the call sites could fix:
 *
 * 1. **Silent whole-document loss.** Six of those sites parsed with
 *    `try { JSON.parse(...) } catch { facts = {} }` and then wrote the result
 *    straight back. A single malformed blob was therefore rewritten as a
 *    near-empty document — the case's entire contents replaced by whatever that
 *    one writer happened to set. `requireCaseFacts` refuses to write instead, so
 *    a corrupt case surfaces as a visible error rather than quiet data loss.
 *
 * 2. **`revision` never moved.** `recordCaseChange()` is the only thing that
 *    increments it, and none of the fourteen writers called it, despite the
 *    schema documenting it as bumped on every material change. Anything built on
 *    it — optimistic concurrency, external sync ordering, de-duplication — was
 *    comparing two identical numbers and concluding nothing had changed. Every
 *    write through here records a change, so the column now means what it says.
 *
 * Read paths deliberately keep using the tolerant `parseCaseFacts`: a corrupt
 * blob should not take down a dashboard that merely displays it.
 *
 * Not yet handled: two writers that read the same revision still last-write-wins,
 * because the guard needs `where: { id, revision }` and callers that can cope
 * with a write being rejected. `updateCaseFacts` returns the revision it
 * produced so that guard can be added here without touching a call site.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange, type CaseChangeActor, type CaseWriteSource } from './data-authority'

export type CaseFacts = Record<string, any>

/** Thrown when the stored blob cannot be parsed, to stop a write replacing it. */
export class CaseFactsUnreadableError extends Error {
  readonly assessmentId: string

  constructor(assessmentId: string, cause?: unknown) {
    super(
      `Assessment ${assessmentId} has unreadable facts; refusing to overwrite. ` +
        `Cause: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
    this.name = 'CaseFactsUnreadableError'
    this.assessmentId = assessmentId
  }
}

/**
 * Tolerant parse for read paths. Returns `{}` rather than throwing.
 *
 * Accepts an already-parsed object because some callers select `facts` from a
 * client that has deserialized it, and a few older rows were written as objects.
 */
export function parseCaseFacts(raw: unknown): CaseFacts {
  if (raw && typeof raw === 'object') return raw as CaseFacts
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as CaseFacts) : {}
  } catch {
    return {}
  }
}

/**
 * Strict parse for write paths. Throws `CaseFactsUnreadableError` rather than
 * returning `{}`, because the caller is about to serialize the result back over
 * the top of whatever is really in the column.
 */
export function requireCaseFacts(assessmentId: string, raw: unknown): CaseFacts {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as CaseFacts
  // A genuinely new case can hold an empty string; that is not corruption.
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return {}
  if (typeof raw !== 'string') throw new CaseFactsUnreadableError(assessmentId, `facts was ${typeof raw}`)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new CaseFactsUnreadableError(assessmentId, error)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CaseFactsUnreadableError(assessmentId, 'facts did not contain a JSON object')
  }
  return parsed as CaseFacts
}

/** Serialize for storage, rejecting anything that is not a plain object. */
export function serializeCaseFacts(facts: CaseFacts): string {
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
    throw new TypeError('Case facts must be a plain object')
  }
  return JSON.stringify(facts)
}

export type UpdateCaseFactsInput = {
  assessmentId: string
  /** Provenance for the change feed and `lastWriteSource`. */
  source: CaseWriteSource
  /** Stable verb, e.g. `damages_updated`. */
  action: string
  entityType?: string
  entityId?: string | null
  summary?: string | null
  actor?: CaseChangeActor
  /**
   * Other `Assessment` columns to set in the same statement. Two call sites flip
   * `status` to IN_PROGRESS alongside the facts write and must not need a second
   * round trip to do it.
   */
  columns?: { status?: string }
  /**
   * Set false when the caller records its own change event for this mutation, to
   * keep one user action from producing two rows on the feed. The caller is then
   * responsible for the `recordCaseChange` that moves `revision`.
   */
  recordChange?: boolean
  /**
   * Produce the next facts document, or `null` to write nothing.
   *
   * Must be a pure function of the facts it is given plus values closed over
   * from the caller. It may be re-run against freshly read facts once the
   * revision guard lands, so it must not accumulate (no `count: count + 1`).
   */
  mutate: (facts: CaseFacts) => CaseFacts | null
}

export type UpdateCaseFactsResult = {
  facts: CaseFacts
  /** False when the mutator declined to change anything. */
  written: boolean
  /** The revision after this write, or null when the change feed rejected it. */
  revision: number | null
}

/**
 * Read, mutate and write `facts` for one case, recording provenance.
 *
 * Returns `null` when the assessment no longer exists. Throws
 * `CaseFactsUnreadableError` if the stored blob is corrupt — callers that
 * previously swallowed everything still swallow it, but they no longer destroy
 * the document on the way through.
 */
export async function updateCaseFacts(input: UpdateCaseFactsInput): Promise<UpdateCaseFactsResult | null> {
  const { assessmentId, mutate, columns } = input

  const current = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { facts: true },
  })
  if (!current) return null

  const facts = requireCaseFacts(assessmentId, current.facts)
  const next = mutate(facts)
  if (next === null) return { facts, written: false, revision: null }

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      facts: serializeCaseFacts(next),
      ...(columns?.status ? { status: columns.status } : {}),
    },
  })

  if (input.recordChange === false) return { facts: next, written: true, revision: null }

  // Awaited rather than fired and forgotten: this is what moves `revision` and
  // `lastWriteSource`, so a caller that returns the new revision needs it to
  // have landed. `recordCaseChange` never throws, so awaiting cannot turn a
  // successful write into a failure.
  const change = await recordCaseChange({
    assessmentId,
    source: input.source,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    actor: input.actor,
  })

  return { facts: next, written: true, revision: change?.revision ?? null }
}

/**
 * Apply a facts change, logging and swallowing failures.
 *
 * For the write-through helpers whose contract is "never throws" — a ledger
 * rollup failing should not fail the attorney's save of the underlying record.
 * Returns whether the write landed.
 */
export async function tryUpdateCaseFacts(input: UpdateCaseFactsInput): Promise<boolean> {
  try {
    const result = await updateCaseFacts(input)
    return !!result?.written
  } catch (error: any) {
    logger.warn('Case facts write failed', {
      assessmentId: input.assessmentId,
      action: input.action,
      error: error?.message,
    })
    return false
  }
}
