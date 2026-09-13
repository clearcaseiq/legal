/**
 * The firm-side contact edit forwards the whole patch, not part of it.
 *
 * It used to name only firstName/lastName/email/phone when destructuring the
 * body, so a mailing address typed into the case workspace was accepted, echoed
 * back by the dialog, and never written — the admin route, which listed all nine
 * fields, saved the same edit correctly (CP-848). Nothing failed loudly, so this
 * goes through the real route rather than calling the library directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const ATTORNEY_USER = { id: 'user-att', email: 'att@firm.test', role: 'attorney', isActive: true }
const ATTORNEY_ID = 'att-1'
const auth = { Authorization: `Bearer ${generateToken(ATTORNEY_USER.id)}` }

const patch = (body: Record<string, unknown>) =>
  request(app).patch('/v1/attorney-dashboard/leads/lead-1/client-contact').set(auth).send(body)

/** The data handed to the single user write, whichever call made it. */
const savedUserData = () => vi.mocked(prisma.user.update).mock.calls[0]?.[0]?.data ?? {}

describe('a firm correcting its client contact details', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ATTORNEY_USER as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: ATTORNEY_ID,
      userId: ATTORNEY_USER.id,
      email: ATTORNEY_USER.email,
      lawFirmId: 'firm-1',
      isVerified: true,
    } as any)
    // Assigned to this attorney, which is what clears the authorization check.
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignedAttorneyId: ATTORNEY_ID,
      assignmentType: 'assigned',
    } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ lawFirmId: 'firm-1' } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'user-client',
      facts: { plaintiffContext: { firstName: 'Jane', phone: '+15550102456' } },
      user: {
        id: 'user-client',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+15550102456',
        passwordHash: 'hashed',
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        postalCode: null,
      },
    } as any)
  })

  it('saves a mailing address typed into the case workspace', async () => {
    const res = await patch({
      addressLine1: '123 Sample Avenue',
      addressLine2: 'Apt 4B',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90012',
    })

    expect(res.status).toBe(200)
    expect(savedUserData()).toMatchObject({
      addressLine1: '123 Sample Avenue',
      addressLine2: 'Apt 4B',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90012',
    })
  })

  it('returns the saved address, so the dialog is not echoing back what it sent', async () => {
    const res = await patch({ city: 'Los Angeles', postalCode: '90012' })

    expect(res.body.contact).toMatchObject({ city: 'Los Angeles', postalCode: '90012' })
  })

  it('still writes the phone number to both copies alongside an address', async () => {
    // The phone is the field the SMS layer reads out of the facts blob; an
    // address edit must not cost it its second home.
    const res = await patch({ phone: '(555) 010-9876', city: 'Los Angeles' })

    expect(res.status).toBe(200)
    expect(savedUserData()).toMatchObject({ phone: '+15550109876', city: 'Los Angeles' })
    const facts = JSON.parse(vi.mocked(prisma.assessment.update).mock.calls[0][0].data.facts)
    expect(facts.plaintiffContext.phone).toBe('+15550109876')
  })

  it('clears an address line that is sent empty', async () => {
    await patch({ addressLine2: '' })

    expect(savedUserData().addressLine2).toBeNull()
  })

  it('leaves the address alone when the edit does not mention it', async () => {
    await patch({ firstName: 'Joanne' })

    expect(savedUserData()).not.toHaveProperty('city')
  })
})
