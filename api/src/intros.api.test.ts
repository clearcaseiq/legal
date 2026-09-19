import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/auth')>()
  const users: Record<string, any> = {
    plaintiff: {
      id: 'user-1',
      email: 'plaintiff@example.com',
      role: 'user',
      isActive: true,
    },
    otherPlaintiff: {
      id: 'user-2',
      email: 'other@example.com',
      role: 'user',
      isActive: true,
    },
    attorney: {
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      role: 'user',
      isActive: true,
    },
    admin: {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
    },
  }

  return {
    ...actual,
    authMiddleware: (req: any, res: any, next: any) => {
      const header = req.headers.authorization
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
      }
      const user = users[header.substring(7)]
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      req.user = user
      next()
    },
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('POST /v1/intros/request', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('401 without auth', async () => {
    const res = await request(app).post('/v1/intros/request').send({
      assessmentId: 'asm-1',
      attorneyId: 'att-1',
    })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No token provided' })
  })

  it('404 when assessment missing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/intros/request')
      .set('Authorization', 'Bearer plaintiff')
      .send({
        assessmentId: 'missing-asm',
        attorneyId: 'att-1',
        message: 'Hello',
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/Assessment not found/i)
  })

  it('403 when assessment belongs to another user', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'asm-1', userId: 'user-2' } as any)

    const res = await request(app)
      .post('/v1/intros/request')
      .set('Authorization', 'Bearer plaintiff')
      .send({
        assessmentId: 'asm-1',
        attorneyId: 'att-1',
      })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Unauthorized' })
    expect(prisma.attorney.findUnique).not.toHaveBeenCalled()
    expect(prisma.introduction.create).not.toHaveBeenCalled()
  })

  it('404 when attorney missing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'asm-1', userId: 'user-1' } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/intros/request')
      .set('Authorization', 'Bearer plaintiff')
      .send({
        assessmentId: 'asm-1',
        attorneyId: 'missing-att',
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/Attorney not found/i)
  })

  it('200 creates introduction', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'asm-1', userId: 'user-1' } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked(prisma.introduction.create).mockResolvedValue({
      id: 'intro-new',
      assessmentId: 'asm-1',
      attorneyId: 'att-1',
      status: 'PENDING',
      message: '',
      requestedAt: new Date(),
    } as any)

    const res = await request(app)
      .post('/v1/intros/request')
      .set('Authorization', 'Bearer plaintiff')
      .send({
        assessmentId: 'asm-1',
        attorneyId: 'att-1',
        message: 'Please review',
      })

    expect(res.status).toBe(200)
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      select: { id: true, userId: true },
    })
    expect(prisma.attorney.findUnique).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      select: { id: true },
    })
    expect(prisma.introduction.create).toHaveBeenCalled()
    expect(res.body.intro_id).toBe('intro-new')
  })
})

describe('GET /v1/intros', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('401 when intro detail requested anonymously', async () => {
    const res = await request(app).get('/v1/intros/nope')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No token provided' })
  })

  it('404 when intro missing', async () => {
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(null as any)
    const res = await request(app)
      .get('/v1/intros/nope')
      .set('Authorization', 'Bearer plaintiff')
    expect(res.status).toBe(404)
  })

  it('403 blocks intro detail for unrelated users', async () => {
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue({
      id: 'intro-x',
      assessment: { userId: 'user-2' },
      attorney: { name: 'Jane Counsel', email: 'attorney@example.com' },
    } as any)

    const res = await request(app)
      .get('/v1/intros/intro-x')
      .set('Authorization', 'Bearer plaintiff')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('200 returns intro detail for the targeted attorney', async () => {
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue({
      id: 'intro-x',
      assessmentId: 'asm-1',
      attorneyId: 'att-1',
      status: 'PENDING',
      message: 'Hi',
      requestedAt: new Date(),
      respondedAt: null,
      assessment: { userId: 'user-2' },
      attorney: { name: 'Jane Counsel', email: 'attorney@example.com' },
    } as any)

    const res = await request(app)
      .get('/v1/intros/intro-x')
      .set('Authorization', 'Bearer attorney')
    expect(res.status).toBe(200)
    expect(res.body.attorney_name).toBe('Jane Counsel')
    expect(prisma.introduction.findUnique).toHaveBeenCalledWith({
      where: { id: 'intro-x' },
      select: {
        id: true,
        assessmentId: true,
        attorneyId: true,
        status: true,
        message: true,
        requestedAt: true,
        respondedAt: true,
        assessment: {
          select: {
            userId: true,
          },
        },
        attorney: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  })

  it('lists intros for the assessment owner with compact attorney fields', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'user-1' } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      {
        id: 'i1',
        status: 'PENDING',
        attorneyId: 'a1',
        attorney: { name: 'A' },
        requestedAt: new Date(),
        respondedAt: null,
      },
    ] as any)

    const res = await request(app)
      .get('/v1/intros/assessment/asm-1')
      .set('Authorization', 'Bearer plaintiff')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].intro_id).toBe('i1')
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      select: { userId: true },
    })
    expect(prisma.introduction.findMany).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        status: true,
        attorneyId: true,
        requestedAt: true,
        respondedAt: true,
        attorney: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    })
  })

  it('403 blocks assessment intro list for unrelated users', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'user-2' } as any)

    const res = await request(app)
      .get('/v1/intros/assessment/asm-1')
      .set('Authorization', 'Bearer plaintiff')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Unauthorized' })
    expect(prisma.introduction.findMany).not.toHaveBeenCalled()
  })
})

/**
 * The short link in a routed-case text. It exists because the real destination
 * is around eighty characters, which would cost the message a segment on its
 * own; the six-character code is already there for the ACCEPT reply.
 */
describe('GET /v1/intros/by-code/:code', () => {
  const app = buildApp()

  // `offerReferenceCode` is the first six characters of the id, uppercased.
  const INTRO_ID = 'cmu7y2gp90002iq5z3byptk4e'
  const CODE = 'CMU7Y2'

  const offer = (overrides: Record<string, unknown> = {}) => ({
    id: INTRO_ID,
    assessmentId: 'asm-1',
    status: 'PENDING',
    assessment: { userId: 'user-1' },
    attorney: { email: 'attorney@example.com' },
    ...overrides,
  })

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('401 without auth, so a code alone never confirms a case exists', async () => {
    const res = await request(app).get(`/v1/intros/by-code/${CODE}`)

    expect(res.status).toBe(401)
    expect(prisma.introduction.findMany).not.toHaveBeenCalled()
  })

  it('resolves the code to the case the text was about', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([offer()] as any)
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue({ id: 'lead-9' } as any)

    const res = await request(app)
      .get(`/v1/intros/by-code/${CODE}`)
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      introId: INTRO_ID,
      status: 'PENDING',
      path: '/attorney-dashboard/lead/lead-9/overview',
    })
  })

  it('accepts the code in the case the attorney typed it', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([offer()] as any)
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue({ id: 'lead-9' } as any)

    const res = await request(app)
      .get(`/v1/intros/by-code/${CODE.toLowerCase()}`)
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(200)
  })

  it('404s a code belonging to a different attorney', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      offer({ assessment: { userId: 'user-2' }, attorney: { email: 'someone-else@example.com' } }),
    ] as any)

    const res = await request(app)
      .get(`/v1/intros/by-code/${CODE}`)
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(404)
  })

  it('picks the reader\'s offer when two share a six-character prefix', async () => {
    // Six characters is short, so a collision is possible. Who is asking
    // settles it rather than the code.
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      offer({
        id: 'cmu7y2zzzzzzzzzzzzzzzzzzz',
        assessment: { userId: 'user-2' },
        attorney: { email: 'someone-else@example.com' },
      }),
      offer(),
    ] as any)
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue({ id: 'lead-9' } as any)

    const res = await request(app)
      .get(`/v1/intros/by-code/${CODE}`)
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(200)
    expect(res.body.introId).toBe(INTRO_ID)
  })

  it('falls back to the dashboard when the offer has no lead to open', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([offer()] as any)
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .get(`/v1/intros/by-code/${CODE}`)
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(200)
    expect(res.body.path).toBe('/attorney-dashboard')
  })

  it('400s a malformed code without touching the database', async () => {
    const res = await request(app)
      .get('/v1/intros/by-code/nope')
      .set('Authorization', 'Bearer attorney')

    expect(res.status).toBe(400)
    expect(prisma.introduction.findMany).not.toHaveBeenCalled()
  })
})
