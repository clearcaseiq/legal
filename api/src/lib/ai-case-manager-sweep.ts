/**
 * AI Case Manager — the proactive sweep.
 *
 * The self-driving Case Coach loop (`syncCaseCoachTasks`) already runs on
 * new-info events (doc upload, answer saved, task completed). This sweep closes
 * the gap: it periodically walks EVERY retained/active case and re-runs the loop
 * so the AI Case Manager keeps every file moving even when nothing happened to
 * trigger an event — surfacing new tasks, materializing intelligent-question
 * tasks, and flagging demand-ready cases.
 *
 * Safety:
 *  - `syncCaseCoachTasks` is itself retention-gated + idempotent, so this is
 *    safe to run repeatedly (it never duplicates a task the attorney handled).
 *  - New AI tasks respect the review gate (held for a case manager to approve).
 *  - Processed sequentially with a cap + small delay to bound DB/LLM load.
 *
 * Toggles (env):
 *  - AI_CASE_MANAGER_ENABLED=off        disable the sweep entirely
 *  - AI_CASE_MANAGER_SWEEP_MAX=<n>      max cases per run (default 250)
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { syncCaseCoachTasks } from './case-coach-loop'

const RETAINED_INTRO_STATUSES = ['ACCEPTED', 'accepted']
const ACTIVE_LEAD_STATUSES = ['contacted', 'consulted', 'retained']

export interface AiCaseManagerSweepResult {
  processed: number
  skipped?: boolean
  reason?: string
}

export function isAiCaseManagerEnabled(): boolean {
  const v = String(process.env.AI_CASE_MANAGER_ENABLED ?? '').trim().toLowerCase()
  return !(v === 'off' || v === 'false' || v === '0' || v === 'no')
}

function sweepMax(): number {
  const n = Number(process.env.AI_CASE_MANAGER_SWEEP_MAX)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 250
}

/**
 * Every assessmentId an attorney is actively working, platform-wide: leads past
 * marketplace review (contacted/consulted/retained) plus accepted introductions.
 *
 * Do not key off `assignedAttorneyId` alone — routing sets that when a case is
 * offered, before acceptance.
 */
export async function enumerateRetainedAssessmentIds(): Promise<string[]> {
  const [leads, intros] = await Promise.all([
    prisma.leadSubmission
      .findMany({
        where: { status: { in: ACTIVE_LEAD_STATUSES } },
        select: { assessmentId: true },
      })
      .catch(() => [] as Array<{ assessmentId: string }>),
    prisma.introduction
      .findMany({ where: { status: { in: RETAINED_INTRO_STATUSES } }, select: { assessmentId: true } })
      .catch(() => [] as Array<{ assessmentId: string }>),
  ])
  return [...new Set([...leads, ...intros].map((r) => r.assessmentId).filter(Boolean))]
}

export async function runAiCaseManagerSweep(): Promise<AiCaseManagerSweepResult> {
  if (!isAiCaseManagerEnabled()) {
    return { processed: 0, skipped: true, reason: 'AI Case Manager disabled' }
  }

  const ids = await enumerateRetainedAssessmentIds()
  const batch = ids.slice(0, sweepMax())
  let processed = 0
  for (const assessmentId of batch) {
    try {
      // requireRetained stays true (default) so intake-only cases are never touched.
      await syncCaseCoachTasks(assessmentId, { trigger: 'sweep' })
      processed += 1
    } catch (error: any) {
      logger.warn('AI Case Manager sweep case failed', { assessmentId, error: error?.message })
    }
    // Gentle pacing so a large caseload doesn't spike DB/LLM load.
    await new Promise((r) => setTimeout(r, 50))
  }

  return { processed }
}
