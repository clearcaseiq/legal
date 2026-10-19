import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../lib/prisma', () => ({
  prisma: {
    attorney: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    const role = req.headers['x-test-role']
    req.user = { id: 'u-1', email: role === 'admin' ? 'ops@example.com' : 'someone@example.com', role }
    next()
  },
}))

vi.mock('../lib/admin-audit', () => ({ writeAdminAudit: vi.fn() }))

import router, { parseRange } from './admin-attorney-activity'

const app = express()
app.use('/v1/admin', router)

describe('admin attorney activity routes', () => {
  it.each(['/v1/admin/attorney-activity', '/v1/admin/attorney-activity/att-1', '/v1/admin/attorney-activity/att-1/export.csv'])(
    'refuses non-admins at %s',
    async (path) => {
      for (const role of ['attorney', 'staff', 'plaintiff']) {
        const res = await request(app).get(path).set('x-test-role', role)
        expect(res.status).toBe(403)
      }
    },
  )

  it('lets an admin load the list', async () => {
    const res = await request(app).get('/v1/admin/attorney-activity').set('x-test-role', 'admin')
    expect(res.status).toBe(200)
    expect(res.body.attorneys).toEqual([])
  })

  it('returns 404 for an attorney with no account', async () => {
    const res = await request(app).get('/v1/admin/attorney-activity/att-x').set('x-test-role', 'admin')
    expect(res.status).toBe(404)
  })
})

describe('parseRange', () => {
  const now = new Date('2026-10-18T12:00:00Z')

  it('defaults to the last 30 days', () => {
    const r = parseRange({}, now)
    expect(r.to).toEqual(now)
    expect(now.getTime() - r.from.getTime()).toBe(30 * 86_400_000)
  })

  it('caps the range at a year and repairs an inverted range', () => {
    expect(now.getTime() - parseRange({ from: '2020-01-01' }, now).from.getTime()).toBe(366 * 86_400_000)
    const inverted = parseRange({ from: '2026-10-20', to: '2026-10-01' }, now)
    expect(inverted.from < inverted.to).toBe(true)
  })
})
