/**
 * Integration tests: consent HTTP API (supertest + mocked Prisma).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const plaintiffUser = {
  id: 'user-consent-pl-1',
  email: 'plaintiff.consent@test.local',
  firstName: 'Pat',
  lastName: 'Lee',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

const validConsentBody = {
  consentType: 'terms' as const,
  version: '1.0',
  documentId: 'terms-v1.0',
  granted: true,
  signatureData: 'data:image/png;base64,xx',
  signatureMethod: 'drawn' as const,
  consentText: 'Full terms text snapshot for hash',
}

describe('Consent API (integration)', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: { where?: { id?: string } }) => {
      if (args?.where?.id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
  })

  describe('GET /v1/consent/templates/:type (public)', () => {
    it('200 returns terms template', async () => {
      const res = await request(app).get('/v1/consent/templates/terms').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBeDefined()
      expect(res.body.data.documentId).toMatch(/terms/)
      expect(res.body.data.content.length).toBeGreaterThan(50)
    })

    it('200 returns hipaa template', async () => {
      const res = await request(app).get('/v1/consent/templates/hipaa').expect(200)
      expect(res.body.data.title).toBeDefined()
    })

    it('404 for unknown type', async () => {
      const res = await request(app).get('/v1/consent/templates/unknown-type-xyz').expect(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /v1/consent/templates (public list)', () => {
    it('200 lists metadata for all types', async () => {
      const res = await request(app).get('/v1/consent/templates').expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.terms.version).toBeDefined()
      expect(res.body.data.hipaa.documentId).toBeDefined()
    })
  })

  describe('POST /v1/consent', () => {
    it('401 without Authorization', async () => {
      await request(app).post('/v1/consent').send(validConsentBody).expect(401)
    })

    it('201 creates consent when valid', async () => {
      vi.mocked(prisma.consent.findFirst).mockResolvedValue(null as any)
      vi.mocked(prisma.consent.create).mockResolvedValue({
        id: 'consent-1',
        userId: plaintiffUser.id,
        ...validConsentBody,
        grantedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/v1/consent')
        .set(authHeader(plaintiffUser.id))
        .send(validConsentBody)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBeDefined()
      expect(prisma.consent.create).toHaveBeenCalled()
    })

    it('400 when body invalid', async () => {
      const res = await request(app)
        .post('/v1/consent')
        .set(authHeader(plaintiffUser.id))
        .send({ consentType: 'invalid_enum' })
        .expect(400)
      expect(res.body.success).toBe(false)
    })

    it('400 when the same consent version is already granted', async () => {
      vi.mocked(prisma.consent.findFirst).mockResolvedValue({
        id: 'consent-existing',
        userId: plaintiffUser.id,
        consentType: 'terms',
        version: '1.0',
        granted: true,
      } as any)

      const res = await request(app)
        .post('/v1/consent')
        .set(authHeader(plaintiffUser.id))
        .send(validConsentBody)
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toMatch(/already granted/i)
      expect(prisma.consent.create).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /v1/consent/:id', () => {
    it('200 revokes a consent and clears granted state', async () => {
      vi.mocked(prisma.consent.findFirst).mockResolvedValue({
        id: 'consent-1',
        userId: plaintiffUser.id,
        granted: true,
      } as any)
      vi.mocked(prisma.consent.update).mockResolvedValue({
        id: 'consent-1',
        userId: plaintiffUser.id,
        granted: false,
      } as any)

      const res = await request(app)
        .patch('/v1/consent/consent-1')
        .set(authHeader(plaintiffUser.id))
        .send({ revokedAt: '2026-04-04T00:00:00.000Z' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(prisma.consent.update).toHaveBeenCalledWith({
        where: { id: 'consent-1' },
        data: expect.objectContaining({
          granted: false,
          revokedAt: new Date('2026-04-04T00:00:00.000Z'),
        }),
      })
    })
  })

  describe('GET /v1/consent/status/:userId', () => {
    it('403 when path userId does not match token user', async () => {
      const res = await request(app)
        .get('/v1/consent/status/other-user-id')
        .set(authHeader(plaintiffUser.id))
        .expect(403)
      expect(res.body.error).toMatch(/Access denied/)
    })

    it('200 returns status shape for self', async () => {
      vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)
      vi.mocked(prisma.consent.findMany).mockResolvedValue([] as any)

      const res = await request(app)
        .get(`/v1/consent/status/${plaintiffUser.id}`)
        .set(authHeader(plaintiffUser.id))
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.userId).toBe(plaintiffUser.id)
      expect(Array.isArray(res.body.data.status)).toBe(true)
      expect(res.body.data.status.length).toBe(3)
    })

    it('marks outdated consent versions in status output', async () => {
      vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)
      vi.mocked(prisma.consent.findMany).mockResolvedValue([
        {
          consentType: 'terms',
          version: '0.9',
          granted: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          grantedAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: null,
        },
        {
          consentType: 'hipaa',
          version: '1.0',
          granted: true,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          grantedAt: new Date('2026-01-02T00:00:00.000Z'),
          expiresAt: null,
        },
        {
          consentType: 'privacy',
          version: '1.0',
          granted: true,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          grantedAt: new Date('2026-01-03T00:00:00.000Z'),
          expiresAt: null,
        },
      ] as any)

      const res = await request(app)
        .get(`/v1/consent/status/${plaintiffUser.id}`)
        .set(authHeader(plaintiffUser.id))
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.outdated).toContain('terms')
      expect(res.body.data.missingConsents).toContain('terms')
      const terms = res.body.data.status.find((item: any) => item.type === 'terms')
      expect(terms.version).toBe('0.9')
      expect(terms.versionMatches).toBe(false)
    })
  })

  describe('GET /v1/consent/my-consents', () => {
    it('200 lists consents for user', async () => {
      vi.mocked(prisma.consent.findMany).mockResolvedValue([
        { id: 'c1', consentType: 'terms', version: '1.0', granted: true },
      ] as any)

      const res = await request(app).get('/v1/consent/my-consents').set(authHeader(plaintiffUser.id)).expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBe(1)
    })
  })
})
