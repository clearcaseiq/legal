import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { loadSpecialistDocumentRequest } from './specialist-document-requests'

function asks(...rows: Array<{ docs: string[]; at: string; message?: string; fromName?: string }>) {
  ;(prisma.platformNotificationEvent.findMany as any).mockResolvedValue(
    rows.map((row) => ({
      createdAt: new Date(row.at),
      payloadJson: JSON.stringify({ docs: row.docs, message: row.message, fromName: row.fromName }),
    })),
  )
}

describe('loadSpecialistDocumentRequest', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('is null when nobody has asked for anything', async () => {
    asks()
    expect(await loadSpecialistDocumentRequest('a1', [])).toBeNull()
  })

  it('folds repeat asks for the same document into one item', async () => {
    asks(
      { docs: ['medical_records', 'bills'], at: '2026-10-01T10:00:00Z' },
      { docs: ['medical_records'], at: '2026-10-02T10:00:00Z', fromName: 'Ave Ku', message: 'As discussed' },
    )
    const request = await loadSpecialistDocumentRequest('a1', [])
    expect(request?.items.map((item) => [item.key, item.askCount])).toEqual([
      ['medical_records', 2],
      ['bills', 1],
    ])
    expect(request?.requestedBy).toBe('Ave Ku')
    expect(request?.message).toBe('As discussed')
    expect(request?.status).toBe('pending')
  })

  it('counts an item received only for uploads after its latest ask', async () => {
    asks(
      { docs: ['medical_records', 'police_report'], at: '2026-10-01T10:00:00Z' },
      { docs: ['medical_records'], at: '2026-10-03T10:00:00Z' },
    )
    const request = await loadSpecialistDocumentRequest('a1', [
      { category: 'medical_records', createdAt: '2026-10-02T10:00:00Z' },
      { category: 'police_report', createdAt: '2026-10-02T10:00:00Z' },
    ])
    const received = Object.fromEntries(request!.items.map((item) => [item.key, item.fulfilled]))
    expect(received).toEqual({ medical_records: false, police_report: true })
    expect(request?.status).toBe('partial')
  })
})
