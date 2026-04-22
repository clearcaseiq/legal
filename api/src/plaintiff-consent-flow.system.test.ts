/**
 * System test: in-memory consent store simulates plaintiff completing required consents
 * and verifies compliance transitions (missing → granted).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'crypto'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { CONSENT_TEMPLATES } from './lib/consent-templates'

const plaintiffUser = {
  id: 'user-sys-pl-1',
  email: 'plaintiff.system@test.local',
  firstName: 'Sam',
  lastName: 'Sys',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

type ConsentRow = {
  id: string
  userId: string
  consentType: string
  version: string
  documentId: string
  granted: boolean
  grantedAt: Date | null
  expiresAt: Date | null
  consentText: string
  createdAt: Date
}

describe('Plaintiff consent compliance (system)', () => {
  const app = buildApp()
  let store: ConsentRow[] = []

  beforeEach(() => {
    resetUniversalPrismaMock()
    store = []

    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: { where?: { id?: string; email?: string } }) => {
      if (args?.where?.id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)

    vi.mocked(prisma.consent.findMany).mockImplementation(async () => [...store] as any)

    vi.mocked(prisma.consent.findFirst).mockImplementation(async ({ where }: { where?: { userId?: string; consentType?: string; version?: string } }) => {
      return store.find(
        (c) =>
          c.userId === where?.userId &&
          c.consentType === where?.consentType &&
          c.version === where?.version
      ) as any
    })

    vi.mocked(prisma.consent.create).mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        id: randomUUID(),
        ...data,
        grantedAt: data.granted ? new Date() : null,
        createdAt: new Date(),
      } as ConsentRow
      store.push(row)
      return row as any
    })
  })

  it('status starts incomplete then completes after three POSTs', async () => {
    const r0 = await request(app)
      .get(`/v1/consent/status/${plaintiffUser.id}`)
      .set(authHeader(plaintiffUser.id))
      .expect(200)

    expect(r0.body.data.allRequiredConsentsGranted).toBe(false)
    expect(r0.body.data.missingConsents?.length ?? r0.body.data.missing?.length).toBeGreaterThan(0)

    const types = ['hipaa', 'terms', 'privacy'] as const
    for (const t of types) {
      const tmpl = CONSENT_TEMPLATES[t]
      await request(app)
        .post('/v1/consent')
        .set(authHeader(plaintiffUser.id))
        .send({
          consentType: t,
          version: tmpl.version,
          documentId: tmpl.documentId,
          granted: true,
          signatureData: '/sig',
          signatureMethod: 'typed',
          consentText: tmpl.content.slice(0, 500),
          expiresAt: new Date(Date.now() + 86400e7 * 365).toISOString(),
        })
        .expect(201)
    }

    const r1 = await request(app)
      .get(`/v1/consent/status/${plaintiffUser.id}`)
      .set(authHeader(plaintiffUser.id))
      .expect(200)

    expect(r1.body.data.allRequiredConsentsGranted).toBe(true)
    expect(r1.body.data.missingConsents?.length ?? 0).toBe(0)
  })
})
