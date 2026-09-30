/**
 * Non-attorney firm staff open the same case workspace a firm admin does.
 *
 * Staff have a User + FirmMember but no Attorney row. They read the case under
 * the same case-team rule as attorney colleagues, and every write they make is
 * held to their firm role's permissions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()
const user = { id: 'staff-1', email: 'kia.intake@test.local', role: 'staff', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(user.id)}` }

const asMember = (role: string) => {
  vi.mocked((prisma as any).firmMember.findFirst).mockResolvedValue({
    id: 'fm-1',
    userId: user.id,
    lawFirmId: 'firm-1',
    role,
    permissions: null,
    status: 'active',
    lawFirm: { rolePermissions: null },
  } as any)
}

const lead = (overrides: Record<string, unknown> = {}) =>
  vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue({
    id: 'lead-1',
    assessmentId: 'asm-1',
    assignedAttorneyId: 'att-main',
    assignmentType: 'exclusive',
    status: 'retained',
    ...overrides,
  } as any)

/** A case team exists and the caller is (or is not) on it. */
const staffed = (onTeam: boolean) =>
  vi.mocked((prisma as any).firmCaseAssignment.findFirst).mockImplementation(async (args: any) => {
    if (args?.where?.role === 'lead_attorney') return null
    return args?.where?.OR ? (onTeam ? ({ id: 'fca-me' } as any) : null) : ({ id: 'fca-other' } as any)
  })

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
  vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue(null)
  vi.mocked((prisma as any).caseWorkflow.findUnique).mockResolvedValue({ lawFirmId: 'firm-1', items: [] } as any)
  lead()
})

describe('staff reading a firm case', () => {
  const reads = ['command-center', 'tasks', 'evidence', 'insurance', 'workflow', 'intelligence', 'damages']

  it.each(reads)('lets an intake specialist read %s on an unstaffed case', async (path) => {
    asMember('intake_specialist')

    const res = await request(app).get(`/v1/attorney-dashboard/leads/lead-1/${path}`).set(auth)

    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('refuses staff once the case is staffed with other people', async () => {
    asMember('intake_specialist')
    staffed(false)

    const res = await request(app).get('/v1/attorney-dashboard/leads/lead-1/command-center').set(auth)

    expect(res.status).toBe(403)
  })

  it('lets staff on the case team read a staffed case', async () => {
    asMember('paralegal')
    staffed(true)

    const res = await request(app).get('/v1/attorney-dashboard/leads/lead-1/command-center').set(auth)

    expect(res.status).not.toBe(403)
  })

  it('refuses staff from another firm', async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).caseWorkflow.findUnique).mockResolvedValue({ lawFirmId: 'firm-2', items: [] } as any)

    const res = await request(app).get('/v1/attorney-dashboard/leads/lead-1/command-center').set(auth)

    expect(res.status).toBe(403)
  })
})

describe('staff writes', () => {
  it('lets a case manager create a task', async () => {
    asMember('case_manager')
    vi.mocked((prisma as any).caseTask.create).mockResolvedValue({ id: 't-1', title: 'x', assessmentId: 'asm-1' } as any)

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/tasks').set(auth).send({ title: 'x' })

    expect(res.status).toBe(200)
    expect((prisma as any).caseTask.create).toHaveBeenCalled()
  })

  it('refuses task creation to a role without manage_assigned_cases', async () => {
    asMember('intake_specialist')

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/tasks').set(auth).send({ title: 'x' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/firm role/i)
    expect((prisma as any).caseTask.create).not.toHaveBeenCalled()
  })

  describe('working a task without manage_assigned_cases', () => {
    const task = (assignedUserId: string | null) =>
      vi.mocked((prisma as any).caseTask.findUnique).mockResolvedValue({
        id: 't-1',
        assessmentId: 'asm-1',
        title: 'Collect records',
        status: 'open',
        assignedUserId,
      } as any)

    it('lets a legal assistant complete a task assigned to them', async () => {
      asMember('legal_assistant')
      task(user.id)

      const res = await request(app).patch('/v1/attorney-dashboard/leads/lead-1/tasks/t-1').set(auth).send({ status: 'done' })

      expect(res.status).not.toBe(403)
      expect((prisma as any).caseTask.update).toHaveBeenCalled()
    })

    it('refuses re-planning their own task', async () => {
      asMember('legal_assistant')
      task(user.id)

      const res = await request(app).patch('/v1/attorney-dashboard/leads/lead-1/tasks/t-1').set(auth).send({ title: 'New' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
    })

    it("refuses someone else's task", async () => {
      asMember('legal_assistant')
      task('someone-else')

      const res = await request(app).patch('/v1/attorney-dashboard/leads/lead-1/tasks/t-1').set(auth).send({ status: 'done' })

      expect(res.status).toBe(403)
      expect((prisma as any).caseTask.update).not.toHaveBeenCalled()
    })
  })

  it('holds case-data edits to manage_assigned_cases', async () => {
    asMember('intake_specialist')

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/damages').set(auth).send({ category: 'medical', amount: 100 })

    expect(res.status).toBe(403)
  })

  it('lets a case manager record damages', async () => {
    asMember('case_manager')

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/damages').set(auth).send({ category: 'medical', amount: 100 })

    expect(res.status).not.toBe(403)
  })

  it('opens invoices to billing roles only', async () => {
    asMember('paralegal')
    const refused = await request(app).post('/v1/attorney-dashboard/leads/lead-1/invoices').set(auth).send({ amount: 100 })
    expect(refused.status).toBe(403)

    asMember('billing_admin')
    const allowed = await request(app).post('/v1/attorney-dashboard/leads/lead-1/invoices').set(auth).send({ amount: 100 })
    expect(allowed.status).not.toBe(403)
  })

  it('signs a staff note with the staff member rather than an attorney', async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).caseNote.create).mockResolvedValue({ id: 'n-1' } as any)

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/notes').set(auth).send({ message: 'Called client' })

    expect(res.status).toBe(200)
    expect((prisma as any).caseNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: user.id, authorEmail: user.email }) }),
    )
  })

  describe('client messaging', () => {
    const room = () => {
      vi.mocked((prisma as any).chatRoom.findUnique).mockResolvedValue({ attorneyId: 'att-main', assessmentId: 'asm-1' } as any)
      vi.mocked((prisma as any).chatRoom.findFirst).mockResolvedValue({ id: 'room-1', userId: 'plaintiff-1' } as any)
      vi.mocked((prisma as any).leadSubmission.findMany).mockResolvedValue([{ id: 'lead-1' }] as any)
      vi.mocked((prisma as any).attorney.findUnique).mockResolvedValue({ id: 'att-main', lawFirmId: 'firm-1', name: 'Ann Lead' } as any)
      vi.mocked((prisma as any).message.create).mockResolvedValue({ id: 'm-1', content: 'Hi', senderType: 'attorney' } as any)
    }

    it("sends a case manager's message in the lead attorney's room, signed by the staff member", async () => {
      asMember('case_manager')
      room()

      const res = await request(app).post('/v1/attorney-dashboard/messaging/send').set(auth).send({ chatRoomId: 'room-1', content: 'Hi' })

      expect(res.status).toBe(201)
      expect((prisma as any).chatRoom.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'room-1', attorneyId: 'att-main' } }),
      )
      const data = vi.mocked((prisma as any).message.create).mock.calls[0][0].data
      expect(data.senderId).toBe(user.id)
      expect(JSON.parse(data.metadata)).toMatchObject({ sentByUserId: user.id, onBehalfOfAttorneyId: 'att-main' })
    })

    it('refuses a role without message_plaintiffs', async () => {
      asMember('paralegal')
      room()

      const res = await request(app).post('/v1/attorney-dashboard/messaging/send').set(auth).send({ chatRoomId: 'room-1', content: 'Hi' })

      expect(res.status).toBe(403)
      expect((prisma as any).message.create).not.toHaveBeenCalled()
    })

    it("does not let staff into a room that is not the case's lead-attorney room", async () => {
      asMember('case_manager')
      room()
      vi.mocked((prisma as any).chatRoom.findUnique).mockResolvedValue({ attorneyId: 'att-other', assessmentId: 'asm-1' } as any)

      const res = await request(app).get('/v1/attorney-dashboard/messaging/chat-room/room-1/messages').set(auth)

      expect(res.status).toBe(404)
    })
  })

  it('refuses closing a case to a role without manage_assigned_cases', async () => {
    asMember('intake_specialist')

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/close').set(auth).send({})

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
  })

  it('refuses renaming a case to a role without manage_assigned_cases', async () => {
    asMember('legal_assistant')

    const res = await request(app).patch('/v1/attorney-dashboard/leads/lead-1/case-name').set(auth).send({ caseName: 'x' })

    expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
  })

  it('refuses a record request to a role without Documents & records', async () => {
    asMember('billing_admin')

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/document-request')
      .set(auth)
      .send({ requestedDocs: ['medical_records'] })

    expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
  })

  it("schedules an intake specialist's consult on behalf of the lead attorney", async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).attorney.findUnique).mockResolvedValue({ id: 'att-main', lawFirmId: 'firm-1' } as any)
    vi.mocked((prisma as any).assessment.findUnique).mockResolvedValue({ userId: null } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/schedule-consult')
      .set(auth)
      .send({ date: '2099-01-01', time: '2:00 PM', meetingType: 'phone' })

    // Past auth, the permission gate and the acting-attorney lookup; stops on the mock's missing plaintiff.
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Plaintiff user not found/)
  })

  it('asks for a lead attorney when the case has none', async () => {
    asMember('intake_specialist')
    lead({ assignedAttorneyId: null })

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/schedule-consult')
      .set(auth)
      .send({ date: '2099-01-01', time: '2:00 PM' })

    expect(res.status).toBe(409)
  })

  it("never acts on behalf of another firm's attorney", async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).attorney.findUnique).mockResolvedValue({ id: 'att-main', lawFirmId: 'firm-2' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/document-request')
      .set(auth)
      .send({ requestedDocs: ['medical_records'] })

    expect(res.status).toBe(409)
  })
})

describe('GET /v1/attorney-dashboard/access', () => {
  it('reports the manage action', async () => {
    asMember('intake_specialist')

    const res = await request(app).get('/v1/attorney-dashboard/access').set(auth)

    expect(res.body.actions).toMatchObject({ manage: false, schedule: true, request: true, billing: false })
  })
})
