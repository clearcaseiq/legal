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
 * 3. **Two writers silently clobbered each other.** Every site did an unguarded
 *    read-modify-write, so a specialist and a claimant editing one case in the
 *    same minute — the normal case for assisted intake, not an edge case — left
 *    whichever wrote last as the only survivor, undetectably. The write is now
 *    guarded on the revision it read and the loser re-applies its mutator.
 *
 * 4. **Nothing recorded who said what.** `lastWriteSource` is one string for the
 *    whole case, so it cannot express "the claimant wrote the injury date and a
 *    specialist wrote the claim number". Every write now also emits per-field
 *    `CaseFactChange` rows, in the same transaction as the facts.
 *
 * Read paths deliberately keep using the tolerant `parseCaseFacts`: a corrupt
 * blob should not take down a dashboard that merely displays it.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChangeAtRevision, type CaseChangeActor, type CaseWriteSource } from './data-authority'
import { diffCaseFacts } from './case-facts-diff'

export type CaseFacts = Record<string, any>

/**
 * How many times to re-read and re-apply after losing a race.
 *
 * Three is enough for contention between a claimant and a specialist on one
 * case. Anything beyond that is not contention, it is a write loop, and failing
 * loudly is better than spinning.
 */
const MAX_WRITE_ATTEMPTS = 3

/** Thrown when a write kept losing the race against another writer. */
export class CaseFactsConflictError extends Error {
  readonly assessmentId: string

  constructor(assessmentId: string, attempts: number) {
    super(`Assessment ${assessmentId} was changed by someone else during ${attempts} write attempts`)
    this.name = 'CaseFactsConflictError'
    this.assessmentId = assessmentId
  }
}

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
   * keep one user action from producing two rows on the feed.
   *
   * The write still bumps `revision` — the guard depends on it — so a caller
   * that then calls `recordCaseChange` advances it twice for one action. That is
   * harmless: `revision` is a monotonic concurrency token, not a count of user
   * actions. Per-field provenance is still recorded either way.
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
  /** The revision after this write. Null when nothing was written. */
  revision: number | null
  /** How many per-field provenance rows this write recorded. */
  trackedChanges: number
}

/**
 * Read, mutate and write `facts` for one case, recording provenance.
 *
 * The write is guarded on the revision that was read, so two writers who both
 * read revision 5 cannot both succeed — the loser re-reads and re-applies its
 * mutator against the winner's document. That is why the mutator has to be a
 * pure function of the facts it is handed.
 *
 * Returns `null` when the assessment no longer exists. Throws
 * `CaseFactsUnreadableError` if the stored blob is corrupt, and
 * `CaseFactsConflictError` if it kept losing the race.
 */
export async function updateCaseFacts(input: UpdateCaseFactsInput): Promise<UpdateCaseFactsResult | null> {
  const { assessmentId, mutate, columns } = input

  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const current = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { facts: true, revision: true, lawFirmId: true },
    })
    if (!current) return null

    const facts = requireCaseFacts(assessmentId, current.facts)
    const next = mutate(facts)
    if (next === null) return { facts, written: false, revision: null, trackedChanges: 0 }

    const serialized = serializeCaseFacts(next)
    const diff = diffCaseFacts(facts, next)
    // The revision the row will hold once this write lands. Both the feed event
    // and the provenance rows are stamped with it so they can be correlated.
    const nextRevision = (current.revision ?? 0) + 1

    const landed = await prisma.$transaction(async (tx) => {
      const result = await tx.assessment.updateMany({
        where: { id: assessmentId, revision: current.revision },
        data: {
          facts: serialized,
          // Bumped here rather than by a follow-up `recordCaseChange`: the guard
          // above only excludes a concurrent writer if the revision it matched on
          // moves in the same statement.
          revision: { increment: 1 },
          lastWriteSource: input.source,
          ...(columns?.status ? { status: columns.status } : {}),
        },
      })
      if (result.count === 0) return false

      if (diff.changes.length > 0) {
        await tx.caseFactChange.createMany({
          data: diff.changes.map((change) => ({
            assessmentId,
            path: change.path,
            kind: change.kind,
            previousValue: change.previousValue ?? null,
            nextValue: change.nextValue ?? null,
            revision: nextRevision,
            source: input.source,
            actorType: input.actor?.type ?? null,
            actorId: input.actor?.id ?? null,
            actorLabel: input.actor?.label ?? null,
            action: input.action,
          })),
        })
      }
      return true
    })

    if (!landed) {
      logger.info('Case facts write lost a race; retrying', { assessmentId, action: input.action, attempt })
      continue
    }

    if (diff.truncated) {
      // A whole-document rewrite rather than someone editing fields. The feed
      // still records the write; per-field rows are not useful at that volume.
      logger.info('Case facts change too broad to track per field', {
        assessmentId,
        action: input.action,
        revision: nextRevision,
      })
    }

    if (input.recordChange !== false) {
      // Awaited rather than fired and forgotten so the feed row exists before a
      // caller acts on the revision. Never throws, so it cannot turn a
      // successful write into a failure.
      await recordCaseChangeAtRevision(
        {
          assessmentId,
          source: input.source,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          summary: input.summary,
          actor: input.actor,
        },
        nextRevision,
        current.lawFirmId ?? null,
      )
    }

    return { facts: next, written: true, revision: nextRevision, trackedChanges: diff.changes.length }
  }

  throw new CaseFactsConflictError(assessmentId, MAX_WRITE_ATTEMPTS)
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
