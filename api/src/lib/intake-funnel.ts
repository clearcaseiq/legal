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

/**
 * The same funnel, for one kind of device.
 *
 * The wizard is a multi-step form with date pickers and file uploads, and none
 * of that behaves the same on a phone. Without this split, a phone abandoning
 * at the upload step and a desktop abandoning there are one number, so a layout
 * problem and a question problem look identical.
 */
export type DeviceFunnel = {
  device: string
  leads: number
  completedLeads: number
  completionRate: number | null
  /**
   * The step this device abandons on most, or null when too few did.
   *
   * One step rather than the full per-device funnel: the useful comparison is
   * "phones give up here, desktops give up there", and four complete funnels
   * side by side bury that in a table nobody reads.
   */
  worstStep: { step: string; droppedHere: number } | null
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
  /**
   * Completion by device, busiest first. Empty for any window predating the
   * `deviceType` column, which cannot be backfilled — the header it is derived
   * from is not kept.
   */
  byDevice: DeviceFunnel[]
  /**
   * The assessment as five stages, from opening it to sent-to-attorneys, for
   * visits that started in the window. See `computeStages`.
   */
  stages: StageFunnel
}

export type StageKey = 'started' | 'injuries' | 'review' | 'submitted' | 'qualified'

export type FunnelStage = {
  key: StageKey
  label: string
  count: number
  /** Share of the previous stage that reached this one, 0–1. Null for the first stage or an empty previous one. */
  fromPrevious: number | null
  /** Left between the previous stage and this one. */
  abandoned: number
}

export type StageBreakdown = { group: string; started: number; stages: FunnelStage[] }

export type StageFunnel = {
  stages: FunnelStage[]
  /** By the public page the visit entered the site on, busiest first. */
  byEntry: StageBreakdown[]
  byDevice: StageBreakdown[]
  /**
   * Leads created in the window with no visit to join to: resumed drafts, and
   * everything before visits were recorded. Counted, not folded in, so they
   * cannot inflate a stage beyond the visits that started it.
   */
  unlinkedLeads: number
}

const STAGE_LABELS: Record<StageKey, string> = {
  started: 'Started the assessment',
  injuries: 'Reached injuries and costs',
  review: 'Reached review',
  submitted: 'Generated their report',
  qualified: 'Sent to attorneys',
}

const STAGE_ORDER: StageKey[] = ['started', 'injuries', 'review', 'submitted', 'qualified']

/** Steps recorded on the injuries-and-costs screen, including sections folded into it and older names. */
const INJURIES_STEPS = new Set(['injury_severity', 'injury_details', 'financial_impact', 'legal_status', 'medical_treatment'])
/** The review screen, under its current and its older name. */
const REVIEW_STEPS = new Set(['consent', 'review'])

export type VisitInput = { landingPath: string | null; deviceType: string | null }
export type VisitOutcome = {
  steps: Set<string>
  submitted: boolean
  qualified: boolean
}

/**
 * Count each visit at the furthest stage it reached, and every stage before.
 *
 * Later stages imply earlier ones: a report cannot be generated without passing
 * review, so a visit whose step history missed a ping is still counted at every
 * stage up to where it demonstrably got. That keeps each stage a subset of the
 * one before, which is what makes the abandonment between them meaningful.
 */
export function stageCounts(outcomes: Array<VisitOutcome | null>): FunnelStage[] {
  const counts: Record<StageKey, number> = { started: 0, injuries: 0, review: 0, submitted: 0, qualified: 0 }
  for (const outcome of outcomes) {
    counts.started += 1
    if (!outcome) continue
    const qualified = outcome.qualified
    const submitted = qualified || outcome.submitted
    const review = submitted || [...outcome.steps].some((step) => REVIEW_STEPS.has(step))
    const injuries = review || [...outcome.steps].some((step) => INJURIES_STEPS.has(step))
    if (injuries) counts.injuries += 1
    if (review) counts.review += 1
    if (submitted) counts.submitted += 1
    if (qualified) counts.qualified += 1
  }

  return STAGE_ORDER.map((key, index) => {
    const previous = index === 0 ? null : counts[STAGE_ORDER[index - 1]]
    return {
      key,
      label: STAGE_LABELS[key],
      count: counts[key],
      fromPrevious: previous ? counts[key] / previous : null,
      abandoned: previous == null ? 0 : previous - counts[key],
    }
  })
}

/** Most entry pages see a handful of visits; beyond this many they are grouped. */
const MAX_ENTRY_GROUPS = 8

function entryGroup(landingPath: string | null): string {
  if (!landingPath) return 'Unknown'
  return landingPath === '/' ? 'Homepage' : landingPath
}

/** The stage funnel, overall and broken down by entry page and by device. */
export function computeStages(
  visits: Array<VisitInput & { outcome: VisitOutcome | null }>,
  unlinkedLeads: number,
): StageFunnel {
  const breakdown = (keyOf: (visit: VisitInput) => string) => {
    const groups = new Map<string, Array<VisitOutcome | null>>()
    for (const visit of visits) {
      const key = keyOf(visit)
      const list = groups.get(key) ?? []
      list.push(visit.outcome)
      groups.set(key, list)
    }
    return [...groups.entries()]
      .map(([group, outcomes]) => ({ group, started: outcomes.length, stages: stageCounts(outcomes) }))
      .sort((a, b) => b.started - a.started)
  }

  const byEntry = breakdown((visit) => entryGroup(visit.landingPath))
  // The long tail of SEO pages each send a few visits; one row for all of them
  // keeps the table about the pages that matter.
  if (byEntry.length > MAX_ENTRY_GROUPS) {
    const kept = byEntry.slice(0, MAX_ENTRY_GROUPS - 1)
    const rest = new Set(byEntry.slice(MAX_ENTRY_GROUPS - 1).map((row) => row.group))
    const restOutcomes = visits.filter((visit) => rest.has(entryGroup(visit.landingPath))).map((visit) => visit.outcome)
    kept.push({ group: 'Other pages', started: restOutcomes.length, stages: stageCounts(restOutcomes) })
    byEntry.splice(0, byEntry.length, ...kept)
  }

  return {
    stages: stageCounts(visits.map((visit) => visit.outcome)),
    byEntry,
    byDevice: breakdown((visit) => visit.deviceType || 'unknown'),
    unlinkedLeads,
  }
}

/** Postgres caps bind parameters, so long `IN` lists are read in slices. */
const IN_CHUNK = 5_000

async function buildStageFunnel(since: Date): Promise<StageFunnel> {
  const visits = await prisma.intakeVisit.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, landingPath: true, deviceType: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_LEADS,
  })

  const leadByVisit = new Map<string, { stepHistory: string | null; assessmentId: string | null }>()
  for (let i = 0; i < visits.length; i += IN_CHUNK) {
    const ids = visits.slice(i, i + IN_CHUNK).map((visit) => visit.id)
    const leads = await prisma.intakeLead.findMany({
      where: { visitId: { in: ids } },
      select: { visitId: true, stepHistory: true, assessmentId: true },
      orderBy: { createdAt: 'asc' },
    })
    // One lead per visit; the first one created is the visit's own.
    for (const lead of leads) {
      if (lead.visitId && !leadByVisit.has(lead.visitId)) leadByVisit.set(lead.visitId, lead)
    }
  }

  const assessmentIds = [...leadByVisit.values()].map((lead) => lead.assessmentId).filter((id): id is string => Boolean(id))
  const sent = new Set<string>()
  for (let i = 0; i < assessmentIds.length; i += IN_CHUNK) {
    const rows = await prisma.leadSubmission.findMany({
      where: { assessmentId: { in: assessmentIds.slice(i, i + IN_CHUNK) }, sourceType: 'plaintiff' },
      select: { assessmentId: true },
    })
    for (const row of rows) sent.add(row.assessmentId)
  }

  const unlinkedLeads = await prisma.intakeLead.count({ where: { createdAt: { gte: since }, visitId: null } })

  return computeStages(
    visits.map((visit) => {
      const lead = leadByVisit.get(visit.id)
      return {
        landingPath: visit.landingPath,
        deviceType: visit.deviceType,
        outcome: lead
          ? {
              steps: new Set(parseHistory(lead.stepHistory).map((entry) => entry.step)),
              submitted: Boolean(lead.assessmentId),
              qualified: Boolean(lead.assessmentId && sent.has(lead.assessmentId)),
            }
          : null,
      }
    }),
    unlinkedLeads,
  )
}

/**
 * Below this a device's completion rate is noise.
 *
 * A rate printed from four leads invites a redesign off two people who got
 * distracted, and it will be quoted in a meeting as though it were measured.
 */
const MIN_LEADS_FOR_DEVICE_RATE = 20

type LeadRow = {
  stepHistory: string | null
  currentStep: string | null
  status: string
  assessmentId: string | null
  deviceType: string | null
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
    select: {
      stepHistory: true,
      currentStep: true,
      status: true,
      assessmentId: true,
      deviceType: true,
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_LEADS,
  })

  const histories: ParsedEntry[][] = []
  const reached = new Map<string, number>()
  const droppedHere = new Map<string, number>()
  const dwellSamples = new Map<string, number[]>()
  const devices = new Map<string, DeviceTally>()
  let completedLeads = 0

  for (const lead of leads) {
    const history = parseHistory(lead.stepHistory)
    if (history.length === 0) continue
    histories.push(history)

    // Completed means the wizard produced an assessment. `status` is the
    // client's own word for it and can lag; the foreign key cannot.
    const completed = Boolean(lead.assessmentId) || lead.status === 'completed'
    if (completed) completedLeads += 1

    // Leads created before the column existed. Counting them as `unknown` would
    // put a bucket of pre-launch traffic beside the real ones and read as a
    // device rather than as an absence.
    const tally = lead.deviceType ? tallyFor(devices, lead.deviceType) : null
    if (tally) {
      tally.leads += 1
      if (completed) tally.completed += 1
    }

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
      if (lastStep) {
        droppedHere.set(lastStep, (droppedHere.get(lastStep) ?? 0) + 1)
        if (tally) tally.drops.set(lastStep, (tally.drops.get(lastStep) ?? 0) + 1)
      }
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
    byDevice: summariseDevices(devices),
    stages: await buildStageFunnel(since),
  }
}

type DeviceTally = { leads: number; completed: number; drops: Map<string, number> }

function tallyFor(devices: Map<string, DeviceTally>, device: string): DeviceTally {
  let tally = devices.get(device)
  if (!tally) {
    tally = { leads: 0, completed: 0, drops: new Map() }
    devices.set(device, tally)
  }
  return tally
}

function summariseDevices(devices: Map<string, DeviceTally>): DeviceFunnel[] {
  return [...devices.entries()]
    .map(([device, tally]) => {
      const [worst] = [...tally.drops.entries()].sort((a, b) => b[1] - a[1])
      return {
        device,
        leads: tally.leads,
        completedLeads: tally.completed,
        // Withheld rather than rounded from a handful of leads: a rate printed
        // off four people gets quoted as though it were measured.
        completionRate:
          tally.leads >= MIN_LEADS_FOR_DEVICE_RATE ? tally.completed / tally.leads : null,
        worstStep: worst ? { step: worst[0], droppedHere: worst[1] } : null,
      }
    })
    // Busiest first, so the device most claimants actually use leads the table
    // regardless of which one happens to convert worst.
    .sort((a, b) => b.leads - a.leads)
}
