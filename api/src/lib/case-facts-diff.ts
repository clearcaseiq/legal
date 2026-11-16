/**
 * Per-field diff of two facts documents.
 *
 * Provenance exists to answer one question: the claimant said three weeks, the
 * specialist entered three months — who said which, and when? That needs the
 * change recorded per field, not per case, which means turning two versions of
 * a loose JSON document into a list of dotted paths that actually changed.
 *
 * Three decisions worth knowing about:
 *
 * - **Arrays are compared whole.** `facts.treatment` is rewritten wholesale by
 *   the medical write-through, and matching elements across two versions of an
 *   unkeyed array is guesswork that invents changes nobody made. One path, one
 *   before, one after.
 * - **Absent and null are different.** A field nobody has answered is not a
 *   field answered "no". Both serialize to something in JSON, so the diff
 *   distinguishes them with an explicit `kind`.
 * - **The result is complete.** Every changed path is retained so a prediction
 *   can be reconstructed from its exact revision, including large background
 *   merges and imports.
 */

export type CaseFactChangeKind = 'added' | 'removed' | 'changed'

export type CaseFactChange = {
  /** Dotted path into the document, e.g. `damages.med_charges`. */
  path: string
  kind: CaseFactChangeKind
  /** JSON-encoded, or undefined when the field did not exist. */
  previousValue?: string
  nextValue?: string
}

export type CaseFactsDiff = {
  changes: CaseFactChange[]
  /** Kept for response compatibility; complete diffs are never truncated. */
  truncated: boolean
}

/** Deeper than this is configuration and derived blobs, not authored answers. */
const MAX_DEPTH = 4

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Stable enough for equality: key order is the only thing we normalize. */
function encode(value: unknown): string {
  return JSON.stringify(value, (_key, inner) => {
    if (!isPlainObject(inner)) return inner
    return Object.fromEntries(Object.keys(inner).sort().map((key) => [key, inner[key]]))
  })
}

export function diffCaseFacts(previous: unknown, next: unknown): CaseFactsDiff {
  const changes: CaseFactChange[] = []

  const walk = (before: unknown, after: unknown, path: string, depth: number): void => {
    // Recurse only while both sides are objects and we have depth left. When one
    // side stops being an object the subtree changed shape, and the honest
    // record of that is the whole subtree, not invented leaf changes.
    if (depth < MAX_DEPTH && isPlainObject(before) && isPlainObject(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        walk(before[key], after[key], path ? `${path}.${key}` : key, depth + 1)
      }
      return
    }

    const hadBefore = before !== undefined
    const hasAfter = after !== undefined
    if (!hadBefore && !hasAfter) return

    const encodedBefore = hadBefore ? encode(before) : undefined
    const encodedAfter = hasAfter ? encode(after) : undefined
    if (encodedBefore === encodedAfter) return

    changes.push({
      path,
      kind: !hadBefore ? 'added' : !hasAfter ? 'removed' : 'changed',
      previousValue: encodedBefore,
      nextValue: encodedAfter,
    })
  }

  walk(previous, next, '', 0)
  return { changes, truncated: false }
}
