/**
 * What the valuation engine makes of the documents a case is missing.
 *
 * The dashboard's "increase your case value" list used to rank these itself,
 * with a High/Medium/Low badge written by hand — wage proof was always "Low",
 * a police report always "High" — and alongside it computed a range of
 * `settlementHigh * 1.25` to `* 1.8` as the value the case could reach. That
 * range was never rendered, but it could not have been rendered honestly
 * either: documentation is applied downward only in the engine, so a document
 * raises the floor of the band toward a ceiling that does not move. Advertising
 * a ceiling up to 80% higher was a promise nothing could keep.
 *
 * Nothing here computes a value. It reads the weights the engine already
 * publishes on `latest_prediction.underwriting.documentationUpside`.
 */

export interface DocumentationUpsideItem {
  label: string
  points: number
  projectedLow: number
}

export interface DocumentationUpside {
  currentLow: number
  ceiling: number
  fullyDocumentedLow: number
  items: DocumentationUpsideItem[]
}

/**
 * Dashboard row key to the engine's own label for that gap.
 *
 * A row whose key the engine did not report as a gap is not scored for this
 * claim type, and the dashboard drops it. That matters beyond tidiness: the
 * engine credits an incident report on motor-vehicle and premises claims only,
 * so a med-mal claimant was being asked for a police report that could not have
 * changed their valuation even if they had produced one.
 */
const ENGINE_LABELS = {
  medicalRecords: 'Medical records',
  medicalBills: 'Medical bills',
  policeReport: 'Police or incident report',
  wageProof: 'Wage proof',
  photos: 'Photos',
  dailyImpact: 'Daily impact statement',
} as const

export type DocumentRowKey = keyof typeof ENGINE_LABELS

/**
 * Read the engine's payload, or return null.
 *
 * Stored predictions written before this field existed will not carry it, so
 * the shape is checked rather than assumed.
 */
export function parseDocumentationUpside(raw: unknown): DocumentationUpside | null {
  const value = raw as DocumentationUpside | null | undefined
  if (!value || typeof value !== 'object') return null
  if (typeof value.ceiling !== 'number' || typeof value.currentLow !== 'number') return null
  if (!Array.isArray(value.items)) return null
  return value
}

/**
 * What the engine scores this document at for this case, or null if it does not
 * score it at all.
 */
export function documentationWeight(
  upside: DocumentationUpside | null,
  key: DocumentRowKey,
): number | null {
  if (!upside) return null

  const item = upside.items.find((candidate) => candidate.label === ENGINE_LABELS[key])
  return item ? item.points : null
}

/**
 * The engine's weights, banded for display.
 *
 * The thresholds sit on the engine's own point scale — medical records 25,
 * bills and an incident report 20, a daily-impact statement 15, photos and wage
 * proof 10 — so the badge moves when the model's weighting moves rather than
 * when someone edits a literal on the dashboard.
 */
export function impactLabel(points: number): 'High' | 'Medium' | 'Low' {
  if (points >= 20) return 'High'
  if (points >= 15) return 'Medium'
  return 'Low'
}
