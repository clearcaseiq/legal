/**
 * Personal-injury segmentation: deciding which attorneys and firms actually
 * practise plaintiff-side PI, and how sure we are.
 *
 * California certifies legal specialties in a handful of fields, and personal
 * injury is not one of them. There is no list to look up. So PI practice has to
 * be inferred from evidence, and the inference has to be auditable: a firm that
 * gets excluded from leads deserves a reason we can show them.
 *
 * Three ideas drive the design.
 *
 * **Behaviour outranks self-description.** Anyone can put "Personal Injury" on a
 * website; filing a hundred PI complaints is costly and hard to fake. Signal
 * weights in `SIGNAL_WEIGHTS` are ordered accordingly, and no amount of
 * self-reported evidence alone can reach high confidence.
 *
 * **Side is not a detail, it is the whole point.** Plaintiff and defense firms
 * both "practise personal injury". Routing a claimant to an insurer-side defense
 * firm is worse than not routing at all — it wastes the claimant's time and
 * damages our credibility. Defense evidence is therefore treated as
 * disqualifying for plaintiff work, not merely as absent plaintiff evidence.
 *
 * **Practices change.** A firm that filed PI cases in 2015 may do employment law
 * now. Every signal decays with age, so a stale profile drifts back toward
 * unknown rather than staying confidently wrong.
 *
 * This module is pure: it takes signals and returns a score. Gathering signals
 * and persisting results happen elsewhere, so scoring can be re-run over stored
 * evidence whenever the weights change.
 */

import type { IncidentType } from './practice-area-normalize'

/** Bump when the algorithm changes, so stored scores can be identified and re-run. */
export const PI_SCORE_VERSION = 'pi-seg-v1'

/**
 * Where a signal came from. Ordered roughly by how hard it is to fabricate.
 *
 * `court_filing`   Docket records naming the attorney or firm as counsel.
 * `association`    Membership of a plaintiff- or defense-only bar organization.
 * `bar_record`     Practice area/sector the attorney reported to the State Bar.
 * `gbp`            Google Business Profile primary category.
 * `paid_search`    Bidding on PI intent keywords.
 * `website`        Practice-area pages on the firm's own site.
 * `directory`      Third-party legal directory listing.
 * `manual`         A human reviewer's determination.
 */
export type SignalSource =
  | 'court_filing'
  | 'association'
  | 'bar_record'
  | 'gbp'
  | 'paid_search'
  | 'website'
  | 'directory'
  | 'manual'

/** Which side of the aisle a signal points to, when it points at all. */
export type PiSide = 'plaintiff' | 'defense' | 'both' | 'unknown'

export type SegmentSignal = {
  source: SignalSource
  /** Specific evidence kind, e.g. "pi_complaint_filed", "caoc_member". Free-form, for the audit trail. */
  kind: string
  /** Side this evidence implies, if any. */
  side?: 'plaintiff' | 'defense' | null
  /** Incident type this evidence is specific to, if any. */
  subtype?: IncidentType | null
  /** When the evidence was observed or dated. Older evidence counts for less. */
  observedAt?: Date | string | null
  /**
   * How many times this evidence was seen — e.g. 40 PI complaints filed. Repeat
   * observations add weight with diminishing returns, so volume matters but does
   * not run away.
   */
  count?: number | null
  /** Optional per-signal weight override. Use sparingly; prefer tuning SIGNAL_WEIGHTS. */
  weight?: number | null
  /**
   * The raw evidence, verbatim — the practice-area labels seen, the phrase that
   * decided the side. Not used in scoring; it exists so a reviewer can judge
   * whether the inference was reasonable instead of taking the score on faith.
   */
  value?: string | null
  /** URL, docket number, or other pointer, so a human can check the claim. */
  sourceRef?: string | null
}

/**
 * Base weight per source, before recency decay and volume adjustment.
 *
 * These are deliberately spread wide. A court filing is worth roughly six
 * website mentions, because a website mention costs nothing and a filing is a
 * matter of public record with a real client behind it.
 *
 * `manual` sits highest: a human who has looked into a firm should be able to
 * settle the question, and their decision should not be quietly outvoted.
 */
export const SIGNAL_WEIGHTS: Record<SignalSource, number> = {
  manual: 4.0,
  court_filing: 1.2,
  association: 1.0,
  bar_record: 0.6,
  gbp: 0.5,
  paid_search: 0.4,
  website: 0.25,
  directory: 0.2,
}

/**
 * Sources that are the subject describing themselves. Corroboration from these
 * alone is not corroboration — a firm's website, its directory listings and its
 * ad spend all originate with the firm.
 */
const SELF_REPORTED: ReadonlySet<SignalSource> = new Set<SignalSource>([
  'website',
  'directory',
  'paid_search',
  'bar_record',
])

/** Evidence half-life. A signal this old counts half as much as a fresh one. */
const HALF_LIFE_YEARS = 3

/**
 * Controls how quickly accumulated weight saturates toward a score of 1.
 * Tuned so a single court filing lands near 0.4 (suggestive, not conclusive)
 * and a handful of corroborating signals reach the high 0.8s.
 */
const SATURATION_K = 2.0

/** Below this total weight there is not enough evidence to call a side. */
const SIDE_MIN_WEIGHT = 0.3

/** A side needs this share of side-bearing weight to be called outright. */
const SIDE_DOMINANCE = 0.8

export type SegmentScore = {
  /** 0-1 confidence that this entity practises personal injury at all. */
  piScore: number
  side: PiSide
  /** 0-1 confidence in the `side` call specifically. */
  sideConfidence: number
  /** Incident types the evidence points to, most-supported first. */
  subtypes: IncidentType[]
  confidence: 'none' | 'low' | 'medium' | 'high'
  /** Human-readable explanation, one line per factor. Shown to reviewers. */
  rationale: string[]
  /** Diagnostics, kept for tuning and for the audit trail. */
  breakdown: {
    totalWeight: number
    plaintiffWeight: number
    defenseWeight: number
    signalCount: number
    distinctSources: number
    independentSources: number
    newestObservedAt: string | null
  }
  scoreVersion: string
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Age decay. Signals with no date are treated as one half-life old rather than
 * as fresh — an undated observation should not outrank a dated recent one.
 */
function decayFactor(observedAt: Date | null, now: Date): number {
  if (!observedAt) return 0.5
  const years = (now.getTime() - observedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (years <= 0) return 1
  return Math.pow(0.5, years / HALF_LIFE_YEARS)
}

/**
 * Volume multiplier with diminishing returns. Forty PI filings should outweigh
 * one, but not by forty times — past a point the extra filings tell us nothing
 * new about whether this is a PI practice.
 */
function volumeFactor(count: number | null | undefined): number {
  const n = Math.max(1, Math.floor(count ?? 1))
  if (n === 1) return 1
  return 1 + Math.log10(n)
}

function saturate(weight: number): number {
  if (weight <= 0) return 0
  return 1 - Math.exp(-weight / SATURATION_K)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Score an entity's PI practice from its evidence.
 *
 * `now` is injectable so tests and backfills are deterministic.
 */
export function scoreSegment(signals: readonly SegmentSignal[], now: Date = new Date()): SegmentScore {
  const rationale: string[] = []

  if (signals.length === 0) {
    return {
      piScore: 0,
      side: 'unknown',
      sideConfidence: 0,
      subtypes: [],
      confidence: 'none',
      rationale: ['No evidence on file.'],
      breakdown: {
        totalWeight: 0,
        plaintiffWeight: 0,
        defenseWeight: 0,
        signalCount: 0,
        distinctSources: 0,
        independentSources: 0,
        newestObservedAt: null,
      },
      scoreVersion: PI_SCORE_VERSION,
    }
  }

  let totalWeight = 0
  let plaintiffWeight = 0
  let defenseWeight = 0
  let newestObservedAt: Date | null = null

  const sources = new Set<SignalSource>()
  const weightBySource = new Map<SignalSource, number>()
  const subtypeWeight = new Map<IncidentType, number>()

  for (const signal of signals) {
    const base = signal.weight ?? SIGNAL_WEIGHTS[signal.source] ?? 0
    if (base <= 0) continue

    const observedAt = toDate(signal.observedAt)
    if (observedAt && (!newestObservedAt || observedAt > newestObservedAt)) {
      newestObservedAt = observedAt
    }

    const effective = base * decayFactor(observedAt, now) * volumeFactor(signal.count)

    totalWeight += effective
    sources.add(signal.source)
    weightBySource.set(signal.source, (weightBySource.get(signal.source) ?? 0) + effective)

    if (signal.side === 'plaintiff') plaintiffWeight += effective
    else if (signal.side === 'defense') defenseWeight += effective

    if (signal.subtype) {
      subtypeWeight.set(signal.subtype, (subtypeWeight.get(signal.subtype) ?? 0) + effective)
    }
  }

  const piScore = saturate(totalWeight)

  // Independent sources exclude the self-reported cluster, which all traces back
  // to the firm itself and so cannot corroborate anything.
  const independentSources = Array.from(sources).filter((source) => !SELF_REPORTED.has(source))

  const { side, sideConfidence } = classifySide(plaintiffWeight, defenseWeight)

  const confidence = gradeConfidence(totalWeight, independentSources.length)

  // Rationale, strongest contributors first, so a reviewer sees why immediately.
  const rankedSources = Array.from(weightBySource.entries()).sort((a, b) => b[1] - a[1])
  for (const [source, weight] of rankedSources) {
    rationale.push(`${describeSource(source)} contributed ${round(weight)} weight.`)
  }

  if (side === 'plaintiff') {
    rationale.push(`Plaintiff-side: ${round(plaintiffWeight)} plaintiff vs ${round(defenseWeight)} defense weight.`)
  } else if (side === 'defense') {
    rationale.push(
      `Defense-side: ${round(defenseWeight)} defense vs ${round(plaintiffWeight)} plaintiff weight. ` +
        'Not eligible for claimant leads.'
    )
  } else if (side === 'both') {
    rationale.push(
      `Mixed practice: ${round(plaintiffWeight)} plaintiff vs ${round(defenseWeight)} defense weight. ` +
        'Needs human review before claimant leads.'
    )
  } else {
    rationale.push('No side-bearing evidence, so plaintiff or defense is undetermined.')
  }

  if (independentSources.length === 0) {
    rationale.push(
      'All evidence is self-reported (website, directory, ad spend or bar filing), ' +
        'so confidence is capped until something independent corroborates it.'
    )
  }

  if (newestObservedAt) {
    const years = (now.getTime() - newestObservedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (years > HALF_LIFE_YEARS) {
      rationale.push(
        `Newest evidence is ${years.toFixed(1)} years old, so the score is discounted for staleness.`
      )
    }
  }

  const subtypes = Array.from(subtypeWeight.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subtype]) => subtype)

  return {
    piScore: round(piScore),
    side,
    sideConfidence: round(sideConfidence),
    subtypes,
    confidence,
    rationale,
    breakdown: {
      totalWeight: round(totalWeight),
      plaintiffWeight: round(plaintiffWeight),
      defenseWeight: round(defenseWeight),
      signalCount: signals.length,
      distinctSources: sources.size,
      independentSources: independentSources.length,
      newestObservedAt: newestObservedAt ? newestObservedAt.toISOString() : null,
    },
    scoreVersion: PI_SCORE_VERSION,
  }
}

function classifySide(
  plaintiffWeight: number,
  defenseWeight: number
): { side: PiSide; sideConfidence: number } {
  const sideWeight = plaintiffWeight + defenseWeight
  if (sideWeight < SIDE_MIN_WEIGHT) return { side: 'unknown', sideConfidence: 0 }

  const plaintiffShare = plaintiffWeight / sideWeight

  if (plaintiffShare >= SIDE_DOMINANCE) {
    return { side: 'plaintiff', sideConfidence: saturate(plaintiffWeight) * plaintiffShare }
  }
  if (plaintiffShare <= 1 - SIDE_DOMINANCE) {
    return { side: 'defense', sideConfidence: saturate(defenseWeight) * (1 - plaintiffShare) }
  }
  // Genuinely mixed. Deliberately not resolved to the larger side: a firm doing
  // real defense work is a conflict risk on claimant cases regardless of how
  // much plaintiff work it also does.
  return { side: 'both', sideConfidence: saturate(sideWeight) * Math.abs(plaintiffShare - 0.5) * 2 }
}

/**
 * Confidence grade.
 *
 * The independent-source requirement is the important part: a firm that says it
 * does PI on its website, in three directories and in its ad copy has produced
 * one claim repeated four times, not four pieces of evidence. High confidence
 * needs at least two independent sources.
 */
function gradeConfidence(
  totalWeight: number,
  independentSources: number
): SegmentScore['confidence'] {
  if (totalWeight <= 0) return 'none'
  if (independentSources >= 2 && totalWeight >= 2.0) return 'high'
  if (independentSources >= 1 && totalWeight >= 1.0) return 'medium'
  if (totalWeight >= 0.4) return 'low'
  return 'none'
}

function describeSource(source: SignalSource): string {
  switch (source) {
    case 'court_filing':
      return 'Court filings'
    case 'association':
      return 'Bar association membership'
    case 'bar_record':
      return 'State Bar reported practice area'
    case 'gbp':
      return 'Google Business Profile category'
    case 'paid_search':
      return 'Paid search intent'
    case 'website':
      return 'Firm website'
    case 'directory':
      return 'Legal directory listing'
    case 'manual':
      return 'Human review'
    default:
      return source
  }
}

/**
 * Whether an entity should be offered claimant (plaintiff-side) PI leads.
 *
 * Separate from the score on purpose. The score says "does this firm do PI"; this
 * says "should we send them a claimant". Those differ for defense firms, which
 * score highly on PI and must never receive claimant leads.
 */
export function isEligibleForClaimantLeads(
  score: SegmentScore,
  options: { minScore?: number; allowMixed?: boolean } = {}
): { eligible: boolean; reason: string } {
  const minScore = options.minScore ?? 0.5

  if (score.side === 'defense') {
    return { eligible: false, reason: 'Defense-side practice; claimant leads would be a conflict.' }
  }
  if (score.side === 'unknown') {
    return { eligible: false, reason: 'Plaintiff or defense side is undetermined.' }
  }
  if (score.side === 'both' && !options.allowMixed) {
    return { eligible: false, reason: 'Mixed plaintiff and defense practice; needs human review.' }
  }
  if (score.piScore < minScore) {
    return {
      eligible: false,
      reason: `PI score ${score.piScore} is below the ${minScore} threshold.`,
    }
  }
  if (score.confidence === 'low' || score.confidence === 'none') {
    return { eligible: false, reason: `Evidence is ${score.confidence}; needs corroboration.` }
  }
  return { eligible: true, reason: `${score.confidence} confidence plaintiff-side PI practice.` }
}

/**
 * Blend a firm-level score into an attorney who has little or no direct
 * evidence.
 *
 * Most individual attorneys will never have their own court filings — the firm
 * is the practice. But inheritance is not free: an associate at a PI firm is
 * probably a PI attorney, and "probably" should not read as the same confidence
 * as their own filing history. Inherited weight is discounted and the result can
 * never be graded `high` on inheritance alone.
 */
export function inheritFirmSegment(
  attorneyScore: SegmentScore,
  firmScore: SegmentScore,
  discount = 0.6
): SegmentScore {
  // Direct evidence that already reaches medium confidence stands on its own.
  if (attorneyScore.confidence === 'high' || attorneyScore.confidence === 'medium') {
    return attorneyScore
  }
  if (firmScore.piScore <= attorneyScore.piScore) return attorneyScore

  const inheritedScore = round(firmScore.piScore * discount)
  if (inheritedScore <= attorneyScore.piScore) return attorneyScore

  return {
    ...attorneyScore,
    piScore: inheritedScore,
    side: firmScore.side,
    sideConfidence: round(firmScore.sideConfidence * discount),
    subtypes: firmScore.subtypes,
    // Capped at medium: inherited evidence is about the firm, not this person.
    confidence: firmScore.confidence === 'none' ? 'none' : 'low',
    rationale: [
      ...attorneyScore.rationale,
      `Inherited from the firm's ${firmScore.confidence}-confidence score of ${firmScore.piScore}, ` +
        `discounted to ${inheritedScore} because the evidence is about the firm rather than this attorney.`,
    ],
  }
}
