/**
 * Turning the text we already hold into PI segmentation signals.
 *
 * Before buying court-filing data or crawling anything, there is signal sitting
 * in fields already in the database: staged practice areas from the bar roll and
 * directory scrapes, firm practice-area lists, and firm names themselves.
 *
 * The valuable part is side detection. Plaintiff and defense firms both say
 * "personal injury", but they describe themselves differently in ways that are
 * hard to disguise because they are aimed at different customers:
 *
 *   - Defense firms name their actual client: insurers, carriers, self-insured
 *     employers. "Insurance defense" is not a phrase a plaintiff firm uses.
 *   - Plaintiff firms advertise contingency fees, because that is their entire
 *     pitch to an individual who cannot pay hourly. Defense firms bill hourly and
 *     never say it.
 *
 * So a firm calling itself "Insurance Defense and Coverage Litigation" is
 * classifiable today with no external data at all. That matters because a
 * defense firm scoring highly on "personal injury" is exactly the failure mode
 * that sends a claimant to their opponent's lawyer.
 *
 * Text matching is deliberately conservative: it returns null rather than
 * guessing, because a wrong side call is worse than no side call.
 */

import {
  normalizePracticeAreas,
  parsePracticeAreaText,
  type IncidentType,
} from './practice-area-normalize'
import type { SegmentSignal, SignalSource } from './pi-segmentation'

/**
 * Phrases that identify who the firm works for.
 *
 * Each entry is matched against normalized lowercase text. Ordered longest-first
 * at match time so "insurance defense" wins over a bare "insurance".
 */
const DEFENSE_MARKERS: readonly string[] = [
  'insurance defense',
  'insurance carrier',
  'civil defense',
  'defense litigation',
  'defense counsel',
  'liability defense',
  'claims defense',
  'litigation defense',
  'coverage counsel',
  'coverage litigation',
  'coverage dispute',
  'bad faith defense',
  'self-insured',
  'self insured',
  'third-party administrator',
  'risk management',
  'represent insurers',
  'representing insurers',
  'carrier defense',
  'premises liability defense',
  'products liability defense',
  'medical malpractice defense',
  'trucking defense',
  'employer defense',
  'defense of personal injury',
  'defending personal injury',
]

const PLAINTIFF_MARKERS: readonly string[] = [
  'plaintiff',
  "plaintiff's",
  'plaintiffs',
  'claimant',
  'injury victim',
  'injured victim',
  'accident victim',
  'victims of',
  'represent the injured',
  'representing the injured',
  'for the injured',
  'injured worker',
  // A contingency pitch is aimed at someone who cannot pay hourly, which is the
  // plaintiff side by definition. Defense work is billed hourly.
  'contingency fee',
  'no fee unless',
  'no fee if',
  'no recovery no fee',
  'no win no fee',
  'free consultation for injury',
]

/**
 * Bar organizations that admit only one side. Membership is paid and publicly
 * listed, which makes it one of the cleaner side signals available.
 */
const PLAINTIFF_ORGS: readonly string[] = [
  'consumer attorneys of california',
  'caoc',
  'consumer attorneys association of los angeles',
  'caala',
  'american association for justice',
  'aaj',
  'association of trial lawyers',
  'atla',
  'orange county trial lawyers',
  'octla',
  'san diego consumer attorneys',
  'consumer attorneys of san diego',
  'capital city trial lawyers',
  'trial lawyers association',
]

const DEFENSE_ORGS: readonly string[] = [
  'association of southern california defense counsel',
  'ascdc',
  'association of defense counsel of northern california',
  'adcnc',
  'defense research institute',
  'dri',
  'claims and litigation management alliance',
  'clm',
  'federation of defense and corporate counsel',
  'fdcc',
  'alfa international',
  'uslaw network',
]

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function findMarker(text: string, markers: readonly string[]): string | null {
  // Longest first, so a specific phrase beats a substring of itself.
  const ordered = [...markers].sort((a, b) => b.length - a.length)
  for (const marker of ordered) {
    if (text.includes(marker)) return marker
  }
  return null
}

export type SideClassification = {
  side: 'plaintiff' | 'defense' | null
  /** The phrase that decided it, for the audit trail. */
  matched: string | null
  /** True when the text contains markers for both sides. */
  conflicting: boolean
}

/**
 * Read plaintiff/defense side out of free text such as a practice-area label,
 * firm name, or tagline.
 *
 * Returns null unless the text says something specific. A firm that only says
 * "personal injury" genuinely has not told us which side it is on, and inventing
 * an answer would be worse than admitting that.
 *
 * When both sides appear, defense wins. A firm mentioning defense work at all is
 * a conflict risk on a claimant case, and it is the more consequential mistake
 * to miss.
 */
export function classifySideFromText(value: string | null | undefined): SideClassification {
  if (!value) return { side: null, matched: null, conflicting: false }

  const text = normalizeText(value)
  const defenseMatch = findMarker(text, DEFENSE_MARKERS)
  const plaintiffMatch = findMarker(text, PLAINTIFF_MARKERS)

  if (defenseMatch && plaintiffMatch) {
    return { side: 'defense', matched: defenseMatch, conflicting: true }
  }
  if (defenseMatch) return { side: 'defense', matched: defenseMatch, conflicting: false }
  if (plaintiffMatch) return { side: 'plaintiff', matched: plaintiffMatch, conflicting: false }
  return { side: null, matched: null, conflicting: false }
}

/**
 * Classify a bar-association name as plaintiff- or defense-only, or null when the
 * organization admits both (a county bar, a state bar section).
 */
export function classifyAssociation(name: string | null | undefined): 'plaintiff' | 'defense' | null {
  if (!name) return null
  const text = normalizeText(name)

  // Acronyms are matched as whole words so "dri" does not fire inside "driving".
  const matchesOrg = (org: string): boolean =>
    org.length <= 5
      ? new RegExp(`\\b${org}\\b`).test(text)
      : text.includes(org)

  if (DEFENSE_ORGS.some(matchesOrg)) return 'defense'
  if (PLAINTIFF_ORGS.some(matchesOrg)) return 'plaintiff'
  return null
}

export type DerivedSignals = {
  signals: SegmentSignal[]
  /** Incident types the practice areas map to. */
  subtypes: IncidentType[]
  /** True when practice-area text mentioned PI at all. */
  mentionsPi: boolean
}

/**
 * Build signals from a practice-area list plus any free text describing the
 * entity (firm name, tagline, bio).
 *
 * Emits at most one signal per source, aggregating the PI practice areas into a
 * single row with a `count`, because ten PI practice-area labels on one website
 * is still one website saying so.
 */
export function derivePiSignals(input: {
  /** Raw practice areas: JSON array string, delimited string, or list. */
  practiceAreas?: string | string[] | null
  /** Extra text to scan for side markers: firm name, tagline, description. */
  sideText?: (string | null | undefined)[]
  source: SignalSource
  observedAt?: Date | string | null
  sourceRef?: string | null
}): DerivedSignals {
  const labels = Array.isArray(input.practiceAreas)
    ? input.practiceAreas
    : parsePracticeAreaText(input.practiceAreas ?? null)

  const normalized = normalizePracticeAreas(labels)
  const subtypes = normalized.incidentTypes
  const mentionsPi = subtypes.length > 0

  // Side comes from the practice-area labels themselves plus any supplied text.
  // "Insurance Defense" arrives as a practice area far more often than in a name.
  const sideCandidates = [...labels, ...(input.sideText ?? [])]
  let side: 'plaintiff' | 'defense' | null = null
  let matched: string | null = null
  for (const candidate of sideCandidates) {
    const result = classifySideFromText(candidate)
    if (!result.side) continue
    // Defense is sticky once seen; see classifySideFromText.
    if (result.side === 'defense') {
      side = 'defense'
      matched = result.matched
      break
    }
    if (!side) {
      side = result.side
      matched = result.matched
    }
  }

  const signals: SegmentSignal[] = []

  if (mentionsPi) {
    signals.push({
      source: input.source,
      kind: 'pi_practice_area',
      side,
      subtype: subtypes[0] ?? null,
      count: subtypes.length,
      observedAt: input.observedAt ?? null,
      sourceRef: input.sourceRef ?? null,
      // Record the labels that matched, so a reviewer can see what the score was
      // built from rather than trusting the number.
      value: normalized.matchedLabels.join('; ') || null,
    })
  }

  // A side marker is worth recording even when no PI practice area was listed:
  // knowing a firm does insurance defense is what keeps claimants away from it,
  // whether or not it advertises "personal injury".
  if (side && matched) {
    signals.push({
      source: input.source,
      kind: side === 'defense' ? 'defense_side_marker' : 'plaintiff_side_marker',
      side,
      observedAt: input.observedAt ?? null,
      sourceRef: input.sourceRef ?? null,
      // Side markers say which side, not how much PI work. Contributing full
      // source weight would let a single phrase imply a whole practice.
      weight: 0.15,
      value: matched,
    })
  }

  return { signals, subtypes, mentionsPi }
}

/**
 * Which signal source a staged `production_attorneys` row should count as.
 *
 * The bar roll is the attorney's own annual filing with their regulator, which is
 * more accountable than a directory a marketing team populated, so it earns the
 * heavier `bar_record` weight.
 */
export function sourceForStagedRow(source: string | null | undefined): SignalSource {
  const value = (source ?? '').toLowerCase()
  if (value.includes('bar') || value.includes('calbar') || value.includes('state_bar')) {
    return 'bar_record'
  }
  return 'directory'
}
