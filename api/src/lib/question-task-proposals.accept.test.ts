import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: { caseTask: { findFirst: vi.fn(), update: vi.fn() } },
}))
vi.mock('./sole-firm-attorney', () => ({
  findSoleAttorneyForAssessment: vi.fn(async () => ({ userId: 'sole-user', name: 'Sole Attorney' })),
  applySoleAttorneyAssignee: vi.fn((base: any, sole: any) =>
    sole ? { ...base, assignedUserId: sole.userId, assignedTo: sole.name } : base,
  ),
}))

import { prisma } from './prisma'
import { acceptQuestionTaskProposal } from './question-task-proposals'

function proposal(extra: Record<string, unknown> = {}) {
  return {
    id: 't-1',
    assessmentId: 'asm-1',
    title: 'Request police report',
    taskType: 'proposed',
    reviewStatus: 'pending',
    assignedRole: 'paralegal',
    assignedTo: null,
    assignedUserId: null,
    ...extra,
  }
}

function updateData() {
  return (vi.mocked(prisma.caseTask.update).mock.calls[0][0] as any).data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.caseTask.update).mockImplementation((async ({ data }: any) => ({ id: 't-1', createdAt: new Date(), ...data })) as never)
})

describe('acceptQuestionTaskProposal', () => {
  it('keeps a teammate picked while the suggestion was pending', async () => {
    vi.mocked(prisma.caseTask.findFirst).mockResolvedValue(
      proposal({ assignedUserId: 'user-maria', assignedTo: 'Maria Lopez', assignedRole: 'paralegal' }) as never,
    )

    await acceptQuestionTaskProposal({ assessmentId: 'asm-1', taskId: 't-1' })

    expect(updateData()).toMatchObject({ assignedUserId: 'user-maria', assignedTo: 'Maria Lopez', reviewStatus: 'approved' })
  })

  it('falls back to the firm attorney when nobody was picked', async () => {
    vi.mocked(prisma.caseTask.findFirst).mockResolvedValue(proposal() as never)

    await acceptQuestionTaskProposal({ assessmentId: 'asm-1', taskId: 't-1' })

    expect(updateData()).toMatchObject({ assignedUserId: 'sole-user', assignedTo: 'Sole Attorney' })
  })
})
