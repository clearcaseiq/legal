import { prisma } from './prisma'
import { getRankedAttorneyIdsFromLead } from './routing-lifecycle'

export type PlaintiffChoiceStatus = 'waiting' | 'reviewing' | 'accepted' | 'passed' | 'no_response'

export interface PlaintiffAttorneyChoice {
  id: string
  rank: number
  name: string
  firmName: string | null
  status: PlaintiffChoiceStatus
}

type ChoiceIntroduction = { attorneyId: string; status: string; requestedAt?: Date | string | null }

/**
 * An offer past its response window, still stored as PENDING until the expiry
 * sweep reaches it. Shown as lapsed so nobody reads it as an attorney reviewing.
 */
export function isLapsedOffer(
  intro: { status: string; requestedAt?: Date | string | null },
  responseDeadlineMinutes: number | null | undefined,
  now = Date.now(),
): boolean {
  if (intro.status !== 'PENDING' || !intro.requestedAt || !responseDeadlineMinutes) return false
  const requested = new Date(intro.requestedAt).getTime()
  return Number.isFinite(requested) && requested + responseDeadlineMinutes * 60_000 <= now
}

function choiceStatus(intro: ChoiceIntroduction | undefined, responseDeadlineMinutes?: number | null): PlaintiffChoiceStatus {
  if (intro && isLapsedOffer(intro, responseDeadlineMinutes)) return 'no_response'
  switch (intro?.status) {
    case 'PENDING':
    case 'REQUESTED_INFO':
      return 'reviewing'
    case 'ACCEPTED':
      return 'accepted'
    case 'DECLINED':
      return 'passed'
    case 'EXPIRED':
      return 'no_response'
    default:
      return 'waiting'
  }
}

/**
 * The claimant's attorney picks, in the order routing contacts them.
 *
 * Read from the lead first because that is the queue routing walks, including
 * a later batch the claimant approved; the copy on the case facts is the
 * fallback for a lead written before preferences were stored on it.
 */
export function plaintiffRankedAttorneyIds(
  lead: { sourceDetails?: string | null } | null | undefined,
  facts: string | null | undefined
): string[] {
  const fromLead = getRankedAttorneyIdsFromLead(lead)
  if (fromLead.length > 0) return fromLead
  try {
    const ids = (JSON.parse(facts || '{}') as any)?.plaintiffAttorneyPreferences?.rankedAttorneyIds
    return Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0) : []
  } catch {
    return []
  }
}

/** The claimant's picks with names and where each one stands on this case. */
export async function loadPlaintiffAttorneyChoices(params: {
  lead: { sourceDetails?: string | null } | null | undefined
  facts: string | null | undefined
  introductions: ChoiceIntroduction[]
  /** The attorney response window; with it, a lapsed PENDING offer reads as no response. */
  responseDeadlineMinutes?: number | null
}): Promise<PlaintiffAttorneyChoice[]> {
  const rankedIds = plaintiffRankedAttorneyIds(params.lead, params.facts)
  if (rankedIds.length === 0) return []

  const attorneys = await prisma.attorney
    .findMany({
      where: { id: { in: rankedIds } },
      select: { id: true, name: true, lawFirm: { select: { name: true } } },
    })
    .catch(() => [])
  const attorneyById = new Map(attorneys.map((attorney) => [attorney.id, attorney]))
  // An attorney can be offered the same case more than once; the latest offer is where they stand.
  const time = (intro: ChoiceIntroduction) => (intro.requestedAt ? new Date(intro.requestedAt).getTime() : 0)
  const introByAttorneyId = new Map<string, ChoiceIntroduction>()
  for (const intro of params.introductions) {
    const prior = introByAttorneyId.get(intro.attorneyId)
    if (!prior || time(intro) >= time(prior)) introByAttorneyId.set(intro.attorneyId, intro)
  }

  return rankedIds.flatMap((attorneyId, index) => {
    const attorney = attorneyById.get(attorneyId)
    if (!attorney) return []
    return [{
      id: attorney.id,
      rank: index + 1,
      name: attorney.name,
      firmName: attorney.lawFirm?.name ?? null,
      status: choiceStatus(introByAttorneyId.get(attorneyId), params.responseDeadlineMinutes),
    }]
  })
}
