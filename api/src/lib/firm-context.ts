/**
 * Resolve the acting user's firm + attorney identity from an authenticated
 * request. An account maps to a firm either directly (an Attorney row with a
 * lawFirmId) or via active firm membership (case managers, paralegals, etc.).
 */
import type { AuthRequest } from './auth'
import { prisma } from './prisma'

export async function getActorFirmContext(
  req: AuthRequest,
): Promise<{ lawFirmId: string | null; attorneyId: string | null }> {
  const email = req.user?.email
  const userId = req.user?.id
  let attorneyId: string | null = null
  let lawFirmId: string | null = null

  if (email) {
    const attorney = await prisma.attorney.findFirst({
      where: { email },
      select: { id: true, lawFirmId: true },
    })
    if (attorney) {
      attorneyId = attorney.id
      lawFirmId = attorney.lawFirmId
    }
  }
  if (!lawFirmId && userId) {
    const member = await prisma.firmMember.findFirst({
      where: { userId, status: 'active' },
      select: { lawFirmId: true, attorneyId: true },
    })
    if (member) {
      lawFirmId = member.lawFirmId
      attorneyId = attorneyId ?? member.attorneyId
    }
  }
  return { lawFirmId, attorneyId }
}
