/**
 * The choke point, and the invariant that keeps it one.
 *
 * The source-scanning test at the bottom is the important one. A choke point
 * that is merely conventional stops being a choke point the first time somebody
 * writes the obvious four lines of `findUnique` / `JSON.parse` / mutate /
 * `update` — which is exactly how fourteen of them accumulated.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./data-authority', () => ({
  recordCaseChangeAtRevision: vi.fn().mockResolvedValue({ revision: 6, seq: 9, lawFirmId: null }),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { recordCaseChangeAtRevision } from './data-authority'
import {
  CaseFactsConflictError,
  CaseFactsUnreadableError,
  parseCaseFacts,
  requireCaseFacts,
  serializeCaseFacts,
  tryUpdateCaseFacts,
  updateCaseFacts,
} from './case-facts'

/** The row as it was read before each write, including its revision. */
function existing(facts: string, revision = 5) {
  prisma.assessment.findUnique.mockResolvedValue({ facts, revision, lawFirmId: 'firm-1' })
}

function writeCall(index = 0): any {
  return vi.mocked(prisma.assessment.updateMany).mock.calls[index][0]
}

function storedFacts(index = 0): any {
  return JSON.parse(writeCall(index).data.facts)
}

function provenanceRows(index = 0): any[] {
  return vi.mocked(prisma.caseFactChange.createMany).mock.calls[index][0].data
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
  vi.mocked(recordCaseChangeAtRevision).mockResolvedValue({ revision: 6, seq: 9, lawFirmId: null })
})

describe('parseCaseFacts', () => {
  it('is tolerant, because a corrupt case should still render', () => {
    expect(parseCaseFacts('{"a":1}')).toEqual({ a: 1 })
    expect(parseCaseFacts('not json')).toEqual({})
    expect(parseCaseFacts(null)).toEqual({})
    expect(parseCaseFacts('')).toEqual({})
    // A JSON array or scalar is not a facts document.
    expect(parseCaseFacts('[1,2]')).toEqual({})
    expect(parseCaseFacts('42')).toEqual({})
  })

  it('passes an already-parsed object straight through', () => {
    const facts = { a: 1 }
    expect(parseCaseFacts(facts)).toBe(facts)
  })
})

describe('requireCaseFacts', () => {
  it('accepts an empty column on a genuinely new case', () => {
    expect(requireCaseFacts('a-1', null)).toEqual({})
    expect(requireCaseFacts('a-1', '')).toEqual({})
  })

  it('throws rather than returning {} for a corrupt document', () => {
    // The whole point. Returning {} here is what silently replaced a case's
    // entire contents with whatever the caller was setting.
    expect(() => requireCaseFacts('a-1', '{"truncated":')).toThrow(CaseFactsUnreadableError)
    expect(() => requireCaseFacts('a-1', '[1,2]')).toThrow(CaseFactsUnreadableError)
    expect(() => requireCaseFacts('a-1', 42 as any)).toThrow(CaseFactsUnreadableError)
  })

  it('names the case in the error, since this needs a human to look', () => {
    expect(() => requireCaseFacts('asm-77', 'nope')).toThrow(/asm-77/)
  })
})

describe('serializeCaseFacts', () => {
  it('refuses anything that is not a plain object', () => {
    expect(() => serializeCaseFacts([] as any)).toThrow(TypeError)
    expect(() => serializeCaseFacts(null as any)).toThrow(TypeError)
    expect(serializeCaseFacts({ a: 1 })).toBe('{"a":1}')
  })
})

describe('updateCaseFacts', () => {
  it('reads, mutates and writes, and records the change', async () => {
    existing('{"damages":{"med_charges":100},"keep":true}')

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'attorney',
      action: 'damages_updated',
      entityType: 'damages',
      mutate: (facts) => ({ ...facts, damages: { ...facts.damages, med_charges: 250 } }),
    })

    expect(storedFacts()).toEqual({ damages: { med_charges: 250 }, keep: true })
    expect(result).toMatchObject({ written: true, revision: 6, trackedChanges: 1 })
    const [event, revision, lawFirmId] = vi.mocked(recordCaseChangeAtRevision).mock.calls[0]
    expect(event).toMatchObject({ assessmentId: 'a-1', source: 'attorney', action: 'damages_updated' })
    // Stamped with the revision this write produced, not one it bumped again.
    expect(revision).toBe(6)
    expect(lawFirmId).toBe('firm-1')
  })

  it('leaves untouched keys alone', async () => {
    existing('{"incident":{"narrative":"rear-ended"},"injuries":["neck"],"treatment":[{"provider":"Dr A"}]}')

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'system',
      action: 'medical_updated',
      mutate: (facts) => ({ ...facts, medical: { mmi: true } }),
    })

    expect(storedFacts()).toEqual({
      incident: { narrative: 'rear-ended' },
      injuries: ['neck'],
      treatment: [{ provider: 'Dr A' }],
      medical: { mmi: true },
    })
  })

  it('returns null and writes nothing when the case is gone', async () => {
    prisma.assessment.findUnique.mockResolvedValue(null)

    const result = await updateCaseFacts({
      assessmentId: 'missing',
      source: 'system',
      action: 'recalculated',
      mutate: () => ({ a: 1 }),
    })

    expect(result).toBeNull()
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
    expect(recordCaseChangeAtRevision).not.toHaveBeenCalled()
  })

  it('writes nothing when the mutator declines', async () => {
    existing('{"a":1}')

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'system',
      action: 'noop',
      mutate: () => null,
    })

    expect(result).toEqual({ facts: { a: 1 }, written: false, revision: null, trackedChanges: 0 })
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
    expect(recordCaseChangeAtRevision).not.toHaveBeenCalled()
  })

  it('refuses to overwrite a corrupt document', async () => {
    existing('{"truncated":')

    await expect(
      updateCaseFacts({
        assessmentId: 'a-1',
        source: 'attorney',
        action: 'damages_updated',
        mutate: (facts) => ({ ...facts, damages: { med_charges: 250 } }),
      }),
    ).rejects.toThrow(CaseFactsUnreadableError)

    // The document survives for someone to recover.
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
  })

  it('carries extra columns in the same statement as the facts', async () => {
    // Two call sites flip status alongside the facts write; a second round trip
    // would let a request fail between the two and leave the case mislabelled.
    existing('{}')

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      columns: { status: 'IN_PROGRESS' },
      mutate: (facts) => ({ ...facts, edited: true }),
    })

    expect(writeCall().data).toMatchObject({ status: 'IN_PROGRESS' })
  })

  it('skips the change event when the caller records its own', async () => {
    existing('{}')

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'submitted',
      recordChange: false,
      mutate: (facts) => ({ ...facts, consents: { hipaa: true } }),
    })

    expect(prisma.assessment.updateMany).toHaveBeenCalled()
    expect(recordCaseChangeAtRevision).not.toHaveBeenCalled()
    expect(result?.written).toBe(true)
  })

  it('still writes when the change feed fails', async () => {
    // The feed never throws; a lost feed row must not roll back the mutation the
    // claimant just made.
    existing('{}')
    vi.mocked(recordCaseChangeAtRevision).mockResolvedValue(null)

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 1 }),
    })

    expect(result).toMatchObject({ written: true, revision: 6 })
    expect(prisma.assessment.updateMany).toHaveBeenCalled()
  })
})

describe('the revision guard', () => {
  it('scopes the write to the revision it read and bumps it atomically', async () => {
    existing('{"a":1}', 5)

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 2 }),
    })

    const call = writeCall()
    // Both halves matter: matching on the revision is what excludes a concurrent
    // writer, and moving it in the same statement is what makes the exclusion
    // hold for the next writer.
    expect(call.where).toEqual({ id: 'a-1', revision: 5 })
    expect(call.data).toMatchObject({ revision: { increment: 1 }, lastWriteSource: 'web' })
  })

  it('re-reads and re-applies the mutator after losing a race', async () => {
    // The specialist-and-claimant-at-once case. The loser must rebuild its change
    // on top of the winner's document rather than replacing it.
    prisma.assessment.findUnique
      .mockResolvedValueOnce({ facts: '{"med":100}', revision: 5, lawFirmId: null })
      .mockResolvedValueOnce({ facts: '{"med":100,"wages":50}', revision: 6, lawFirmId: null })
    prisma.assessment.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 })

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'attorney',
      action: 'damages_updated',
      mutate: (facts) => ({ ...facts, med: 250 }),
    })

    expect(prisma.assessment.updateMany).toHaveBeenCalledTimes(2)
    // The concurrent writer's `wages` survived, and this writer's `med` applied.
    expect(storedFacts(1)).toEqual({ med: 250, wages: 50 })
    expect(writeCall(1).where).toEqual({ id: 'a-1', revision: 6 })
    expect(result).toMatchObject({ written: true, revision: 7 })
  })

  it('gives up rather than spinning when it keeps losing', async () => {
    existing('{"a":1}')
    prisma.assessment.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      updateCaseFacts({
        assessmentId: 'a-1',
        source: 'web',
        action: 'facts_edited',
        mutate: (facts) => ({ ...facts, a: 2 }),
      }),
    ).rejects.toThrow(CaseFactsConflictError)

    expect(prisma.assessment.updateMany).toHaveBeenCalledTimes(3)
    expect(recordCaseChangeAtRevision).not.toHaveBeenCalled()
  })

  it('records no change event for a write that never landed', async () => {
    existing('{"a":1}')
    prisma.assessment.updateMany.mockResolvedValue({ count: 0 })

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 2 }),
    }).catch(() => null)

    // A feed row for a write that lost would tell external systems a change
    // happened that did not.
    expect(recordCaseChangeAtRevision).not.toHaveBeenCalled()
    expect(prisma.caseFactChange.createMany).not.toHaveBeenCalled()
  })
})

describe('per-field provenance', () => {
  it('records who changed which field, from what, to what', async () => {
    existing('{"damages":{"med_charges":100}}')

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'attorney',
      action: 'damages_updated',
      actor: { type: 'user', id: 'spec-1', label: 'Sam Reyes' },
      mutate: (facts) => ({ ...facts, damages: { ...facts.damages, med_charges: 250 } }),
    })

    expect(provenanceRows()).toEqual([
      {
        assessmentId: 'a-1',
        path: 'damages.med_charges',
        kind: 'changed',
        previousValue: '100',
        nextValue: '250',
        revision: 6,
        source: 'attorney',
        actorType: 'user',
        actorId: 'spec-1',
        actorLabel: 'Sam Reyes',
        action: 'damages_updated',
      },
    ])
  })

  it('stamps the same revision as the change feed, so the two correlate', async () => {
    existing('{"a":1}', 11)

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 2 }),
    })

    const [, feedRevision] = vi.mocked(recordCaseChangeAtRevision).mock.calls[0]
    expect(provenanceRows()[0].revision).toBe(12)
    expect(feedRevision).toBe(12)
  })

  it('writes provenance in the same transaction as the facts', async () => {
    // Facts without their provenance is the state this whole model exists to
    // avoid, so the two cannot be allowed to diverge on a partial failure.
    existing('{"a":1}')

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 2 }),
    })

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('records nothing when the mutator produced an identical document', async () => {
    existing('{"damages":{"med_charges":100}}')

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'system',
      action: 'damages_updated',
      // What the write-through helpers do when the ledger has not moved.
      mutate: (facts) => ({ ...facts, damages: { med_charges: 100 } }),
    })

    expect(result).toMatchObject({ written: true, trackedChanges: 0 })
    expect(prisma.caseFactChange.createMany).not.toHaveBeenCalled()
  })

  it('skips per-field rows on a whole-document rewrite but still writes the facts', async () => {
    // `runCaseRecalculation` replaces the document on every evidence upload.
    const before: Record<string, number> = {}
    for (let i = 0; i < 60; i++) before[`field${i}`] = i
    existing(JSON.stringify(before))

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'system',
      action: 'recalculated',
      mutate: (facts) => Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, (v as number) + 1])),
    })

    expect(result).toMatchObject({ written: true, trackedChanges: 0 })
    expect(prisma.assessment.updateMany).toHaveBeenCalled()
    expect(prisma.caseFactChange.createMany).not.toHaveBeenCalled()
  })
})

describe('tryUpdateCaseFacts', () => {
  it('swallows a corrupt document for the never-throws write-through helpers', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{"truncated":' })

    await expect(
      tryUpdateCaseFacts({
        assessmentId: 'a-1',
        source: 'attorney',
        action: 'damages_updated',
        mutate: (facts) => ({ ...facts, a: 1 }),
      }),
    ).resolves.toBe(false)
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('reports whether the write landed', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{}' })
    await expect(
      tryUpdateCaseFacts({ assessmentId: 'a-1', source: 'system', action: 'x', mutate: (f) => ({ ...f, a: 1 }) }),
    ).resolves.toBe(true)
  })
})

/* -------------------------------------------------------------------------- */

const SRC_ROOT = join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === 'test' ? [] : sourceFiles(full)
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) return []
    return [full]
  })
}

describe('the choke point is the only way in', () => {
  /**
   * `Assessment.facts` may only be written by `case-facts.ts` (for updates) or
   * with `serializeCaseFacts` (for creates, which have no prior value to lose).
   *
   * If this fails you have added a fifteenth writer. Route it through
   * `updateCaseFacts` instead — a direct `update` skips the strict parse that
   * stops a corrupt document being replaced, and skips the revision bump that
   * external sync and conflict resolution depend on.
   */
  it('has no direct facts writes outside case-facts.ts', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC_ROOT)) {
      if (file.endsWith(join('lib', 'case-facts.ts'))) continue
      const lines = readFileSync(file, 'utf8').split(/\r?\n/)
      lines.forEach((line, index) => {
        // A `facts:` property assigned anything other than serializeCaseFacts.
        // Matches the `facts: JSON.stringify(...)` shape every old writer used.
        if (/^\s*facts:\s*JSON\.stringify/.test(line)) {
          offenders.push(`${file.slice(SRC_ROOT.length + 1)}:${index + 1}`)
        }
      })
    }

    expect(offenders).toEqual([])
  })

  it('routes every create through serializeCaseFacts', () => {
    // Creates are exempt from the choke point but not from serialization, so a
    // new case cannot be born holding a JSON array or a stringified string.
    const writers = sourceFiles(SRC_ROOT).filter((file) =>
      /facts:\s*serializeCaseFacts\(/.test(readFileSync(file, 'utf8')),
    )
    expect(writers.length).toBeGreaterThan(0)
  })
})
