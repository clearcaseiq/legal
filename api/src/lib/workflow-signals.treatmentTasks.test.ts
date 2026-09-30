/**
 * `treatmentComplete` must ignore later-stage checklists. Entering Demand
 * preparation creates "Confirm treatment complete / MMI"; counting that open
 * task as treatment work re-opened treatment and the stage engine pulled the
 * case straight back to Treatment, leaving the plaintiff pipeline amber.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Task = { title: string; status: string; milestoneType: string | null; checkpointType?: string | null; completedAt?: Date }
let tasks: Task[] = []

function matches(row: any, where: any): boolean {
  if (!where) return true
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return (cond as any[]).every((w) => matches(row, w))
    if (key === 'OR') return (cond as any[]).some((w) => matches(row, w))
    if (key === 'assessmentId' || key === 'mergedIntoId') return true
    const value = row[key] ?? null
    if (cond === null) return value === null
    if (typeof cond !== 'object') return value === cond
    if ('in' in cond) return cond.in.includes(value)
    if ('notIn' in cond) return value !== null && !cond.notIn.includes(value)
    if ('not' in cond) return value !== cond.not
    if ('contains' in cond) return String(value ?? '').toLowerCase().includes(String(cond.contains).toLowerCase())
    return true
  })
}

vi.mock('./prisma', () => {
  const count = (n = 0) => vi.fn().mockResolvedValue(n)
  return {
    prisma: {
      assessment: {
        findUnique: vi.fn().mockResolvedValue({ id: 'a1', status: 'COMPLETED', leadSubmission: { id: 'l1' }, settlementScenario: null }),
      },
      caseTask: {
        count: vi.fn(async ({ where }: any) => tasks.filter((t) => matches(t, where)).length),
        findMany: vi.fn(async ({ where }: any) => tasks.filter((t) => matches(t, where))),
      },
      documentRequest: { count: count(0), findMany: vi.fn().mockResolvedValue([]) },
      evidenceFile: { count: count(3) },
      demandLetter: { count: count(0) },
      negotiationEvent: { count: count(0) },
      medicalCaseRecord: { findUnique: vi.fn().mockResolvedValue(null) },
    },
  }
})

import { loadSignalContext } from './workflow-signals'

describe('loadSignalContext treatmentComplete', () => {
  beforeEach(() => {
    tasks = [
      { title: 'Monitor ongoing treatment', status: 'done', milestoneType: null, completedAt: new Date() },
      { title: 'Document treatment progress', status: 'done', milestoneType: null, completedAt: new Date() },
    ]
  })

  it('is complete when every treatment task is done', async () => {
    expect((await loadSignalContext('a1')).treatmentComplete).toBe(true)
  })

  it('ignores the open Demand preparation MMI task', async () => {
    tasks.push({
      title: 'Confirm treatment complete / MMI (discharge or MMI note on file)',
      status: 'open',
      milestoneType: 'demand_preparation',
    })
    expect((await loadSignalContext('a1')).treatmentComplete).toBe(true)
  })

  it('still re-opens for an open treatment task outside later-stage checklists', async () => {
    tasks.push({ title: 'Follow-up on treatment gaps', status: 'open', milestoneType: null })
    expect((await loadSignalContext('a1')).treatmentComplete).toBe(false)
  })
})
