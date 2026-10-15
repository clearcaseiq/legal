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

function choiceStatus(introductionStatus: string | undefined): PlaintiffChoiceStatus {
  switch (introductionStatus) {
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
  introductions: Array<{ attorneyId: string; status: string }>
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
  const introStatusByAttorneyId = new Map(params.introductions.map((intro) => [intro.attorneyId, intro.status]))

  return rankedIds.flatMap((attorneyId, index) => {
    const attorney = attorneyById.get(attorneyId)
    if (!attorney) return []
    return [{
      id: attorney.id,
      rank: index + 1,
      name: attorney.name,
      firmName: attorney.lawFirm?.name ?? null,
      status: choiceStatus(introStatusByAttorneyId.get(attorneyId)),
    }]
  })
}
