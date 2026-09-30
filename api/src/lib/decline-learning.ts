import { prisma } from './prisma'

const db = prisma as any

/** Declines older than this no longer influence routing. */
export const DECLINE_LEARNING_WINDOW_DAYS = 90
/** How long a "too busy" decline pauses new offers to that attorney. */
export const TOO_BUSY_PAUSE_DAYS = 3
/**
 * Decayed decline weight at which a claim type or county stops being offered
 * at all. A fresh decline weighs 1, so this is roughly three recent declines.
 */
export const DECLINE_BLOCK_WEIGHT = 2.5

const DAY_MS = 24 * 60 * 60 * 1000
const WEAK_LIABILITY = 0.5

export type DeclineCaseTraits = {
  claimType: string | null
  venueState: string | null
  venueCounty: string | null
  medianValue: number | null
  liability: number | null
}

export type DeclineLearning = {
  attorneyId: string
  /** Decayed "outside practice area" weight per claim type. */
  claimTypes: Record<string, number>
  /** Decayed "wrong jurisdiction" weight per `STATE|county` key. */
  counties: Record<string, number>
  /** Highest case value the attorney called too low within the window. */
  minValue: number | null
  pausedUntil: Date | null
  /** Decayed weight of "liability unclear" / "insufficient evidence" declines. */
  weakLiability: number
  resetAt: Date | null
  declinesConsidered: number
}

export type DeclineAdjustment = {
  multiplier: number
  blockedReason: string | null
  reasons: string[]
}

type ReasonKind = 'practice_area' | 'jurisdiction' | 'low_value' | 'too_busy' | 'weak_liability' | null

function classifyReason(raw: string | null | undefined): ReasonKind {
  const value = String(raw || '').toLowerCase()
  if (!value) return null
  if (value.includes('outside_practice') || value.includes('practice area')) return 'practice_area'
  if (value.includes('jurisdiction')) return 'jurisdiction'
  if (value.includes('low_value') || value.includes('too low')) return 'low_value'
  if (value.includes('too_busy') || value.includes('capacity')) return 'too_busy'
  if (value.includes('liability') || value.includes('insufficient_evidence') || value.includes('evidence')) return 'weak_liability'
  return null
}

function safeJson(raw: unknown): any {
  if (!raw || typeof raw !== 'string') return raw && typeof raw === 'object' ? raw : null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function countyKey(state: string | null | undefined, county: string | null | undefined): string | null {
  if (!state || !county) return null
  return `${state.trim().toUpperCase()}|${county.trim().toLowerCase()}`
}

export function traitsFromAssessment(assessment: {
  claimType?: string | null
  venueState?: string | null
  venueCounty?: string | null
  predictions?: Array<{ bands?: unknown; viability?: unknown }> | null
}): DeclineCaseTraits {
  const prediction = assessment.predictions?.[0]
  const bands = safeJson(prediction?.bands)
  const viability = safeJson(prediction?.viability)
  const median = Number(bands?.median)
  const liability = Number(viability?.liability)
  return {
    claimType: assessment.claimType || null,
    venueState: assessment.venueState || null,
    venueCounty: assessment.venueCounty || null,
    medianValue: Number.isFinite(median) && median > 0 ? median : null,
    liability: Number.isFinite(liability) ? liability : null,
  }
}

export function readDeclineLearningResetAt(meta: string | null | undefined): Date | null {
  const parsed = safeJson(meta)
  const raw = parsed?.declineLearningResetAt
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function emptyLearning(attorneyId: string, resetAt: Date | null): DeclineLearning {
  return {
    attorneyId,
    claimTypes: {},
    counties: {},
    minValue: null,
    pausedUntil: null,
    weakLiability: 0,
    resetAt,
    declinesConsidered: 0,
  }
}

/**
 * What each attorney's recent reasoned declines say about the cases they want.
 * Each decline fades linearly to nothing over the learning window, and a
 * firm's reset discards everything before it.
 */
export async function loadDeclineLearning(
  attorneyIds: string[],
  now: Date = new Date(),
): Promise<Map<string, DeclineLearning>> {
  const result = new Map<string, DeclineLearning>()
  if (attorneyIds.length === 0) return result

  const windowStart = new Date(now.getTime() - DECLINE_LEARNING_WINDOW_DAYS * DAY_MS)
  const [attorneys, declines]: [
    Array<{ id: string; meta: string | null }>,
    Array<{
      attorneyId: string
      declineReason: string | null
      respondedAt: Date | null
      requestedAt: Date
      assessment: {
        claimType: string | null
        venueState: string | null
        venueCounty: string | null
        predictions: Array<{ bands: unknown; viability: unknown }>
      } | null
    }>,
  ] = await Promise.all([
    db.attorney.findMany({ where: { id: { in: attorneyIds } }, select: { id: true, meta: true } }),
    db.introduction.findMany({
      where: {
        attorneyId: { in: attorneyIds },
        status: 'DECLINED',
        declineReason: { not: null },
        respondedAt: { gte: windowStart },
      },
      select: {
        attorneyId: true,
        declineReason: true,
        respondedAt: true,
        requestedAt: true,
        assessment: {
          select: {
            claimType: true,
            venueState: true,
            venueCounty: true,
            predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { bands: true, viability: true } },
          },
        },
      },
    }),
  ])

  for (const id of attorneyIds) result.set(id, emptyLearning(id, null))
  for (const attorney of attorneys || []) {
    result.set(attorney.id, emptyLearning(attorney.id, readDeclineLearningResetAt(attorney.meta)))
  }

  for (const decline of declines || []) {
    const learning = result.get(decline.attorneyId)
    if (!learning) continue
    const decidedAt = new Date(decline.respondedAt || decline.requestedAt)
    if (learning.resetAt && decidedAt <= learning.resetAt) continue
    const ageDays = (now.getTime() - decidedAt.getTime()) / DAY_MS
    const weight = Math.max(0, 1 - ageDays / DECLINE_LEARNING_WINDOW_DAYS)
    if (weight <= 0) continue

    const kind = classifyReason(decline.declineReason)
    if (!kind) continue
    const traits = decline.assessment ? traitsFromAssessment(decline.assessment) : null
    learning.declinesConsidered += 1

    if (kind === 'practice_area' && traits?.claimType) {
      learning.claimTypes[traits.claimType] = (learning.claimTypes[traits.claimType] || 0) + weight
    } else if (kind === 'jurisdiction') {
      const key = countyKey(traits?.venueState, traits?.venueCounty)
      if (key) learning.counties[key] = (learning.counties[key] || 0) + weight
    } else if (kind === 'low_value' && traits?.medianValue) {
      learning.minValue = Math.max(learning.minValue || 0, traits.medianValue)
    } else if (kind === 'too_busy') {
      const until = new Date(decidedAt.getTime() + TOO_BUSY_PAUSE_DAYS * DAY_MS)
      if (until > now && (!learning.pausedUntil || until > learning.pausedUntil)) learning.pausedUntil = until
    } else if (kind === 'weak_liability') {
      learning.weakLiability += weight
    }
  }

  return result
}

/**
 * Turn an attorney's learned preferences into a score multiplier (and
 * possibly a hard block) for one specific case.
 */
export function declineAdjustmentFor(
  learning: DeclineLearning | undefined,
  traits: DeclineCaseTraits,
  now: Date = new Date(),
): DeclineAdjustment {
  const adjustment: DeclineAdjustment = { multiplier: 1, blockedReason: null, reasons: [] }
  if (!learning) return adjustment

  if (learning.pausedUntil && learning.pausedUntil > now) {
    adjustment.blockedReason = 'Paused after a recent "too busy" decline'
    return adjustment
  }

  const claimWeight = traits.claimType ? learning.claimTypes[traits.claimType] || 0 : 0
  if (claimWeight >= DECLINE_BLOCK_WEIGHT) {
    adjustment.blockedReason = `Repeatedly declined ${traits.claimType} cases as outside practice area`
    return adjustment
  }
  if (claimWeight > 0) {
    adjustment.multiplier *= 1 - 0.5 * Math.min(claimWeight / 3, 1)
    adjustment.reasons.push('claim_type_declined')
  }

  const key = countyKey(traits.venueState, traits.venueCounty)
  const countyWeight = key ? learning.counties[key] || 0 : 0
  if (countyWeight >= DECLINE_BLOCK_WEIGHT) {
    adjustment.blockedReason = `Repeatedly declined ${traits.venueCounty} cases as wrong jurisdiction`
    return adjustment
  }
  if (countyWeight > 0) {
    adjustment.multiplier *= 1 - 0.4 * Math.min(countyWeight / 3, 1)
    adjustment.reasons.push('county_declined')
  }

  if (learning.minValue && traits.medianValue != null && traits.medianValue <= learning.minValue) {
    adjustment.multiplier *= 0.6
    adjustment.reasons.push('below_learned_min_value')
  }

  if (learning.weakLiability > 0 && traits.liability != null && traits.liability < WEAK_LIABILITY) {
    adjustment.multiplier *= 1 - 0.3 * Math.min(learning.weakLiability / 3, 1)
    adjustment.reasons.push('weak_liability_declined')
  }

  return adjustment
}

/** Attorneys the learned preferences say must not be offered this case at all. */
export async function attorneysBlockedByDeclineLearning(
  assessmentId: string,
  attorneyIds: string[],
): Promise<Map<string, string>> {
  const blocked = new Map<string, string>()
  if (attorneyIds.length === 0) return blocked
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      claimType: true,
      venueState: true,
      venueCounty: true,
      predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { bands: true, viability: true } },
    },
  })
  if (!assessment) return blocked
  const traits = traitsFromAssessment(assessment)
  const learning = await loadDeclineLearning(attorneyIds)
  for (const id of attorneyIds) {
    const { blockedReason } = declineAdjustmentFor(learning.get(id), traits)
    if (blockedReason) blocked.set(id, blockedReason)
  }
  return blocked
}

/** Human-readable summary of what routing has learned, for the firm dashboard. */
export function describeDeclineLearning(learning: DeclineLearning, now: Date = new Date()) {
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    claimTypes: Object.entries(learning.claimTypes)
      .map(([claimType, weight]) => ({ claimType, weight: round(weight), blocked: weight >= DECLINE_BLOCK_WEIGHT }))
      .sort((a, b) => b.weight - a.weight),
    counties: Object.entries(learning.counties)
      .map(([key, weight]) => {
        const [state, county] = key.split('|')
        return { state, county, weight: round(weight), blocked: weight >= DECLINE_BLOCK_WEIGHT }
      })
      .sort((a, b) => b.weight - a.weight),
    minValue: learning.minValue,
    pausedUntil: learning.pausedUntil && learning.pausedUntil > now ? learning.pausedUntil.toISOString() : null,
    weakLiability: round(learning.weakLiability),
    resetAt: learning.resetAt ? learning.resetAt.toISOString() : null,
    declinesConsidered: learning.declinesConsidered,
  }
}
