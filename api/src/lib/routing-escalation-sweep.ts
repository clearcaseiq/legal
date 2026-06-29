/**
 * Routing escalation sweep.
 *
 * The classic routing engine schedules the next wave by stamping `nextEscalationAt` on the
 * current RoutingWave. Something must periodically pick up waves whose escalation time has
 * passed and advance them (wave 1 -> 2 -> 3 -> manual review). This sweep is that driver.
 *
 * It is exposed both to the in-process scheduler (api/src/index.ts) and the admin
 * `POST /cases/escalate-due` endpoint so automatic routing advances even when no external
 * cron is configured.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { runEscalationWave } from './routing-lifecycle'
import { getMatchingRules, getConfiguredWaveWaitHours } from './matching-rules-config'

export interface RoutingEscalationSweepResult {
  processed: number
  escalated: number
  overdueCount: number
  overdueCases: Array<{ assessmentId: string; waveNumber: number; nextEscalationAt: Date | null }>
  skipped?: boolean
  reason?: string
  results: Array<{ assessmentId: string; escalated: boolean; waveNumber?: number; error?: string }>
}

/**
 * Find routing waves whose escalation time has elapsed and advance each affected case.
 * Safe to run repeatedly: `runEscalationWave` is idempotent per case (it no-ops once a
 * case is matched/locked or already escalated past the current wave).
 */
export async function runRoutingEscalationSweep(): Promise<RoutingEscalationSweepResult> {
  const config = await getMatchingRules()
  if (config.routingEnabled === false) {
    return { processed: 0, escalated: 0, overdueCount: 0, overdueCases: [], skipped: true, reason: 'Routing disabled by admin', results: [] }
  }

  const now = new Date()
  const dueWaves = await prisma.routingWave.findMany({
    where: {
      nextEscalationAt: { lte: now, not: null },
      escalatedAt: null,
    },
    select: { assessmentId: true, waveNumber: true, nextEscalationAt: true },
  })

  const overdueWaves = dueWaves.filter((wave) => {
    if (!wave.nextEscalationAt) return false
    const overdueHours = (now.getTime() - wave.nextEscalationAt.getTime()) / (1000 * 60 * 60)
    return overdueHours > Math.max(24, getConfiguredWaveWaitHours(config, wave.waveNumber) * 2)
  })
  const overdueCount = overdueWaves.length
  const overdueCases = overdueWaves.slice(0, 20).map((wave) => ({
    assessmentId: wave.assessmentId,
    waveNumber: wave.waveNumber,
    nextEscalationAt: wave.nextEscalationAt,
  }))

  const assessmentIds = [...new Set(dueWaves.map((wave) => wave.assessmentId))]
  const results = await Promise.all(
    assessmentIds.map(async (assessmentId) => {
      try {
        const result = await runEscalationWave(assessmentId)
        return { assessmentId, escalated: !!result.escalated, waveNumber: result.waveNumber, error: result.error }
      } catch (error) {
        return { assessmentId, escalated: false, error: error instanceof Error ? error.message : String(error) }
      }
    }),
  )

  const escalated = results.filter((r) => r.escalated).length
  if (results.length > 0) {
    logger.info('Routing escalation sweep processed due waves', { processed: results.length, escalated, overdueCount })
  }

  return { processed: results.length, escalated, overdueCount, overdueCases, results }
}
