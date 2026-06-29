/**
 * Case outcome recording + export for valuation calibration.
 *
 * `recordCaseOutcome` captures the real-world resolution of a case along with a snapshot
 * of the feature vector and the latest predicted median, so the prediction being graded
 * can be replayed exactly. `exportOutcomeSamples` turns stored outcomes into the labeled
 * dataset consumed by `valuation-calibration.ts` / the `calibrate-valuation` CLI.
 */

import { prisma } from './prisma'
import { computeFeatures } from './prediction'
import { logger } from './logger'
import type { OutcomeSample } from './valuation-calibration'

export type OutcomeType = 'settlement' | 'verdict' | 'dismissed' | 'withdrawn'

export interface RecordOutcomeInput {
  assessmentId: string
  outcomeType: OutcomeType
  grossAmount?: number | null
  netToClient?: number | null
  resolvedAt?: Date | string | null
  source?: 'manual' | 'attorney_reported' | 'docket_import'
  notes?: string | null
}

/**
 * Record a case's resolution, snapshotting the current feature vector and latest
 * predicted settlement median for later backtesting.
 */
export async function recordCaseOutcome(input: RecordOutcomeInput) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: input.assessmentId },
    include: { predictions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  if (!assessment) throw new Error(`Assessment not found: ${input.assessmentId}`)

  let featuresSnapshot: string | null = null
  try {
    featuresSnapshot = JSON.stringify(computeFeatures(assessment))
  } catch (err) {
    logger.warn('Failed to snapshot features for case outcome', {
      assessmentId: input.assessmentId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  let predictedMedian: number | null = null
  const latest = assessment.predictions[0]
  if (latest) {
    try {
      predictedMedian = Number(JSON.parse(latest.bands)?.median) || null
    } catch {
      /* ignore malformed bands */
    }
  }

  return prisma.caseOutcome.create({
    data: {
      assessmentId: input.assessmentId,
      outcomeType: input.outcomeType,
      grossAmount: input.grossAmount ?? null,
      netToClient: input.netToClient ?? null,
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
      predictedMedian,
      featuresSnapshot,
      source: input.source ?? 'manual',
      notes: input.notes ?? null,
    },
  })
}

/**
 * Export stored monetary outcomes as labeled calibration samples. Prefers the snapshotted
 * feature vector; falls back to recomputing features from the current assessment.
 */
export async function exportOutcomeSamples(): Promise<OutcomeSample[]> {
  const rows = await prisma.caseOutcome.findMany({
    where: { outcomeType: { in: ['settlement', 'verdict'] }, grossAmount: { gt: 0 } },
    include: { assessment: true },
  })

  const samples: OutcomeSample[] = []
  for (const row of rows) {
    let features: any = null
    if (row.featuresSnapshot) {
      try {
        features = JSON.parse(row.featuresSnapshot)
      } catch {
        /* fall through to recompute */
      }
    }
    if (!features && row.assessment) {
      try {
        features = computeFeatures(row.assessment)
      } catch {
        continue
      }
    }
    if (!features) continue
    samples.push({
      features,
      actualAmount: Number(row.grossAmount),
      outcomeType: row.outcomeType as OutcomeType,
    })
  }
  return samples
}
