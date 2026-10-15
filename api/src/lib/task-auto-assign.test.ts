import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    caseTask: { findMany: vi.fn(), updateMany: vi.fn() },
    firmMember: { findMany: vi.fn() },
  },
}))
vi.mock('./case-coach-loop', () => ({ resolveCaseAssignees: vi.fn() }))

import { prisma } from './prisma'
import { resolveCaseAssignees } from './case-coach-loop'
import { assignRoleOnlyTasks, pickAssigneeForRole } from './task-auto-assign'

const MEMBERS = [
  { userId: 'u-att', role: 'attorney', name: 'Alex Attorney' },
  { userId: 'u-para', role: 'paralegal', name: 'Pat Paralegal' },
  { userId: 'u-cm', role: 'case_manager', name: 'Casey Manager' },
]
const ATTORNEY = { userId: 'u-att', name: 'Alex Attorney' }

describe('pickAssigneeForRole', () => {
  it('picks the employee who holds the role', () => {
    expect(pickAssigneeForRole('case_manager', MEMBERS, ATTORNEY)).toEqual({ userId: 'u-cm', name: 'Casey Manager' })
  })

  it('falls back within the paralegal family', () => {
    const noCm = MEMBERS.filter((m) => m.role !== 'case_manager')
    expect(pickAssigneeForRole('case_manager', noCm, ATTORNEY)?.userId).toBe('u-para')
  })

  it('falls back to the case attorney for a role nobody holds, or no role', () => {
    expect(pickAssigneeForRole('billing_admin', MEMBERS, ATTORNEY)?.userId).toBe('u-att')
    expect(pickAssigneeForRole(null, MEMBERS, ATTORNEY)?.userId).toBe('u-att')
  })
})

describe('assignRoleOnlyTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveCaseAssignees).mockResolvedValue({
      lawFirmId: 'firm-1',
      attorneyId: 'att-1',
      attorneyName: 'Alex Attorney',
      attorneyEmail: null,
      attorneyUserId: 'u-att',
      paralegalUserId: 'u-para',
      paralegalName: 'Pat Paralegal',
    } as never)
    vi.mocked(prisma.firmMember.findMany).mockResolvedValue(
      MEMBERS.map((m) => {
        const [firstName, lastName] = m.name.split(' ')
        return { userId: m.userId, role: m.role, user: { firstName, lastName, email: null } }
      }) as never,
    )
    vi.mocked(prisma.caseTask.updateMany).mockResolvedValue({ count: 1 } as never)
  })

  it('puts a named employee on role-only tasks and leaves the Auto intake rows', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      { id: 't-lor', title: 'Send letters of representation to providers', assignedRole: 'paralegal' },
      { id: 't-claims', title: 'Open insurance claims (liability + UM/UIM)', assignedRole: 'case_manager' },
      { id: 't-retainer', title: 'Send retainer to client', assignedRole: 'attorney' },
    ] as never)

    expect(await assignRoleOnlyTasks('asm-1')).toBe(2)

    expect(prisma.caseTask.updateMany).toHaveBeenCalledWith({
      where: { id: 't-lor', assignedUserId: null },
      data: { assignedUserId: 'u-para', assignedTo: 'Pat Paralegal' },
    })
    expect(prisma.caseTask.updateMany).toHaveBeenCalledWith({
      where: { id: 't-claims', assignedUserId: null },
      data: { assignedUserId: 'u-cm', assignedTo: 'Casey Manager' },
    })
  })

  it('skips client tasks and Rose tasks held for review', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as never)

    await assignRoleOnlyTasks('asm-1')

    const where = (vi.mocked(prisma.caseTask.findMany).mock.calls[0][0] as any).where
    expect(where.OR).toEqual([{ reviewStatus: null }, { reviewStatus: { not: 'pending' } }])
    expect(where.AND).toEqual([{ OR: [{ assignedRole: null }, { assignedRole: { notIn: ['client', 'plaintiff'] } }] }])
  })

  it('does nothing when the case has no firm or attorney yet', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      { id: 't-1', title: 'Request police report', assignedRole: 'paralegal' },
    ] as never)
    vi.mocked(resolveCaseAssignees).mockResolvedValue({ lawFirmId: null, attorneyUserId: null } as never)

    expect(await assignRoleOnlyTasks('asm-1')).toBe(0)
    expect(prisma.caseTask.updateMany).not.toHaveBeenCalled()
  })
})
