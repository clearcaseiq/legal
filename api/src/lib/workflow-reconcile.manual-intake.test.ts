import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  assessment: { findUnique: vi.fn() },
  caseWorkflowItem: { findMany: vi.fn(), deleteMany: vi.fn() },
  caseTask: { updateMany: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: prismaMock }))

import { dropManualIntakeExcludedSteps } from './workflow-reconcile'

const manualFacts = JSON.stringify({ origin: { kind: 'attorney_self', origin: 'manual' } })
const importFacts = JSON.stringify({ origin: { kind: 'attorney_self', origin: 'import' } })

describe('dropManualIntakeExcludedSteps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.caseWorkflowItem.findMany.mockResolvedValue([
      { id: 'wi-welcome', title: 'Send client welcome packet' },
      { id: 'wi-retainer', title: 'Send retainer to client' },
    ])
  })

  it('removes the pending welcome packet step and its open task on a manual case', async () => {
    prismaMock.assessment.findUnique.mockResolvedValue({ facts: manualFacts })

    expect(await dropManualIntakeExcludedSteps('a-1')).toBe(1)
    expect(prismaMock.caseTask.updateMany).toHaveBeenCalledWith({
      where: {
        assessmentId: 'a-1',
        status: { in: ['open', 'in_progress'] },
        sourceTemplateStepId: { in: ['wfitem:wi-welcome'] },
      },
      data: { status: 'deleted' },
    })
    expect(prismaMock.caseWorkflowItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['wi-welcome'] } } })
  })

  it('leaves imported and routed cases alone', async () => {
    prismaMock.assessment.findUnique.mockResolvedValueOnce({ facts: importFacts })
    expect(await dropManualIntakeExcludedSteps('a-2')).toBe(0)
    prismaMock.assessment.findUnique.mockResolvedValueOnce({ facts: '{}' })
    expect(await dropManualIntakeExcludedSteps('a-3')).toBe(0)
    expect(prismaMock.caseWorkflowItem.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.caseTask.updateMany).not.toHaveBeenCalled()
  })
})
