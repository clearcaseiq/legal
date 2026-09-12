/**
 * A specialist asking the claimant for documents has to send a link the
 * claimant can actually open.
 *
 * The assistance queue is mostly people who have not registered — the case is
 * owned by a guest shadow row, or by nobody, and the address comes from intake.
 * This email used to point everyone at `/evidence-upload/:id`, which needs a
 * session, so the population the queue exists to serve received a request for
 * documents and a link to a login screen they had no account for.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const deliverDirectNotification = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    caseAssistance: { findUnique: vi.fn(), update: vi.fn() },
    caseInteraction: { create: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'spec-1', email: 'sam@clearcaseiq.com', role: 'CASE_SPECIALIST' }
    next()
  },
}))

vi.mock('../lib/specialist-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/specialist-access')>()),
  specialistMiddleware: (_req: any, _res: any, next: any) => next(),
  isCaseAssistanceManager: () => true,
}))

vi.mock('../lib/platform-notifications', () => ({
  deliverDirectNotification: (...args: unknown[]) => deliverDirectNotification(...args),
}))

vi.mock('../lib/claimant-invite', () => ({
  claimantInviteUrl: (assessmentId: string) => `https://app.test/register?claim=signed-${assessmentId}`,
}))

import { prisma } from '../lib/prisma'
import router from './case-assistance'

const app = express()
app.use(express.json())
app.use('/v1/case-assistance', router)

function assistance(user: Record<string, any> | null) {
  return {
    id: 'ca-1',
    assessmentId: 'asm-1',
    status: 'in_progress',
    assignedSpecialistId: 'spec-1',
    firstContactAt: new Date(),
    assessment: {
      id: 'asm-1',
      facts: JSON.stringify({ plaintiffContext: { email: 'ana@example.com' } }),
      user,
      leadSubmission: null,
    },
  }
}

/** A real login the claimant set up themselves. */
const REGISTERED = { id: 'u-1', firstName: 'Ana', email: 'ana@example.com' }

/**
 * The ownership placeholder `ensureCaseOwnerUserId` mints for a guest case.
 * Nobody can sign in to it, which is the whole trap: the case *has* a user row.
 */
const SHADOW = { id: 'u-guest', firstName: 'Guest', email: 'guest+asm-1@caseiq.local' }

function sendRequest() {
  return request(app)
    .post('/v1/case-assistance/ca-1/document-request')
    .send({ docs: ['medical_records'] })
}

function mailedCta() {
  return deliverDirectNotification.mock.calls[0][0].cta
}

beforeEach(() => {
  vi.clearAllMocks()
  deliverDirectNotification.mockResolvedValue(undefined)
  vi.mocked(prisma.caseInteraction.create).mockResolvedValue({ id: 'int-1' } as never)
  vi.mocked(prisma.caseAssistance.update).mockResolvedValue({ id: 'ca-1' } as never)
})

describe('a claimant who has registered', () => {
  it('is sent to their own upload page', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(REGISTERED) as never)

    await sendRequest().expect(201)

    // The richer destination — readiness scoring, wrong-file checks, HIPAA gate
    // — and they can reach it, so there is no reason to downgrade them.
    expect(mailedCta().url).toContain('/evidence-upload/asm-1')
  })
})

describe('a claimant who has no login', () => {
  it('is sent the claim link when the case is owned by a guest placeholder', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(SHADOW) as never)

    await sendRequest().expect(201)

    expect(mailedCta().url).toBe('https://app.test/register?claim=signed-asm-1')
  })

  it('is sent the claim link when the case has no user row at all', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(null) as never)

    await sendRequest().expect(201)

    expect(mailedCta().url).toBe('https://app.test/register?claim=signed-asm-1')
  })

  it('never mails them the page that demands a session', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(SHADOW) as never)

    await sendRequest().expect(201)

    expect(mailedCta().url).not.toContain('/evidence-upload/')
  })

  it('describes the link it actually sent', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(SHADOW) as never)

    await sendRequest().expect(201)

    // Telling someone with no account to "upload from your case documents page"
    // describes a page they cannot reach.
    const mail = deliverDirectNotification.mock.calls[0][0]
    expect(mail.message).not.toContain('your case documents page')
    expect(mail.message).toContain('set up your case login')
  })

  it('still reaches them at the address intake recorded', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance(SHADOW) as never)

    await sendRequest().expect(201)

    // The shadow row's own address is a local placeholder that bounces.
    expect(deliverDirectNotification.mock.calls[0][0].recipient).toBe('ana@example.com')
  })
})
