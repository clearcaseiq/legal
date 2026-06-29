/**
 * Treatment chronology & gaps-in-care analysis.
 *
 * The legacy model treats treatment as a flat count (`treatment.length`, "each entry ≈
 * one month"), which is chronology-blind. This module derives a real timeline from
 * treatment dates: how soon care started after the incident, how long it continued,
 * and whether there were gaps in care.
 *
 * Why it matters for value:
 *  - Continuous, consistent treatment over a meaningful period is a value BUILDER.
 *  - A long delay before first treatment, or large gaps mid-treatment, are classic
 *    value REDUCERS (the defense argues the injury wasn't serious or wasn't caused by
 *    the incident).
 *
 * It is deterministic and explainable. When treatment entries have no usable dates it
 * returns a neutral, no-op result (modifier = 1.0) so existing behavior is unchanged.
 */

export interface ChronologyAnalysis {
  hasDates: boolean
  visitCount: number
  firstDate: string | null
  lastDate: string | null
  durationDays: number
  /** Days from incident to first treatment (null if incident date unknown). */
  treatmentOnsetDays: number | null
  largestGapDays: number
  /** Number of consecutive-visit gaps longer than GAP_THRESHOLD_DAYS. */
  gapCount: number
  continuity: 'continuous' | 'sporadic' | 'gapped' | 'unknown'
  /** Multiplier applied to settlement value. 1.0 when no dated treatment. */
  modifier: number
  factors: string[]
}

// A gap longer than this between consecutive visits reads as a "gap in care".
const GAP_THRESHOLD_DAYS = 45
// Treatment starting later than this after the incident weakens causation.
const ONSET_DELAY_DAYS = 30
const ONSET_LARGE_DELAY_DAYS = 90

const NEUTRAL: ChronologyAnalysis = {
  hasDates: false,
  visitCount: 0,
  firstDate: null,
  lastDate: null,
  durationDays: 0,
  treatmentOnsetDays: null,
  largestGapDays: 0,
  gapCount: 0,
  continuity: 'unknown',
  modifier: 1,
  factors: [],
}

function parseDate(value: unknown): number | null {
  if (!value) return null
  // Accept Date, epoch numbers, and common ISO/US date strings.
  const d = value instanceof Date ? value : new Date(String(value))
  const t = d.getTime()
  return Number.isFinite(t) ? t : null
}

function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(b - a) / 86_400_000)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Pull a usable timestamp from a treatment entry, trying common date fields. */
function entryDate(entry: any): number | null {
  return (
    parseDate(entry?.date) ??
    parseDate(entry?.startDate) ??
    parseDate(entry?.visitDate) ??
    parseDate(entry?.treatmentDate) ??
    null
  )
}

export function analyzeTreatmentChronology(facts: any): ChronologyAnalysis {
  const treatment: any[] = Array.isArray(facts?.treatment) ? facts.treatment : []
  if (treatment.length === 0) return NEUTRAL

  const incidentTs = parseDate(facts?.incident?.date)
  const timestamps = treatment
    .map(entryDate)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)

  // Need at least two dated visits to reason about chronology; otherwise stay neutral.
  if (timestamps.length < 2) {
    if (timestamps.length === 1 && incidentTs !== null) {
      const onset = daysBetween(incidentTs, timestamps[0])
      const factors: string[] = []
      let modifier = 1
      if (onset > ONSET_LARGE_DELAY_DAYS) {
        modifier = 0.94
        factors.push(`First treatment ${onset} days after incident — delayed onset weakens causation`)
      } else if (onset > ONSET_DELAY_DAYS) {
        modifier = 0.97
        factors.push(`First treatment ${onset} days after incident`)
      }
      return { ...NEUTRAL, hasDates: true, visitCount: 1, treatmentOnsetDays: onset, modifier, factors }
    }
    return NEUTRAL
  }

  const firstTs = timestamps[0]
  const lastTs = timestamps[timestamps.length - 1]
  const durationDays = daysBetween(firstTs, lastTs)
  const treatmentOnsetDays = incidentTs !== null ? daysBetween(incidentTs, firstTs) : null

  let largestGapDays = 0
  let gapCount = 0
  for (let i = 1; i < timestamps.length; i++) {
    const gap = daysBetween(timestamps[i - 1], timestamps[i])
    if (gap > largestGapDays) largestGapDays = gap
    if (gap > GAP_THRESHOLD_DAYS) gapCount += 1
  }

  const factors: string[] = []
  let modifier = 1

  // Continuity classification.
  let continuity: ChronologyAnalysis['continuity']
  if (gapCount === 0 && durationDays >= 60) {
    continuity = 'continuous'
    modifier += clamp(durationDays / 365, 0, 1) * 0.08 // up to +0.08 for ~a year of consistent care
    factors.push(`Consistent treatment over ${durationDays} days with no significant gaps`)
  } else if (gapCount >= 2 || largestGapDays > 90) {
    continuity = 'gapped'
    modifier -= clamp(0.04 + gapCount * 0.02, 0, 0.1)
    factors.push(`${gapCount} gap(s) in care (largest ${largestGapDays} days) — weakens treatment narrative`)
  } else {
    continuity = 'sporadic'
    if (largestGapDays > GAP_THRESHOLD_DAYS) {
      factors.push(`Gap of ${largestGapDays} days between visits`)
    }
  }

  // Onset delay penalty (independent of gaps).
  if (treatmentOnsetDays !== null) {
    if (treatmentOnsetDays > ONSET_LARGE_DELAY_DAYS) {
      modifier -= 0.06
      factors.push(`First treatment ${treatmentOnsetDays} days after incident — delayed onset weakens causation`)
    } else if (treatmentOnsetDays > ONSET_DELAY_DAYS) {
      modifier -= 0.03
      factors.push(`First treatment ${treatmentOnsetDays} days after incident`)
    } else if (treatmentOnsetDays <= 7) {
      modifier += 0.02
      factors.push('Prompt treatment within a week of incident')
    }
  }

  modifier = clamp(modifier, 0.85, 1.1)

  return {
    hasDates: true,
    visitCount: timestamps.length,
    firstDate: new Date(firstTs).toISOString().slice(0, 10),
    lastDate: new Date(lastTs).toISOString().slice(0, 10),
    durationDays,
    treatmentOnsetDays,
    largestGapDays,
    gapCount,
    continuity,
    modifier,
    factors,
  }
}
