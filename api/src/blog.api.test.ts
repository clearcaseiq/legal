import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@test.local',
  firstName: 'Ada',
  lastName: 'Ops',
  role: 'admin',
  isActive: true,
  adminCapabilities: JSON.stringify(['oversight']),
}

const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  role: 'attorney',
  isActive: true,
}

const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const attorneyAuth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const PUBLISHED = {
  id: 'post-1',
  slug: 'demand-letters',
  title: 'Demand letters',
  excerpt: 'What they are',
  body: 'A demand letter asks the insurer to pay.',
  published: true,
  publishedAt: new Date('2026-08-01'),
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
  author: { firstName: 'Ada', lastName: 'Ops' },
}

const posts = () => (prisma as any).blogPost

function signedInAs(user: Record<string, unknown>) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
}

describe('blog', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    signedInAs(adminUser)
    vi.mocked(posts().findMany).mockResolvedValue([PUBLISHED] as any)
    vi.mocked(posts().count).mockResolvedValue(1 as any)
    vi.mocked(posts().findFirst).mockResolvedValue(PUBLISHED as any)
    vi.mocked(posts().findUnique).mockResolvedValue(null as any)
    vi.mocked(posts().create).mockImplementation((args: any) =>
      Promise.resolve({ ...PUBLISHED, ...args.data, author: adminUser }),
    )
    vi.mocked(posts().update).mockImplementation((args: any) =>
      Promise.resolve({ ...PUBLISHED, ...args.data }),
    )
    vi.mocked(posts().delete).mockResolvedValue(PUBLISHED as any)
  })

  it('lists only posts the public router asks Prisma to treat as published', async () => {
    const res = await request(app).get('/v1/blog')
    expect(res.status).toBe(200)
    const where = (vi.mocked(posts().findMany).mock.calls.at(-1)?.[0] as any).where
    expect(where.published).toBe(true)
    expect(where.publishedAt.lte).toBeInstanceOf(Date)
    expect(res.body.data[0].title).toBe('Demand letters')
    expect(res.body.data[0].body).toBeUndefined()
  })

  it('does not show a draft on the public slug route', async () => {
    vi.mocked(posts().findFirst).mockResolvedValue(null as any)
    const res = await request(app).get('/v1/blog/draft-post')
    expect(res.status).toBe(404)
    const where = (vi.mocked(posts().findFirst).mock.calls.at(-1)?.[0] as any).where
    expect(where.slug).toBe('draft-post')
    expect(where.published).toBe(true)
  })

  it('creates a post for an admin and refuses an attorney', async () => {
    const created = await request(app).post('/v1/admin/blog').set(adminAuth).send({
      title: 'Demand letters',
      body: 'A demand letter asks the insurer to pay.',
      published: true,
    })
    expect(created.status).toBe(201)
    expect(created.body.data.slug).toBe('demand-letters')

    signedInAs(attorneyUser)
    const denied = await request(app).post('/v1/admin/blog').set(attorneyAuth).send({
      title: 'Nope',
      body: 'x',
    })
    expect(denied.status).toBe(403)
  })

  it('unpublishes a post so it leaves the public site', async () => {
    vi.mocked(posts().findUnique).mockResolvedValue(PUBLISHED as any)
    const res = await request(app)
      .patch('/v1/admin/blog/post-1')
      .set(adminAuth)
      .send({ published: false })
    expect(res.status).toBe(200)
    const data = (vi.mocked(posts().update).mock.calls.at(-1)?.[0] as any).data
    expect(data.published).toBe(false)
    expect(data.publishedAt).toBeNull()
  })
})
