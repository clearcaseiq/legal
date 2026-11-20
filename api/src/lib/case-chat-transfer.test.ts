/**
 * A transferred case keeps its client chat, and a room that also covers
 * another case with the same client is never handed over.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { moveCaseChatToAttorney } from './case-chat-transfer'

const input = {
  assessmentId: 'asm-1',
  leadId: 'lead-1',
  fromAttorneyId: 'att-old',
  toAttorneyId: 'att-new',
  fromName: 'Olive Old',
  toName: 'Nate New',
}

const roomFor = (attorneyId: string, room: any) =>
  vi.mocked(prisma.chatRoom.findUnique).mockImplementation(((args: any) =>
    Promise.resolve(args.where.userId_attorneyId.attorneyId === attorneyId ? room : null)) as any)

describe('moveCaseChatToAttorney', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'client-1' } as any)
    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(0 as any)
  })

  it('hands the room to the new attorney when they have none with this client', async () => {
    roomFor('att-old', { id: 'room-old', assessmentId: 'asm-1', lastMessageAt: null })

    const result = await moveCaseChatToAttorney(input)

    expect(result).toEqual({ moved: true, roomId: 'room-old', merged: false })
    expect(prisma.chatRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-old' },
      data: { attorneyId: 'att-new', assessmentId: 'asm-1', status: 'ACTIVE' },
    })
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chatRoomId: 'room-old',
        messageType: 'system',
        content: expect.stringContaining('transferred from Olive Old to Nate New'),
      }),
    })
  })

  it("moves the messages into the new attorney's existing room and archives the old one", async () => {
    vi.mocked(prisma.chatRoom.findUnique)
      .mockResolvedValueOnce({ id: 'room-old', assessmentId: null, lastMessageAt: new Date('2026-11-10') } as any)
      .mockResolvedValueOnce({ id: 'room-new', lastMessageAt: new Date('2026-11-01') } as any)

    const result = await moveCaseChatToAttorney(input)

    expect(result).toEqual({ moved: true, roomId: 'room-new', merged: true })
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { chatRoomId: 'room-old' },
      data: { chatRoomId: 'room-new' },
    })
    expect(prisma.chatRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-new' },
      data: { assessmentId: 'asm-1', status: 'ACTIVE', lastMessageAt: new Date('2026-11-10') },
    })
    expect(prisma.chatRoom.update).toHaveBeenCalledWith({ where: { id: 'room-old' }, data: { status: 'ARCHIVED' } })
  })

  it('leaves a room tagged with a different case alone', async () => {
    roomFor('att-old', { id: 'room-old', assessmentId: 'asm-other', lastMessageAt: null })

    expect(await moveCaseChatToAttorney(input)).toEqual({ moved: false, reason: 'other_case' })
    expect(prisma.chatRoom.update).not.toHaveBeenCalled()
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('leaves an untagged room alone when the old attorney has another case with this client', async () => {
    roomFor('att-old', { id: 'room-old', assessmentId: null, lastMessageAt: null })
    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(1 as any)

    expect(await moveCaseChatToAttorney(input)).toEqual({ moved: false, reason: 'ambiguous' })
    expect(prisma.chatRoom.update).not.toHaveBeenCalled()
  })

  it('does nothing when there is no chat to move', async () => {
    roomFor('nobody', null)
    expect(await moveCaseChatToAttorney(input)).toEqual({ moved: false, reason: 'no_room' })

    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: null } as any)
    expect(await moveCaseChatToAttorney(input)).toEqual({ moved: false, reason: 'no_client' })
  })
})
