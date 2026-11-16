import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { writePredictionVersion } from './prediction-writer'

const data = {
  assessmentId: 'asm-1',
  assessmentRevision: 7,
  triggerEventId: 'event-7',
  inputHash: 'a'.repeat(64),
  inputSnapshot: '{"assessmentRevision":7}',
  modelVersion: 'engine-v1+cal:7',
  viability: '{}',
  bands: '{}',
  explain: '{}',
}

describe('idempotent prediction writes', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('returns the concurrently created version after the uniqueness constraint wins', async () => {
    const winner = { id: 'prediction-winner', ...data }
    vi.mocked(prisma.prediction.create).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    )
    vi.mocked(prisma.prediction.findFirst).mockResolvedValue(winner as any)

    const result = await writePredictionVersion(data)

    expect(result).toEqual({ prediction: winner, created: false })
    expect(prisma.prediction.findFirst).toHaveBeenCalledWith({
      where: {
        assessmentId: data.assessmentId,
        assessmentRevision: data.assessmentRevision,
        inputHash: data.inputHash,
        modelVersion: data.modelVersion,
      },
      orderBy: { id: 'asc' },
    })
  })

  it('does not swallow unrelated database failures', async () => {
    vi.mocked(prisma.prediction.create).mockRejectedValue(new Error('connection lost'))

    await expect(writePredictionVersion(data)).rejects.toThrow('connection lost')
  })
})
