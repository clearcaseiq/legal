/**
 * Carry a case's client chat over when the case moves to another attorney.
 *
 * Chat rooms are keyed by (client, attorney), so after a transfer the new
 * attorney opened an empty room and the history stayed with someone who no
 * longer has the case. A room is only moved when it demonstrably belongs to
 * this case: tagged with it, or untagged while the previous attorney has no
 * other case with the same client. Anything else would hand over messages
 * about a different matter.
 */

import { prisma } from './prisma'
import { logger } from './logger'

export type CaseChatTransferResult =
  | { moved: true; roomId: string; merged: boolean }
  | { moved: false; reason: 'no_client' | 'no_room' | 'other_case' | 'ambiguous' }

export async function moveCaseChatToAttorney(input: {
  assessmentId: string
  leadId: string
  fromAttorneyId: string
  toAttorneyId: string
  fromName?: string | null
  toName?: string | null
}): Promise<CaseChatTransferResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: input.assessmentId },
    select: { userId: true },
  })
  const userId = assessment?.userId
  if (!userId) return { moved: false, reason: 'no_client' }

  const oldRoom = await prisma.chatRoom.findUnique({
    where: { userId_attorneyId: { userId, attorneyId: input.fromAttorneyId } },
    select: { id: true, assessmentId: true, lastMessageAt: true },
  })
  if (!oldRoom) return { moved: false, reason: 'no_room' }
  if (oldRoom.assessmentId && oldRoom.assessmentId !== input.assessmentId) {
    return { moved: false, reason: 'other_case' }
  }
  if (!oldRoom.assessmentId) {
    const otherCases = await prisma.leadSubmission.count({
      where: {
        id: { not: input.leadId },
        assignedAttorneyId: input.fromAttorneyId,
        assessment: { userId },
      },
    })
    if (otherCases > 0) {
      logger.info('Chat not moved on transfer: room spans more than one case', {
        assessmentId: input.assessmentId,
        roomId: oldRoom.id,
      })
      return { moved: false, reason: 'ambiguous' }
    }
  }

  const targetRoom = await prisma.chatRoom.findUnique({
    where: { userId_attorneyId: { userId, attorneyId: input.toAttorneyId } },
    select: { id: true, lastMessageAt: true },
  })

  let roomId: string
  if (!targetRoom) {
    await prisma.chatRoom.update({
      where: { id: oldRoom.id },
      data: { attorneyId: input.toAttorneyId, assessmentId: input.assessmentId, status: 'ACTIVE' },
    })
    roomId = oldRoom.id
  } else {
    await prisma.message.updateMany({ where: { chatRoomId: oldRoom.id }, data: { chatRoomId: targetRoom.id } })
    const latest = [oldRoom.lastMessageAt, targetRoom.lastMessageAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0]
    await prisma.chatRoom.update({
      where: { id: targetRoom.id },
      data: { assessmentId: input.assessmentId, status: 'ACTIVE', ...(latest ? { lastMessageAt: latest } : {}) },
    })
    await prisma.chatRoom.update({ where: { id: oldRoom.id }, data: { status: 'ARCHIVED' } })
    roomId = targetRoom.id
  }

  const who = (name: string | null | undefined, fallback: string) => (name && name.trim()) || fallback
  await prisma.message.create({
    data: {
      chatRoomId: roomId,
      senderId: input.toAttorneyId,
      senderType: 'attorney',
      messageType: 'system',
      content: `Your case was transferred from ${who(input.fromName, 'your previous attorney')} to ${who(
        input.toName,
        'a new attorney at the same firm',
      )}. Your earlier messages are kept here.`,
    },
  })

  return { moved: true, roomId, merged: Boolean(targetRoom) }
}
