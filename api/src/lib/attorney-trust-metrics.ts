/**
 * Attorney & firm trust metrics.
 *
 * Computes marketplace-trust numbers from real activity — introductions
 * (response time, acceptance rate), decision memories (case outcomes, retain/win
 * rate, settlement averages, plaintiff satisfaction), and reviews — rather than
 * self-reported profile fields. Every value is derived deterministically so it is
 * explainable and auditable. Attorneys with no history return zeroed metrics.
 */

import { prisma } from './prisma'

export interface AttorneyTrustMetrics {
  attorneyId: string
  // Reviews
  averageRating: number
  totalReviews: number
  // Response
  averageResponseHours: number | null
  responseBadge: string
  // Pipeline
  introductionsCount: number
  respondedCount: number
  acceptanceRate: number // 0-1
  // Outcomes (from decision memories)
  casesHandled: number
  resolvedCount: number
  retainRate: number // 0-1, retained among handled
  favorableRate: number // 0-1, settled+won among resolved (a.k.a. win rate)
  outcomeBreakdown: {
    retained: number
    settled: number
    won: number
    lost: number
    consulted: number
  }
  // Settlements
  averageSettlement: number
  totalSettlements: number
  settlementCount: number
  wentToTrialCount: number
  // Satisfaction
  plaintiffSatisfaction: number | null // 1-5
  attorneySatisfaction: number | null // 1-5
}

function responseBadgeFor(hours: number | null): string {
  if (hours === null) return 'New to platform'
  if (hours <= 2) return 'Lightning fast'
  if (hours <= 8) return 'Fast responder'
  if (hours <= 24) return 'Responds within a day'
  return 'Standard response'
}

const FAVORABLE = new Set(['retained', 'settled', 'won'])
const RESOLVED = new Set(['retained', 'settled', 'won', 'lost', 'rejected'])

export async function computeAttorneyTrustMetrics(attorneyId: string): Promise<AttorneyTrustMetrics> {
  const [attorney, introductions, memories] = await Promise.all([
    prisma.attorney.findUnique({
      where: { id: attorneyId },
      select: { averageRating: true, totalReviews: true, responseTimeHours: true },
    }),
    prisma.introduction.findMany({
      where: { attorneyId },
      select: { status: true, requestedAt: true, respondedAt: true },
    }),
    prisma.decisionMemory.findMany({
      where: { attorneyId },
      select: {
        outcomeStatus: true,
        retained: true,
        settlementAmount: true,
        wentToTrial: true,
        plaintiffSatisfaction: true,
        attorneySatisfaction: true,
      },
    }),
  ])

  const introductionsCount = introductions.length
  const accepted = introductions.filter((i) => i.status === 'ACCEPTED' || i.status === 'RETAINED').length
  const acceptanceRate = introductionsCount > 0 ? accepted / introductionsCount : 0

  const responded = introductions.filter((i) => i.respondedAt)
  const averageResponseHours =
    responded.length > 0
      ? Math.round(
          (responded.reduce((sum, i) => sum + (i.respondedAt!.getTime() - i.requestedAt.getTime()), 0) /
            responded.length /
            (1000 * 60 * 60)) *
            10,
        ) / 10
      : attorney?.responseTimeHours ?? null

  // Outcome analytics from decision memories.
  const outcomeBreakdown = { retained: 0, settled: 0, won: 0, lost: 0, consulted: 0 }
  let resolvedCount = 0
  let retainedCount = 0
  let favorableCount = 0
  let settlementSum = 0
  let settlementCount = 0
  let wentToTrialCount = 0
  const plaintiffScores: number[] = []
  const attorneyScores: number[] = []

  for (const m of memories) {
    const status = String(m.outcomeStatus || '').toLowerCase()
    if (status === 'retained') outcomeBreakdown.retained += 1
    else if (status === 'settled') outcomeBreakdown.settled += 1
    else if (status === 'won') outcomeBreakdown.won += 1
    else if (status === 'lost' || status === 'rejected') outcomeBreakdown.lost += 1
    else if (status === 'consulted') outcomeBreakdown.consulted += 1

    if (RESOLVED.has(status)) resolvedCount += 1
    if (m.retained === true || FAVORABLE.has(status)) retainedCount += 1
    if (FAVORABLE.has(status)) favorableCount += 1
    if (m.wentToTrial === true) wentToTrialCount += 1

    if (typeof m.settlementAmount === 'number' && m.settlementAmount > 0) {
      settlementSum += m.settlementAmount
      settlementCount += 1
    }
    if (typeof m.plaintiffSatisfaction === 'number') plaintiffScores.push(m.plaintiffSatisfaction)
    if (typeof m.attorneySatisfaction === 'number') attorneyScores.push(m.attorneySatisfaction)
  }

  const casesHandled = memories.length
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null)

  return {
    attorneyId,
    averageRating: attorney?.averageRating ?? 0,
    totalReviews: attorney?.totalReviews ?? 0,
    averageResponseHours,
    responseBadge: responseBadgeFor(averageResponseHours),
    introductionsCount,
    respondedCount: responded.length,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    casesHandled,
    resolvedCount,
    retainRate: casesHandled > 0 ? Math.round((retainedCount / casesHandled) * 100) / 100 : 0,
    favorableRate: resolvedCount > 0 ? Math.round((favorableCount / resolvedCount) * 100) / 100 : 0,
    outcomeBreakdown,
    averageSettlement: settlementCount > 0 ? Math.round(settlementSum / settlementCount) : 0,
    totalSettlements: Math.round(settlementSum),
    settlementCount,
    wentToTrialCount,
    plaintiffSatisfaction: avg(plaintiffScores),
    attorneySatisfaction: avg(attorneyScores),
  }
}

export interface FirmTrustMetrics {
  firmId: string
  attorneyCount: number
  averageRating: number
  totalReviews: number
  acceptanceRate: number
  retainRate: number
  favorableRate: number
  averageSettlement: number
  totalSettlements: number
  settlementCount: number
  casesHandled: number
  plaintiffSatisfaction: number | null
  averageResponseHours: number | null
}

/** Aggregate trust metrics across every active attorney in a firm. */
export async function computeFirmTrustMetrics(firmId: string): Promise<FirmTrustMetrics> {
  const attorneys = await prisma.attorney.findMany({
    where: { lawFirmId: firmId },
    select: { id: true },
  })

  const perAttorney = await Promise.all(attorneys.map((a) => computeAttorneyTrustMetrics(a.id)))

  const sum = (fn: (m: AttorneyTrustMetrics) => number) => perAttorney.reduce((s, m) => s + fn(m), 0)
  const weightedRate = (rateFn: (m: AttorneyTrustMetrics) => number, weightFn: (m: AttorneyTrustMetrics) => number) => {
    const totalWeight = sum(weightFn)
    if (totalWeight === 0) return 0
    return Math.round((perAttorney.reduce((s, m) => s + rateFn(m) * weightFn(m), 0) / totalWeight) * 100) / 100
  }

  const totalReviews = sum((m) => m.totalReviews)
  const weightedRating =
    totalReviews > 0
      ? Math.round((perAttorney.reduce((s, m) => s + m.averageRating * m.totalReviews, 0) / totalReviews) * 10) / 10
      : 0

  const settlementCount = sum((m) => m.settlementCount)
  const totalSettlements = sum((m) => m.totalSettlements)
  const responseHoursList = perAttorney.map((m) => m.averageResponseHours).filter((h): h is number => typeof h === 'number')
  const satisfactionList = perAttorney.map((m) => m.plaintiffSatisfaction).filter((s): s is number => typeof s === 'number')

  return {
    firmId,
    attorneyCount: attorneys.length,
    averageRating: weightedRating,
    totalReviews,
    acceptanceRate: weightedRate((m) => m.acceptanceRate, (m) => m.introductionsCount),
    retainRate: weightedRate((m) => m.retainRate, (m) => m.casesHandled),
    favorableRate: weightedRate((m) => m.favorableRate, (m) => m.resolvedCount),
    averageSettlement: settlementCount > 0 ? Math.round(totalSettlements / settlementCount) : 0,
    totalSettlements,
    settlementCount,
    casesHandled: sum((m) => m.casesHandled),
    plaintiffSatisfaction: satisfactionList.length
      ? Math.round((satisfactionList.reduce((s, n) => s + n, 0) / satisfactionList.length) * 10) / 10
      : null,
    averageResponseHours: responseHoursList.length
      ? Math.round((responseHoursList.reduce((s, n) => s + n, 0) / responseHoursList.length) * 10) / 10
      : null,
  }
}
