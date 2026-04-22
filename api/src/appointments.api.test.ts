import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const plaintiffUser = {
  id: 'user-pl-1',
  email: 'plaintiff@test.local',
  firstName: 'Pat',
  lastName: 'Lee',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

describe('POST /v1/appointments', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      isActive: true,
      name: 'Alex Attorney',
    } as any)
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
    } as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.attorneyCalendarBusyBlock.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadSubmission.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.routingAnalytics.create).mockResolvedValue({ id: 'evt-1' } as any)
  })

  it('blocks booking until the matched attorney accepts the case', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/appointments')
      .set(authHeader(plaintiffUser.id))
      .send({
        attorneyId: 'att-1',
        assessmentId: 'asm-1',
        type: 'phone',
        scheduledAt: '2026-04-20T16:00:00.000Z',
        duration: 30,
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/only available after the matched attorney accepts/i)
  })

  it('creates a consultation after attorney acceptance and updates case lifecycle', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({ id: 'intro-accepted' } as any)
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: 'apt-1',
      attorney: {
        id: 'att-1',
        name: 'Alex Attorney',
        email: 'alex@test.local',
        phone: '555-111-2222',
      },
      type: 'phone',
      scheduledAt: new Date('2026-04-20T16:00:00.000Z'),
      duration: 30,
      status: 'SCHEDULED',
      meetingUrl: null,
      location: null,
      phoneNumber: null,
    } as any)

    const res = await request(app)
      .post('/v1/appointments')
      .set(authHeader(plaintiffUser.id))
      .send({
        attorneyId: 'att-1',
        assessmentId: 'asm-1',
        type: 'phone',
        scheduledAt: '2026-04-20T16:00:00.000Z',
        duration: 30,
      })

    expect(res.status).toBe(201)
    expect(prisma.leadSubmission.updateMany).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1' },
      data: expect.objectContaining({
        lifecycleState: 'consultation_scheduled',
      }),
    })
    expect(prisma.routingAnalytics.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        assessmentId: 'asm-1',
        attorneyId: 'att-1',
        eventType: 'consultation_scheduled',
      }),
    }))
  })

  it('rejects overlapping slots even when the existing appointment starts earlier', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({ id: 'intro-accepted' } as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        scheduledAt: new Date('2026-04-20T16:00:00.000Z'),
        duration: 60,
        status: 'SCHEDULED',
      },
    ] as any)

    const res = await request(app)
      .post('/v1/appointments')
      .set(authHeader(plaintiffUser.id))
      .send({
        attorneyId: 'att-1',
        assessmentId: 'asm-1',
        type: 'phone',
        scheduledAt: '2026-04-20T16:30:00.000Z',
        duration: 30,
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/not available/i)
  })

  it('rejects slots blocked by a synced external calendar event', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({ id: 'intro-accepted' } as any)
    vi.mocked(prisma.attorneyCalendarBusyBlock.findMany).mockResolvedValue([
      {
        startTime: new Date('2026-04-20T16:00:00.000Z'),
        endTime: new Date('2026-04-20T17:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .post('/v1/appointments')
      .set(authHeader(plaintiffUser.id))
      .send({
        attorneyId: 'att-1',
        assessmentId: 'asm-1',
        type: 'phone',
        scheduledAt: '2026-04-20T16:30:00.000Z',
        duration: 30,
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/not available/i)
  })
})

describe('GET /v1/appointments/attorney/:attorneyId/availability', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.attorneyAvailability.findUnique).mockResolvedValue({
      attorneyId: 'att-1',
      dayOfWeek: 1,
      isAvailable: true,
      startTime: '09:00',
      endTime: '11:00',
    } as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.attorneyCalendarBusyBlock.findMany).mockResolvedValue([
      {
        startTime: new Date('2026-04-20T09:30:00.000Z'),
        endTime: new Date('2026-04-20T10:00:00.000Z'),
      },
    ] as any)
  })

  it('omits slots blocked by synced external calendar time', async () => {
    const res = await request(app).get('/v1/appointments/attorney/att-1/availability?date=2026-04-20&duration=30')

    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual([
      expect.objectContaining({ start: '2026-04-20T09:00:00.000Z' }),
      expect.objectContaining({ start: '2026-04-20T10:00:00.000Z' }),
      expect.objectContaining({ start: '2026-04-20T10:30:00.000Z' }),
    ])
    expect(res.body.slots).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ start: '2026-04-20T09:30:00.000Z' })])
    )
  })
})

describe('appointment engagement helpers via API', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-1',
      recipient: plaintiffUser.email,
      createdAt: new Date(),
      status: 'SENT',
    } as any)
  })

  it('adds a plaintiff to the earlier-slot waitlist', async () => {
    const res = await request(app)
      .post('/v1/appointments/waitlist')
      .set(authHeader(plaintiffUser.id))
      .send({
        attorneyId: 'att-1',
        assessmentId: 'asm-1',
        preferredDate: '2026-04-21T00:00:00.000Z',
      })

    expect(res.status).toBe(201)
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'waitlist',
        recipient: plaintiffUser.email,
      }),
    }))
  })

  it('returns prep items for an upcoming appointment', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'apt-1',
      userId: plaintiffUser.id,
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      scheduledAt: new Date('2026-04-20T16:00:00.000Z'),
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.notification.findFirst)
      .mockResolvedValueOnce({
        metadata: JSON.stringify({
          appointmentId: 'apt-1',
          eventType: 'prep_seeded',
          items: [
            {
              itemType: 'consult_goal',
              label: 'Write down your top three questions for the attorney',
              description: 'Bring your priorities to the call.',
              isRequired: true,
            },
          ],
        }),
      } as any)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(null as any)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as any)

    const res = await request(app)
      .get('/v1/appointments/apt-1/prep')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.prepItems).toEqual([
      expect.objectContaining({
        label: 'Write down your top three questions for the attorney',
        status: 'pending',
      }),
    ])
  })
})
