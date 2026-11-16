import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({ notifyAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./share-authorization', () => ({ withdrawShareAuthorization: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { deleteClaimantAccount } from './account-privacy'

describe('authorized account erasure with retained prediction foreign keys', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('deletes reviews and predictions before deleting an unshared assessment', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', phone: null } as any)
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([{ id: 'asm-1' }] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([] as any)
    const order: string[] = []
    vi.mocked(prisma.attorneyCaseReview.deleteMany).mockImplementation(async () => {
      order.push('reviews')
      return { count: 1 } as any
    })
    vi.mocked(prisma.prediction.deleteMany).mockImplementation(async () => {
      order.push('predictions')
      return { count: 2 } as any
    })
    vi.mocked(prisma.assessment.deleteMany).mockImplementation(async () => {
      order.push('assessment')
      return { count: 1 } as any
    })

    const result = await deleteClaimantAccount('user-1')

    expect(result).toEqual({ deletedAssessments: 1, retainedAssessments: 0 })
    expect(order).toEqual(['reviews', 'predictions', 'assessment'])
    expect(prisma.prediction.deleteMany).toHaveBeenCalledWith({
      where: { assessmentId: { in: ['asm-1'] } },
    })
  })
})
