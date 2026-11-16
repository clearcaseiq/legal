import type { Prediction, Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type PredictionWriteResult = {
  prediction: Prediction
  created: boolean
}

/**
 * Append one immutable prediction version, idempotently.
 *
 * Concurrent workers can score the same revision before either sees the
 * other's row. The database uniqueness key is the final arbiter; a loser reads
 * and returns the row that won instead of appending a duplicate version.
 */
export async function writePredictionVersion(
  data: Prisma.PredictionUncheckedCreateInput,
): Promise<PredictionWriteResult> {
  try {
    return {
      prediction: await prisma.prediction.create({ data }),
      created: true,
    }
  } catch (error: any) {
    if (error?.code !== 'P2002') throw error

    const prediction = await prisma.prediction.findFirst({
      where: {
        assessmentId: data.assessmentId,
        assessmentRevision: data.assessmentRevision,
        inputHash: data.inputHash,
        modelVersion: data.modelVersion,
      },
      orderBy: { id: 'asc' },
    })
    if (!prediction) throw error
    return { prediction, created: false }
  }
}
