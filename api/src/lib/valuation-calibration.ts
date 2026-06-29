/**
 * Valuation backtesting & calibration.
 *
 * Phase 2 of the roadmap: calibrate the heuristic engine's outputs against historical
 * settlement/verdict outcomes instead of hand-set intuition.
 *
 * This module is deterministic and interpretable:
 *   - `backtest()` replays the engine over labeled outcomes and reports how close the
 *     predicted settlement band was to reality (error, bias, band coverage), overall and
 *     per severity level.
 *   - `calibrate()` grid-searches a small set of scalar coefficients (see
 *     `valuation-config.ts`) to minimize error while keeping the p25..p75 band's coverage
 *     near its intended ~50%. It returns the recommended coefficients plus before/after
 *     metrics, so deploying calibration is an auditable config change — not a black box.
 *
 * No DB or network access here: callers supply labeled samples (e.g. via the
 * `calibrate-valuation` CLI, which reads a JSON dataset exported from CaseOutcome rows).
 */

import { predictViabilityHeuristic } from './prediction'
import { IDENTITY_CALIBRATION, type ValuationCalibration } from './valuation-config'

export interface OutcomeSample {
  /** Feature vector (output of computeFeatures) captured at prediction time. */
  features: any
  /** The actual resolved amount (gross settlement or verdict). */
  actualAmount: number
  outcomeType?: 'settlement' | 'verdict' | 'dismissed' | 'withdrawn'
}

export interface SeverityBreakdown {
  n: number
  medianAbsPctError: number
  bias: number
  bandCoverage: number
}

export interface BacktestMetrics {
  n: number
  /** Median absolute percentage error of the settlement median vs actual. */
  medianAbsPctError: number
  meanAbsPctError: number
  /** Median signed percentage error (positive = model over-predicts). */
  bias: number
  /** Fraction of actuals that fell within the predicted p25..p75 band. */
  bandCoverage: number
  bySeverity: Record<number, SeverityBreakdown>
}

export interface CalibrationResult {
  recommended: ValuationCalibration
  before: BacktestMetrics
  after: BacktestMetrics
  /** Number of grid candidates evaluated. */
  evaluated: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

/** Outcomes that carry a usable monetary resolution for scoring. */
function isScorable(s: OutcomeSample): boolean {
  const t = s.outcomeType ?? 'settlement'
  return (t === 'settlement' || t === 'verdict') && Number(s.actualAmount) > 0
}

/**
 * Replay the engine over labeled outcomes and compute calibration metrics under a given
 * coefficient set (defaults to identity).
 */
export function backtest(
  samples: OutcomeSample[],
  calibration: ValuationCalibration = IDENTITY_CALIBRATION,
): BacktestMetrics {
  const scorable = samples.filter(isScorable)
  const absPct: number[] = []
  const signedPct: number[] = []
  const covered: number[] = []
  const bySeverityBuckets: Record<number, { abs: number[]; signed: number[]; covered: number[] }> = {}

  for (const sample of scorable) {
    const actual = Number(sample.actualAmount)
    const pred = predictViabilityHeuristic(sample.features, calibration)
    const band = pred.value_bands.settlement
    const predicted = band.median
    const signed = (predicted - actual) / actual
    const abs = Math.abs(signed)
    const inBand = actual >= band.p25 && actual <= band.p75 ? 1 : 0

    absPct.push(abs)
    signedPct.push(signed)
    covered.push(inBand)

    const sev = Number(sample.features?.severity ?? 0)
    if (!bySeverityBuckets[sev]) bySeverityBuckets[sev] = { abs: [], signed: [], covered: [] }
    bySeverityBuckets[sev].abs.push(abs)
    bySeverityBuckets[sev].signed.push(signed)
    bySeverityBuckets[sev].covered.push(inBand)
  }

  const bySeverity: Record<number, SeverityBreakdown> = {}
  for (const [sev, b] of Object.entries(bySeverityBuckets)) {
    bySeverity[Number(sev)] = {
      n: b.abs.length,
      medianAbsPctError: median(b.abs),
      bias: median(b.signed),
      bandCoverage: mean(b.covered),
    }
  }

  return {
    n: scorable.length,
    medianAbsPctError: median(absPct),
    meanAbsPctError: mean(absPct),
    bias: median(signedPct),
    bandCoverage: mean(covered),
    bySeverity,
  }
}

export interface CalibrationOptions {
  /** Target fraction of actuals that should land inside p25..p75. */
  coverageTarget?: number
  /** How strongly to penalize coverage deviation relative to error. */
  coveragePenalty?: number
  settlementScaleGrid?: number[]
  bandWidthScaleGrid?: number[]
  version?: string
}

function range(start: number, end: number, step: number): number[] {
  const out: number[] = []
  for (let v = start; v <= end + 1e-9; v += step) out.push(Number(v.toFixed(4)))
  return out
}

/**
 * Grid-search scalar coefficients that minimize median absolute error while keeping band
 * coverage near target. Returns the recommended calibration plus before/after metrics.
 */
export function calibrate(samples: OutcomeSample[], options: CalibrationOptions = {}): CalibrationResult {
  const coverageTarget = options.coverageTarget ?? 0.5
  const coveragePenalty = options.coveragePenalty ?? 0.5
  const settlementGrid = options.settlementScaleGrid ?? range(0.6, 1.6, 0.05)
  const bandGrid = options.bandWidthScaleGrid ?? range(0.8, 1.8, 0.1)

  const before = backtest(samples, IDENTITY_CALIBRATION)

  let best: ValuationCalibration = { ...IDENTITY_CALIBRATION }
  let bestScore = Number.POSITIVE_INFINITY
  let bestMetrics = before
  let evaluated = 0

  for (const settlementScale of settlementGrid) {
    for (const bandWidthScale of bandGrid) {
      const candidate: ValuationCalibration = {
        version: options.version ?? `cal-${new Date().toISOString().slice(0, 10)}`,
        settlementScale,
        // Trial tracks settlement scaling by default (same systematic bias correction).
        trialScale: settlementScale,
        severityAnchorScale: {},
        bandWidthScale,
      }
      const m = backtest(samples, candidate)
      evaluated += 1
      // Objective: error + penalty for missing the coverage target.
      const score = m.medianAbsPctError + coveragePenalty * Math.abs(m.bandCoverage - coverageTarget)
      if (score < bestScore) {
        bestScore = score
        best = candidate
        bestMetrics = m
      }
    }
  }

  return { recommended: best, before, after: bestMetrics, evaluated }
}
