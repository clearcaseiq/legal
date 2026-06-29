/**
 * Valuation calibration coefficients.
 *
 * The heuristic engine's constants (severity anchors, compression, etc.) are hand-set.
 * Phase 2 of the roadmap calibrates the engine against historical settlement/verdict
 * outcomes. Rather than rewrite the hand-set constants in place (which would erase their
 * explainability), calibration is expressed as a small, interpretable set of *scalar
 * coefficients* applied on top of the existing model:
 *
 *   - settlementScale / trialScale : global multipliers on the median outputs
 *   - severityAnchorScale          : per-severity-level multiplier on the floor anchor
 *   - bandWidthScale               : widens/narrows the p25..p75 band around the median
 *
 * The DEFAULT is identity (all 1.0), so an uncalibrated deployment reproduces the exact
 * prior behavior and all existing tests pass. Calibration output (see
 * `valuation-calibration.ts`) produces a new coefficient set; deploying it is a config
 * change, not a code change, which keeps the loop auditable.
 *
 * Resolution order: explicit override (set in-process, e.g. by tests/CLI) →
 * `VALUATION_CALIBRATION` env JSON → `api/data/valuation-calibration.json` file → identity.
 */

import fs from 'fs'
import path from 'path'
import { logger } from './logger'

export interface ValuationCalibration {
  version: string
  settlementScale: number
  trialScale: number
  /** Per-severity-level (0-4) multiplier on the severity floor anchor. */
  severityAnchorScale: Partial<Record<number, number>>
  /** Multiplier on band half-width around the median (1 = unchanged). */
  bandWidthScale: number
}

export const IDENTITY_CALIBRATION: ValuationCalibration = {
  version: 'identity',
  settlementScale: 1,
  trialScale: 1,
  severityAnchorScale: {},
  bandWidthScale: 1,
}

function coerce(raw: Partial<ValuationCalibration> | null | undefined): ValuationCalibration {
  if (!raw || typeof raw !== 'object') return IDENTITY_CALIBRATION
  const num = (v: unknown, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const anchorScale: Record<number, number> = {}
  if (raw.severityAnchorScale && typeof raw.severityAnchorScale === 'object') {
    for (const [k, v] of Object.entries(raw.severityAnchorScale)) {
      const lvl = Number(k)
      const scale = Number(v)
      if (Number.isFinite(lvl) && Number.isFinite(scale) && scale > 0) anchorScale[lvl] = scale
    }
  }
  return {
    version: typeof raw.version === 'string' ? raw.version : 'custom',
    settlementScale: num(raw.settlementScale, 1),
    trialScale: num(raw.trialScale, 1),
    severityAnchorScale: anchorScale,
    bandWidthScale: num(raw.bandWidthScale, 1),
  }
}

let override: ValuationCalibration | null = null
let cached: ValuationCalibration | null = null

function loadFromEnvOrFile(): ValuationCalibration {
  const fromEnv = process.env.VALUATION_CALIBRATION
  if (fromEnv) {
    try {
      return coerce(JSON.parse(fromEnv))
    } catch (err) {
      logger.warn('Invalid VALUATION_CALIBRATION env JSON; using identity', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  const filePath = path.resolve(__dirname, '../../data/valuation-calibration.json')
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      return coerce(parsed)
    }
  } catch (err) {
    logger.warn('Failed to read valuation-calibration.json; using identity', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
  return IDENTITY_CALIBRATION
}

/** Current calibration coefficients (identity unless configured). Cached after first read. */
export function getValuationCalibration(): ValuationCalibration {
  if (override) return override
  if (!cached) cached = loadFromEnvOrFile()
  return cached
}

/** Inject a calibration in-process (used by the calibration CLI and unit tests). */
export function setValuationCalibration(calibration: ValuationCalibration | null): void {
  override = calibration ? coerce(calibration) : null
}

/** Clear cache + override (test helper). */
export function resetValuationCalibration(): void {
  override = null
  cached = null
}

export function isIdentity(c: ValuationCalibration): boolean {
  return (
    c.settlementScale === 1 &&
    c.trialScale === 1 &&
    c.bandWidthScale === 1 &&
    Object.keys(c.severityAnchorScale).length === 0
  )
}
