/**
 * Intake funnel reporting, built from `IntakeLead.stepHistory`.
 *
 * The wizard reports each step it moves to, and `intake-leads.ts` appends it
 * with a timestamp — so every lead carries an ordered, timed path through the
 * funnel. That column has been filled since it was added and read by nothing.
 * This is the first reader.
 *
 * It answers the two questions Google Analytics cannot answer about this
 * product at all: which screens claimants reach, and which ones hold them.
 * The intake wizard is on the HIPAA deny list in `analyticsBoundary.ts`, so no
 * tag runs there and GA4 has never seen a single step of it.
 */
import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Gaps longer than this are not time on a screen.
 *
 * A claimant who leaves the tab open over lunch and comes back produces a
 * ninety-minute "dwell" on whatever step they had reached. Those are real
 * events but they measure absence, not attention, and a handful of them drags
 * a mean into uselessness. Excluded from the timing statistics; the lead still
 * counts for reach and drop-off, which do not depend on the clock.
 */
const MAX_CREDIBLE_DWELL_MS = 30 * 60 * 1000

/** Below this, a step's timings are too few to mean anything. */
const MIN_SAMPLES_FOR_TIMING = 5

/**
 * Ceiling on leads examined per report.
 *
 * The aggregation is in-process rather than in SQL because `stepHistory` is a
 * JSON string column; parsing 50k of them on an admin page load is not worth
 * the fidelity. Ordered newest-first, so the cap drops the oldest leads in the
 * window rather than a random sample.
 */
const MAX_LEADS = 20_000

export type FunnelStep = {
  step: string
  /** Leads that reached this step at least once. */
  reached: number
  /** Reached it and got no further, without completing. */
  droppedHere: number
  /** `droppedHere / reached`, 0–1. Null when nobody reached it. */
  dropRate: number | null
  /** Median seconds on this step, or null when too few credible samples. */
  medianSeconds: number | null
  /** 90th percentile seconds, which is where a confusing screen shows up. */
  p90Seconds: number | null
  /** Credible timing samples behind the two figures above. */
  timedSamples: number
}

export type IntakeFunnelReport = {
  periodDays: number
  /** Leads in the window with at least one recorded step. */
  totalLeads: number
  /** Of those, how many finished the wizard. */
  completedLeads: number
  completionRate: number | null
  steps: FunnelStep[]
  /** Steps where claimants abandon most, worst first. Derived from `steps`. */
  worstDropOff: Array<{ step: string; droppedHere: number; dropRate: number }>
}

type LeadRow = {
  stepHistory: string | null
  currentStep: string | null
  status: string
  assessmentId: string | null
}

type ParsedEntry = { step: string; at: number }

/** `[{ step, at }]`, tolerating the truncated or malformed rows of any JSON column. */
function parseHistory(raw: string | null): ParsedEntry[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const entries: ParsedEntry[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const step = (item as any).step
    const at = Date.parse((item as any).at)
    if (typeof step !== 'string' || !step || !Number.isFinite(at)) continue
    entries.push({ step, at })
  }
  // Appended in order, but sorting costs nothing and makes the dwell maths
  // safe against a clock skew or an out-of-order write.
  return entries.sort((a, b) => a.at - b.at)
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))
  return sorted[index]
}

/**
 * A canonical step order, inferred from where each step tends to appear.
 *
 * There is no declared ordering to read: the wizard branches by injury type, so
 * no single path visits every step and the enum order in the client would not
 * survive a reordering anyway. Ranking by the mean position at which a step is
 * first seen puts the funnel in the order claimants actually experience it, and
 * degrades sensibly for a step that only some branches reach.
 */
function inferStepOrder(histories: ParsedEntry[][]): string[] {
  const positions = new Map<string, { total: number; count: number }>()

  for (const history of histories) {
    const seen = new Set<string>()
    history.forEach((entry, index) => {
      if (seen.has(entry.step)) return
      seen.add(entry.step)
      const current = positions.get(entry.step) ?? { total: 0, count: 0 }
      current.total += index
      current.count += 1
      positions.set(entry.step, current)
    })
  }

  return [...positions.entries()]
    .sort((a, b) => a[1].total / a[1].count - b[1].total / b[1].count)
    .map(([step]) => step)
}

export async function buildIntakeFunnelReport(days: number): Promise<IntakeFunnelReport> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const leads: LeadRow[] = await prisma.intakeLead.findMany({
    where: { createdAt: { gte: since }, stepHistory: { not: null } },
    select: { stepHistory: true, currentStep: true, status: true, assessmentId: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_LEADS,
  })

  const histories: ParsedEntry[][] = []
  const reached = new Map<string, number>()
  const droppedHere = new Map<string, number>()
  const dwellSamples = new Map<string, number[]>()
  let completedLeads = 0

  for (const lead of leads) {
    const history = parseHistory(lead.stepHistory)
    if (history.length === 0) continue
    histories.push(history)

    // Completed means the wizard produced an assessment. `status` is the
    // client's own word for it and can lag; the foreign key cannot.
    const completed = Boolean(lead.assessmentId) || lead.status === 'completed'
    if (completed) completedLeads += 1

    const distinct = new Set(history.map((entry) => entry.step))
    for (const step of distinct) {
      reached.set(step, (reached.get(step) ?? 0) + 1)
    }

    // Time on a step is the gap until the next one. The final step has no
    // successor, so it has no measurable dwell — which is exactly the step the
    // claimant either abandoned or finished on.
    for (let i = 0; i < history.length - 1; i += 1) {
      const gap = history[i + 1].at - history[i].at
      if (gap <= 0 || gap > MAX_CREDIBLE_DWELL_MS) continue
      const step = history[i].step
      const samples = dwellSamples.get(step) ?? []
      samples.push(gap)
      dwellSamples.set(step, samples)
    }

    if (!completed) {
      // Where they stopped. Prefer the history's own last entry over
      // `currentStep`: the two are written together, but only the history is
      // append-only and so cannot have been overwritten by a later partial save.
      const lastStep = history[history.length - 1].step || lead.currentStep
      if (lastStep) droppedHere.set(lastStep, (droppedHere.get(lastStep) ?? 0) + 1)
    }
  }

  const steps: FunnelStep[] = inferStepOrder(histories).map((step) => {
    const stepReached = reached.get(step) ?? 0
    const stepDropped = droppedHere.get(step) ?? 0
    const samples = (dwellSamples.get(step) ?? []).sort((a, b) => a - b)
    const enoughToReport = samples.length >= MIN_SAMPLES_FOR_TIMING

    return {
      step,
      reached: stepReached,
      droppedHere: stepDropped,
      dropRate: stepReached > 0 ? stepDropped / stepReached : null,
      // Median rather than mean throughout. The distribution has a long right
      // tail even after the idle cap, and a mean reports the tail rather than
      // the typical claimant.
      medianSeconds: enoughToReport ? Math.round(percentile(samples, 0.5) / 1000) : null,
      p90Seconds: enoughToReport ? Math.round(percentile(samples, 0.9) / 1000) : null,
      timedSamples: samples.length,
    }
  })

  const worstDropOff = steps
    .filter((step) => step.dropRate != null && step.droppedHere > 0)
    .map((step) => ({ step: step.step, droppedHere: step.droppedHere, dropRate: step.dropRate as number }))
    .sort((a, b) => b.droppedHere - a.droppedHere)
    .slice(0, 5)

  const totalLeads = histories.length

  logger.info('Intake funnel report built', { days, totalLeads, steps: steps.length })

  return {
    periodDays: days,
    totalLeads,
    completedLeads,
    completionRate: totalLeads > 0 ? completedLeads / totalLeads : null,
    steps,
    worstDropOff,
  }
}
