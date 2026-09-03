/**
 * The diff decides what provenance can answer, so its edge cases matter more
 * than they look. A diff that reports changes nobody made is worse than none:
 * it would show a specialist as the author of a field they never touched.
 */
import { describe, expect, it } from 'vitest'
import { MAX_TRACKED_CHANGES, diffCaseFacts } from './case-facts-diff'

function paths(previous: unknown, next: unknown): string[] {
  return diffCaseFacts(previous, next).changes.map((change) => change.path)
}

describe('diffCaseFacts', () => {
  it('reports nothing for an identical document', () => {
    const facts = { damages: { med_charges: 100 }, injuries: ['neck'] }
    expect(diffCaseFacts(facts, structuredClone(facts))).toEqual({ changes: [], truncated: false })
  })

  it('finds a nested leaf change and encodes both sides', () => {
    const diff = diffCaseFacts({ damages: { med_charges: 100 } }, { damages: { med_charges: 250 } })
    expect(diff.changes).toEqual([
      { path: 'damages.med_charges', kind: 'changed', previousValue: '100', nextValue: '250' },
    ])
  })

  it('does not report untouched siblings', () => {
    expect(
      paths(
        { damages: { med_charges: 100, wage_loss: 50 }, incident: { narrative: 'rear-ended' } },
        { damages: { med_charges: 250, wage_loss: 50 }, incident: { narrative: 'rear-ended' } },
      ),
    ).toEqual(['damages.med_charges'])
  })

  it('distinguishes a field nobody answered from one answered null', () => {
    // The distinction provenance exists for: "not asked" is not "answered no".
    // Both sides carry `medical`, so the diff descends to the leaf.
    const added = diffCaseFacts({ medical: {} }, { medical: { mmi: null } }).changes[0]
    expect(added).toMatchObject({ path: 'medical.mmi', kind: 'added', nextValue: 'null' })
    expect(added.previousValue).toBeUndefined()

    const removed = diffCaseFacts({ medical: { mmi: null } }, { medical: {} }).changes[0]
    expect(removed).toMatchObject({ path: 'medical.mmi', kind: 'removed', previousValue: 'null' })
    expect(removed.nextValue).toBeUndefined()

    // And null -> false is a real answer changing, not a no-op.
    expect(paths({ medical: { mmi: null } }, { medical: { mmi: false } })).toEqual(['medical.mmi'])
  })

  it('records a brand-new subtree as the subtree, not as invented leaves', () => {
    // Nothing was edited field by field here — a whole domain appeared. Listing
    // `medical.mmi`, `medical.mmiDate` and so on would claim the writer set each
    // one individually.
    const diff = diffCaseFacts({}, { medical: { mmi: null, treatmentStatus: 'active' } })
    expect(diff.changes).toEqual([
      {
        path: 'medical',
        kind: 'added',
        previousValue: undefined,
        nextValue: '{"mmi":null,"treatmentStatus":"active"}',
      },
    ])
  })

  it('treats an array as one value rather than guessing element identity', () => {
    // `facts.treatment` is rewritten wholesale by the medical write-through.
    // Pairing elements across two versions of an unkeyed array would invent
    // changes, so the whole array is one path.
    const diff = diffCaseFacts(
      { treatment: [{ provider: 'Dr A' }] },
      { treatment: [{ provider: 'Dr A' }, { provider: 'Dr B' }] },
    )
    expect(diff.changes.map((c) => c.path)).toEqual(['treatment'])
    expect(diff.changes[0].kind).toBe('changed')
  })

  it('ignores key order inside objects', () => {
    // Spreading and rebuilding sub-objects reorders keys constantly; that is not
    // a change anyone made.
    expect(paths({ a: { x: 1, y: 2 } }, { a: { y: 2, x: 1 } })).toEqual([])
    expect(paths({ a: [{ x: 1, y: 2 }] }, { a: [{ y: 2, x: 1 }] })).toEqual([])
  })

  it('records a whole subtree when one side stops being an object', () => {
    expect(paths({ insurance: { carrier: 'X' } }, { insurance: 'none' })).toEqual(['insurance'])
    expect(paths({ insurance: 'none' }, { insurance: { carrier: 'X' } })).toEqual(['insurance'])
  })

  it('handles a top-level key appearing and disappearing', () => {
    expect(diffCaseFacts({}, { damagesLedger: { itemCount: 2 } }).changes).toEqual([
      { path: 'damagesLedger', kind: 'added', previousValue: undefined, nextValue: '{"itemCount":2}' },
    ])
    expect(paths({ damagesLedger: { itemCount: 2 } }, {})).toEqual(['damagesLedger'])
  })

  it('stops descending past the depth cap and records the subtree instead', () => {
    const deep = (leaf: unknown) => ({ a: { b: { c: { d: { e: leaf } } } } })
    // Depth 5 is below the cap, so the change surfaces as the deepest tracked
    // node rather than the full path.
    const changed = diffCaseFacts(deep(1), deep(2)).changes
    expect(changed).toHaveLength(1)
    expect(changed[0].path.split('.').length).toBeLessThanOrEqual(4)
  })

  it('gives up rather than flooding the table on a whole-document rewrite', () => {
    // What `runCaseRecalculation` does on every evidence upload.
    const before: Record<string, number> = {}
    const after: Record<string, number> = {}
    for (let i = 0; i < MAX_TRACKED_CHANGES + 5; i++) {
      before[`field${i}`] = i
      after[`field${i}`] = i + 1
    }

    const diff = diffCaseFacts(before, after)
    expect(diff.truncated).toBe(true)
    // No partial record: half a rewrite attributed to one actor would read as a
    // precise claim about fields it never singled out.
    expect(diff.changes).toEqual([])
  })

  it('stays under the cap for a realistic single-domain write', () => {
    const diff = diffCaseFacts(
      { damages: { med_charges: 100, wage_loss: 0 }, injuries: ['neck'] },
      {
        damages: { med_charges: 250, wage_loss: 1200, future_medical: 500 },
        injuries: ['neck', 'back'],
        damagesLedger: { itemCount: 3 },
      },
    )
    expect(diff.truncated).toBe(false)
    expect(diff.changes).toHaveLength(5)
  })
})
