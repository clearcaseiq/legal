import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    introduction: { findFirst: vi.fn() },
    leadSubmission: { findFirst: vi.fn() },
  },
}))

import { prisma } from './prisma'
import { isCaseRetained } from './case-coach-loop'

describe('isCaseRetained', () => {
  beforeEach(() => {
    vi.mocked(prisma.introduction.findFirst).mockReset()
    vi.mocked(prisma.leadSubmission.findFirst).mockReset()
  })

  it('is false when only marketplace routing assigned an attorney (not accepted)', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)
    // Lead find for ACTIVE statuses returns null — assignedAttorneyId alone must not count.
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue(null as any)

    await expect(isCaseRetained('a1')).resolves.toBe(false)
    expect(prisma.leadSubmission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assessmentId: 'a1',
          status: { in: ['contacted', 'consulted', 'retained'] },
        }),
      }),
    )
  })

  it('is true when an introduction was accepted', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({ id: 'intro-1' } as any)
    await expect(isCaseRetained('a1')).resolves.toBe(true)
    expect(prisma.leadSubmission.findFirst).not.toHaveBeenCalled()
  })

  it('is true when lead status is past intake', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue({ id: 'lead-1' } as any)
    await expect(isCaseRetained('a1')).resolves.toBe(true)
  })
})
