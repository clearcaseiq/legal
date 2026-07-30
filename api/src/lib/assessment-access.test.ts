import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { canReadAssessment } from './assessment-access'

function assessment(overrides: Partial<any> = {}) {
  return {
    id: 'assess-1',
    userId: 'user-1',
    lawFirmId: null,
    leadSubmission: null,
    ...overrides,
  }
}

describe('canReadAssessment', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.firmMember.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)
  })

  it('reports not found for an unknown assessment', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)

    const result = await canReadAssessment('nope', null)

    expect(result).toMatchObject({ allowed: false, status: 404 })
  })

  it('allows an anonymous read of a pre-account intake', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment({ userId: null }) as any)

    const result = await canReadAssessment('assess-1', null)

    expect(result).toMatchObject({ allowed: true, anonymous: true })
  })

  it('requires authentication once the case has an owner', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment() as any)

    const result = await canReadAssessment('assess-1', null)

    expect(result).toMatchObject({ allowed: false, status: 401 })
  })

  it('allows the owning plaintiff', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment() as any)

    const result = await canReadAssessment('assess-1', { id: 'user-1' })

    expect(result.allowed).toBe(true)
  })

  it('refuses an unrelated logged-in user', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment() as any)

    const result = await canReadAssessment('assess-1', { id: 'someone-else' })

    expect(result).toMatchObject({ allowed: false, status: 403 })
  })

  it('allows an admin', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment() as any)

    const result = await canReadAssessment('assess-1', { id: 'admin-1', role: 'admin' })

    expect(result.allowed).toBe(true)
  })

  it('allows the attorney the case was assigned to', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      assessment({ leadSubmission: { assignedAttorneyId: 'att-1', assignmentType: 'exclusive', status: 'retained' } }) as any,
    )
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1', lawFirmId: 'firm-1' } as any)

    const result = await canReadAssessment('assess-1', { id: 'user-att', email: 'a@f.com' })

    expect(result.allowed).toBe(true)
  })

  it('allows an attorney who was offered the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      assessment({ leadSubmission: { assignedAttorneyId: 'other', assignmentType: 'shared', status: 'submitted' } }) as any,
    )
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-2', lawFirmId: null } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({ id: 'intro-1' } as any)

    const result = await canReadAssessment('assess-1', { id: 'user-att2', email: 'b@f.com' })

    expect(result.allowed).toBe(true)
  })

  it('refuses an attorney with no offer on the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      assessment({ leadSubmission: { assignedAttorneyId: 'other', assignmentType: 'exclusive', status: 'retained' } }) as any,
    )
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-3', lawFirmId: 'firm-9' } as any)

    const result = await canReadAssessment('assess-1', { id: 'user-att3', email: 'c@f.com' })

    expect(result).toMatchObject({ allowed: false, status: 403 })
  })

  it('allows staff at the firm holding the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment({ lawFirmId: 'firm-1' }) as any)
    vi.mocked(prisma.firmMember.findMany).mockResolvedValue([{ lawFirmId: 'firm-1' }] as any)

    const result = await canReadAssessment('assess-1', { id: 'user-staff' })

    expect(result.allowed).toBe(true)
  })

  it('refuses staff at a different firm', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessment({ lawFirmId: 'firm-1' }) as any)
    vi.mocked(prisma.firmMember.findMany).mockResolvedValue([{ lawFirmId: 'firm-2' }] as any)

    const result = await canReadAssessment('assess-1', { id: 'user-staff' })

    expect(result).toMatchObject({ allowed: false, status: 403 })
  })
})
