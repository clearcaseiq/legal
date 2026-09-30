import { prisma } from './prisma'

const db = prisma as any

/** Offer statuses that mean the attorney (or firm staff for them) turned the case down. */
const DECLINED_OFFER_STATUSES = ['DECLINED', 'REJECTED']

/** Offer statuses a colleague could still act on. */
const LIVE_OFFER_STATUSES = ['PENDING', 'REQUESTED_INFO']

/**
 * Attorneys this case must not be offered to: everyone at a firm where
 * someone already declined it. A firm declines once, for all its attorneys;
 * a solo attorney without a firm only blocks themselves.
 */
export async function attorneysBlockedByFirmDecline(assessmentId: string): Promise<Set<string>> {
  const declined: Array<{ attorneyId: string; attorney?: { lawFirmId?: string | null } | null }> =
    await db.introduction.findMany({
      where: { assessmentId, status: { in: DECLINED_OFFER_STATUSES } },
      select: { attorneyId: true, attorney: { select: { lawFirmId: true } } },
    })
  const blocked = new Set(declined.map((d) => d.attorneyId))
  const firmIds = [...new Set(declined.map((d) => d.attorney?.lawFirmId).filter((id): id is string => !!id))]
  if (firmIds.length) {
    const colleagues: Array<{ id: string }> = await db.attorney.findMany({
      where: { lawFirmId: { in: firmIds } },
      select: { id: true },
    })
    for (const c of colleagues) blocked.add(c.id)
  }
  return blocked
}

/**
 * After a firm declines, close any offers its other attorneys still hold on
 * the same case so it stops appearing in their queues. Returns how many closed.
 */
export async function closeFirmColleagueOffers(
  assessmentId: string,
  lawFirmId: string | null | undefined,
  decliningAttorneyId: string,
): Promise<number> {
  if (!lawFirmId) return 0
  const result = await db.introduction.updateMany({
    where: {
      assessmentId,
      attorneyId: { not: decliningAttorneyId },
      status: { in: LIVE_OFFER_STATUSES },
      attorney: { lawFirmId },
    },
    data: { status: 'EXPIRED', respondedAt: new Date() },
  })
  return result?.count ?? 0
}
