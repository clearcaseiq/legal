import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/case-notifications', () => ({
  notifyAttorneyInApp: vi.fn().mockResolvedValue(true),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { notifyAttorneyInApp } from './lib/case-notifications'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@test.local',
  firstName: 'Ada',
  lastName: 'Ops',
  role: 'admin',
  isActive: true,
  adminCapabilities: JSON.stringify(['network']),
}

const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  role: 'attorney',
  isActive: true,
}

const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const attorneyAuth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const PENDING = {
  id: 'result-1',
  attorneyId: 'att-1',
  caseType: 'Auto Accident',
  resultType: 'settlement',
  settlementAmount: 250000,
  caseDescription: 'Rear-end collision',
  date: '2024-03-01',
  venue: 'Kern County',
  caseNumber: 'CV-1',
  documentUrl: '/uploads/verdict-documents/order.pdf',
  documentName: 'order.pdf',
  status: 'pending',
  reviewNote: null,
  reviewedAt: null,
  createdAt: new Date('2024-03-15'),
  attorney: { id: 'att-1', name: 'Avery Law', email: 'attorney@test.local' },
}

const caseResults = () => (prisma as any).attorneyCaseResult

/** The data the route wrote for the last review decision. */
const lastUpdate = () => (vi.mocked(caseResults().update).mock.calls.at(-1)?.[0] as any).data

function signedInAs(user: Record<string, unknown>) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
}

describe('admin case-result review', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(notifyAttorneyInApp).mockClear()
    signedInAs(adminUser)
    vi.mocked(caseResults().findUnique).mockResolvedValue(PENDING as any)
    vi.mocked(caseResults().update).mockImplementation((args: any) =>
      Promise.resolve({ ...PENDING, ...args.data }),
    )
    vi.mocked(caseResults().findMany).mockResolvedValue([PENDING] as any)
    vi.mocked(caseResults().count).mockResolvedValue(1 as any)
  })

  describe('the queue', () => {
    it('shows pending results by default, because that is the work', async () => {
      const res = await request(app).get('/v1/admin/case-results').set(adminAuth)

      expect(res.status).toBe(200)
      const where = (vi.mocked(caseResults().findMany).mock.calls.at(-1)?.[0] as any).where
      expect(where.status).toBe('pending')
    })

    it('orders oldest first so the longest wait is reviewed next', async () => {
      await request(app).get('/v1/admin/case-results').set(adminAuth)

      const args = vi.mocked(caseResults().findMany).mock.calls.at(-1)?.[0] as any
      expect(args.orderBy).toEqual({ createdAt: 'asc' })
    })

    it('drops the status filter entirely for "all"', async () => {
      await request(app).get('/v1/admin/case-results?status=all').set(adminAuth)

      const where = (vi.mocked(caseResults().findMany).mock.calls.at(-1)?.[0] as any).where
      expect(where.status).toBeUndefined()
    })

    it('falls back to pending rather than trusting an unknown status', async () => {
      await request(app).get('/v1/admin/case-results?status=whatever').set(adminAuth)

      const where = (vi.mocked(caseResults().findMany).mock.calls.at(-1)?.[0] as any).where
      expect(where.status).toBe('pending')
    })

    it('returns the attorney alongside the result, so the reviewer has context', async () => {
      const res = await request(app).get('/v1/admin/case-results').set(adminAuth)

      expect(res.body.data[0]).toMatchObject({
        caseType: 'Auto Accident',
        attorneyName: 'Avery Law',
        documentName: 'order.pdf',
      })
    })

    it('is closed to an attorney', async () => {
      signedInAs(attorneyUser)
      const res = await request(app).get('/v1/admin/case-results').set(attorneyAuth)
      expect(res.status).toBe(403)
    })
  })

  describe('a decision', () => {
    it('marks a result verified and records who decided', async () => {
      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      expect(res.status).toBe(200)
      expect(lastUpdate()).toMatchObject({ status: 'verified', reviewedById: adminUser.id })
      expect(lastUpdate().reviewedAt).toBeInstanceOf(Date)
    })

    it('stores the reason with a rejection', async () => {
      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'reject', note: 'The order does not show the amount.' })

      expect(res.status).toBe(200)
      expect(lastUpdate()).toMatchObject({
        status: 'rejected',
        reviewNote: 'The order does not show the amount.',
      })
    })

    it('refuses a rejection with no reason, since the attorney has to act on it', async () => {
      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'reject' })

      expect(res.status).toBe(400)
      expect(caseResults().update).not.toHaveBeenCalled()
    })

    it('refuses an action it does not recognise', async () => {
      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'delete' })

      expect(res.status).toBe(400)
    })

    it('404s on a result that does not exist', async () => {
      vi.mocked(caseResults().findUnique).mockResolvedValue(null)

      const res = await request(app)
        .patch('/v1/admin/case-results/missing/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      expect(res.status).toBe(404)
    })

    it('tells the attorney when their result is verified', async () => {
      await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      expect(notifyAttorneyInApp).toHaveBeenCalledWith(
        expect.objectContaining({
          attorneyId: 'att-1',
          eventType: 'attorney.case_result_verified',
        }),
      )
    })

    it('puts the reason in the rejection notice the attorney reads', async () => {
      await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'reject', note: 'Attach the signed order.' })

      const notice = vi.mocked(notifyAttorneyInApp).mock.calls.at(-1)?.[0] as any
      expect(notice.eventType).toBe('attorney.case_result_rejected')
      expect(notice.body).toContain('Attach the signed order.')
    })

    it('still records the decision when the notification fails', async () => {
      vi.mocked(notifyAttorneyInApp).mockRejectedValue(new Error('bell down'))

      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      expect(res.status).toBe(200)
      expect(lastUpdate().status).toBe('verified')
    })

    it('writes an audit entry naming the result and the decision', async () => {
      await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      // Request-level middleware audits every call, so pick out ours by action.
      const audit = vi
        .mocked(prisma.auditLog.create)
        .mock.calls.map((call) => (call[0] as any).data)
        .find((data) => data.action === 'attorney_case_result_verify')

      expect(audit).toMatchObject({
        entityType: 'attorney_case_result',
        entityId: 'result-1',
        userId: adminUser.id,
      })
    })

    it('is closed to an attorney trying to verify their own result', async () => {
      signedInAs(attorneyUser)

      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(attorneyAuth)
        .send({ action: 'verify' })

      expect(res.status).toBe(403)
      expect(caseResults().update).not.toHaveBeenCalled()
    })

    it('is closed to an admin without the network capability', async () => {
      signedInAs({ ...adminUser, adminCapabilities: JSON.stringify(['oversight']) })

      const res = await request(app)
        .patch('/v1/admin/case-results/result-1/review')
        .set(adminAuth)
        .send({ action: 'verify' })

      expect(res.status).toBe(403)
      expect(caseResults().update).not.toHaveBeenCalled()
    })
  })
})
