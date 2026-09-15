/**
 * Shaping the attorney cards on the plaintiff's contact-order screen.
 *
 * This lives apart from the screen because most of it decides what the product
 * is willing to *assert* about an attorney to someone choosing counsel, and
 * those rules are easier to defend when they can be tested on their own.
 */

export type TFn = (key: string, params?: Record<string, string | number>) => string

/**
 * `Attorney.responseTimeHours` is a column default rather than a measurement:
 * every roster row starts at 24, and the search endpoint turns that straight
 * into a "Replies within 24h" badge. A response time at or above the default is
 * therefore one the attorney has never demonstrated, so it is reported as no
 * signal instead of as a promise.
 */
export const DEFAULT_RESPONSE_TIME_HOURS = 24

/** Verified reviews required before a star rating is published. */
export const MIN_VERIFIED_REVIEWS_FOR_RATING = 1

const SAME_DAY_MAX_HOURS = 8

export interface CardContext {
  claimType?: string
  venueState?: string
  formatClaimType: (claimType?: string) => string
  resolvePhoto: (url?: string | null) => string
}

export interface ContactOrderAttorney {
  id: string
  name: string
  firmName: string | null
  photoUrl: string
  initials: string
  /** Null until the attorney has enough verified reviews to publish a star. */
  rating: number | null
  verifiedReviewCount: number
  practice: string | null
  servedVenue: string | null
  responseSignal: string | null
  yearsExperience: number
  languages: string[]
  reasons: string[]
  bookingSlug: string | null
}

function normalizeTerm(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string' && entry.trim()) : []
}

/** Whether the attorney's own specialties cover the claim type on this case. */
export function attorneyHandlesClaimType(specialties: unknown, claimType?: string): boolean {
  const target = normalizeTerm(claimType)
  if (target.length < 3) return false
  return toList(specialties).some((specialty) => {
    const candidate = normalizeTerm(specialty)
    if (candidate.length < 3) return false
    return candidate === target || candidate.includes(target) || target.includes(candidate)
  })
}

export function getResponseSignal(attorney: any, t: TFn): string | null {
  const hours = Number(attorney?.responseTimeHours)
  if (!Number.isFinite(hours) || hours <= 0) return null
  if (hours >= DEFAULT_RESPONSE_TIME_HOURS) return null
  return hours <= SAME_DAY_MAX_HOURS ? t('results.calc.responseSameDay') : t('results.calc.response24h')
}

/**
 * The venue this attorney can honestly be said to cover.
 *
 * The card used to print the *claimant's* county — "Serves Los Angeles County"
 * — which asserts a coverage area nobody ever checked against the attorney.
 * Only the attorney's own `venues` list is verified, and it holds states, so
 * nothing finer than a state is claimed here.
 */
export function getServedVenue(attorney: any, venueState?: string): string | null {
  const venues = toList(attorney?.venues)
  if (venueState && venues.includes(venueState)) return venueState
  return venues[0] || attorney?.law_firm?.state || null
}

export function getPublishedRating(attorney: any): number | null {
  const rating = Number(attorney?.averageRating ?? attorney?.rating ?? 0)
  const verified = Number(attorney?.verifiedReviewCount ?? 0)
  if (!Number.isFinite(rating) || rating <= 0) return null
  if (verified < MIN_VERIFIED_REVIEWS_FOR_RATING) return null
  return Math.round(rating * 10) / 10
}

/** Languages worth listing: English is the default for every row, so it says nothing. */
export function getDistinguishingLanguages(attorney: any): string[] {
  return toList(attorney?.languages).filter((language) => normalizeTerm(language) !== 'english')
}

/**
 * The "why they match your case" bullets.
 *
 * Every entry has to be traceable to something on the attorney's own record.
 * The practice-area line in particular is only claimed when their specialties
 * actually cover this claim type; previously it echoed the case's claim type at
 * whoever happened to be in the list.
 */
export function buildMatchReasons(attorney: any, ctx: CardContext, t: TFn): string[] {
  const reasons: string[] = []
  const specialties = toList(attorney?.specialties)
  const handlesThisCase = attorneyHandlesClaimType(specialties, ctx.claimType)
  const practiceSource = handlesThisCase ? ctx.claimType : specialties[0]

  if (practiceSource) {
    reasons.push(t('results.calc.handlesCases', { specialty: ctx.formatClaimType(practiceSource) }))
  }

  const venue = getServedVenue(attorney, ctx.venueState)
  if (venue) reasons.push(t('results.calc.servesVenue', { venue }))

  const rating = getPublishedRating(attorney)
  if (rating !== null) reasons.push(t('results.calc.averageRating', { rating: rating.toFixed(1) }))

  const years = Number(attorney?.yearsExperience) || 0
  if (years > 0) reasons.push(t('results.calc.yearsOfExperience', { years }))

  const responseSignal = getResponseSignal(attorney, t)
  if (responseSignal) reasons.push(responseSignal)

  const languages = getDistinguishingLanguages(attorney)
  if (languages.length > 0) {
    reasons.push(t('results.calc.speaksLanguages', { languages: languages.slice(0, 3).join(', ') }))
  }

  return reasons
}

export function toContactOrderAttorney(attorney: any, ctx: CardContext, t: TFn): ContactOrderAttorney {
  const name = String(attorney?.name || '').trim() || t('results.calc.attorneyFallback')
  const initials = name
    .split(/\s+/)
    .map((word: string) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return {
    id: attorney?.id || attorney?.attorney_id,
    name,
    firmName: attorney?.law_firm?.name || null,
    photoUrl: ctx.resolvePhoto(attorney?.attorneyProfile?.photoUrl || attorney?.photoUrl),
    initials,
    rating: getPublishedRating(attorney),
    verifiedReviewCount: Number(attorney?.verifiedReviewCount) || 0,
    practice: toList(attorney?.specialties)
      .slice(0, 2)
      .map((specialty) => ctx.formatClaimType(specialty))
      .join(' + ') || null,
    servedVenue: getServedVenue(attorney, ctx.venueState),
    responseSignal: getResponseSignal(attorney, t),
    yearsExperience: Number(attorney?.yearsExperience) || 0,
    languages: getDistinguishingLanguages(attorney),
    reasons: buildMatchReasons(attorney, ctx, t),
    bookingSlug: attorney?.bookingSlug || attorney?.booking_slug || null,
  }
}

/** Move `id` so it lands immediately before `targetId`, or at the end when absent. */
export function reorderById(order: string[], id: string, targetId: string): string[] {
  const fromIndex = order.indexOf(id)
  const targetIndex = order.indexOf(targetId)
  if (fromIndex === -1 || targetIndex === -1 || id === targetId) return order
  const next = [...order]
  next.splice(fromIndex, 1)
  next.splice(next.indexOf(targetId) + (fromIndex < targetIndex ? 1 : 0), 0, id)
  return next
}

/** Promote `id` to the front, leaving the relative order of the rest intact. */
export function promoteToFirst(order: string[], id: string): string[] {
  if (!order.includes(id) || order[0] === id) return order
  return [id, ...order.filter((entry) => entry !== id)]
}
