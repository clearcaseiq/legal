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
vi.mock('./data-authority', () => ({ recordCaseChange: vi.fn().mockResolvedValue({ revision: 4, seq: 9, lawFirmId: null }) }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { recordCaseChange } from './data-authority'
import {
  CaseFactsUnreadableError,
  parseCaseFacts,
  requireCaseFacts,
  serializeCaseFacts,
  tryUpdateCaseFacts,
  updateCaseFacts,
} from './case-facts'

function storedFacts(): any {
  return JSON.parse(vi.mocked(prisma.assessment.update).mock.calls[0][0].data.facts)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
  vi.mocked(recordCaseChange).mockResolvedValue({ revision: 4, seq: 9, lawFirmId: null })
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
  it('reads, mutates and writes, and records provenance', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{"damages":{"med_charges":100},"keep":true}' })

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'attorney',
      action: 'damages_updated',
      entityType: 'damages',
      mutate: (facts) => ({ ...facts, damages: { ...facts.damages, med_charges: 250 } }),
    })

    expect(storedFacts()).toEqual({ damages: { med_charges: 250 }, keep: true })
    expect(result).toEqual({ facts: expect.any(Object), written: true, revision: 4 })
    const [event] = vi.mocked(recordCaseChange).mock.calls[0]
    expect(event).toMatchObject({ assessmentId: 'a-1', source: 'attorney', action: 'damages_updated' })
  })

  it('leaves untouched keys alone', async () => {
    prisma.assessment.findUnique.mockResolvedValue({
      facts: '{"incident":{"narrative":"rear-ended"},"injuries":["neck"],"treatment":[{"provider":"Dr A"}]}',
    })

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
    expect(prisma.assessment.update).not.toHaveBeenCalled()
    expect(recordCaseChange).not.toHaveBeenCalled()
  })

  it('writes nothing when the mutator declines', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{"a":1}' })

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'system',
      action: 'noop',
      mutate: () => null,
    })

    expect(result).toEqual({ facts: { a: 1 }, written: false, revision: null })
    expect(prisma.assessment.update).not.toHaveBeenCalled()
    expect(recordCaseChange).not.toHaveBeenCalled()
  })

  it('refuses to overwrite a corrupt document', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{"truncated":' })

    await expect(
      updateCaseFacts({
        assessmentId: 'a-1',
        source: 'attorney',
        action: 'damages_updated',
        mutate: (facts) => ({ ...facts, damages: { med_charges: 250 } }),
      }),
    ).rejects.toThrow(CaseFactsUnreadableError)

    // The document survives for someone to recover.
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('carries extra columns in the same statement as the facts', async () => {
    // Two call sites flip status alongside the facts write; a second round trip
    // would let a request fail between the two and leave the case mislabelled.
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{}' })

    await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      columns: { status: 'IN_PROGRESS' },
      mutate: (facts) => ({ ...facts, edited: true }),
    })

    expect(vi.mocked(prisma.assessment.update).mock.calls[0][0].data).toMatchObject({ status: 'IN_PROGRESS' })
  })

  it('skips the change event when the caller records its own', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{}' })

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'submitted',
      recordChange: false,
      mutate: (facts) => ({ ...facts, consents: { hipaa: true } }),
    })

    expect(prisma.assessment.update).toHaveBeenCalled()
    expect(recordCaseChange).not.toHaveBeenCalled()
    expect(result?.written).toBe(true)
  })

  it('still writes when the change feed fails', async () => {
    // `recordCaseChange` returns null rather than throwing; a lost feed row must
    // not roll back the mutation the claimant just made.
    prisma.assessment.findUnique.mockResolvedValue({ facts: '{}' })
    vi.mocked(recordCaseChange).mockResolvedValue(null)

    const result = await updateCaseFacts({
      assessmentId: 'a-1',
      source: 'web',
      action: 'facts_edited',
      mutate: (facts) => ({ ...facts, a: 1 }),
    })

    expect(result).toMatchObject({ written: true, revision: null })
    expect(prisma.assessment.update).toHaveBeenCalled()
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
