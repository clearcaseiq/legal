import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/claims', () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(true),
  checkEmailProviderConfig: vi.fn(),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { sendTransactionalEmail } from './lib/claims'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const app = buildApp()

const INQUIRY = {
  name: 'Dana Reyes',
  email: 'dana@example.com',
  topic: 'general',
  message: 'I have a question about my case and would like someone to call me.',
}

const tickets = () => (prisma as any).supportTicket

describe('POST /v1/contact', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue(true)
  })

  it('accepts a valid inquiry', async () => {
    const res = await request(app).post('/v1/contact').send(INQUIRY)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('rejects an inquiry that is missing required fields', async () => {
    const res = await request(app).post('/v1/contact').send({ name: 'Dana' })
    expect(res.status).toBe(400)
  })

  /**
   * The inquiry used to exist only as a message to a shared mailbox, and the
   * endpoint reported success whatever became of it. A spam rule was enough to
   * lose it with the sender told it had arrived.
   */
  it('records the inquiry so it survives a failed send', async () => {
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error('SES unavailable'))

    const res = await request(app).post('/v1/contact').send(INQUIRY)

    expect(res.status).toBe(200)
    expect(tickets().create).toHaveBeenCalledTimes(1)
    const { data } = tickets().create.mock.calls[0][0]
    expect(data.category).toBe('general')
    expect(data.description).toContain('dana@example.com')
    expect(data.description).toContain('would like someone to call me')
  })

  it('reports failure when the inquiry could be neither stored nor sent', async () => {
    tickets().create.mockRejectedValue(new Error('database down'))
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error('SES unavailable'))

    const res = await request(app).post('/v1/contact').send(INQUIRY)

    expect(res.status).toBe(500)
  })

  it('still succeeds when the send works but the write does not', async () => {
    tickets().create.mockRejectedValue(new Error('database down'))

    const res = await request(app).post('/v1/contact').send(INQUIRY)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('attributes the inquiry to a matching plaintiff account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-7' } as any)

    await request(app).post('/v1/contact').send(INQUIRY)

    const { data } = tickets().create.mock.calls[0][0]
    expect(data.userId).toBe('user-7')
    expect(data.role).toBe('plaintiff')
  })

  it('treats an unrecognised sender as a guest', async () => {
    await request(app).post('/v1/contact').send(INQUIRY)

    const { data } = tickets().create.mock.calls[0][0]
    expect(data.role).toBe('guest')
    expect(data.userId).toBeUndefined()
  })
})

/**
 * The honeypot admitted only the empty string, so a filled field failed schema
 * validation and came back as a 400 naming `company`. That told a bot which
 * input to leave alone, left the silent-accept branch unreachable, and rejected
 * any real sender whose password manager filled the hidden "Company" box —
 * with nothing on screen to explain it.
 */
describe('POST /v1/contact honeypot', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue(true)
  })

  it('answers indistinguishably from success when tripped', async () => {
    const res = await request(app).post('/v1/contact').send({ ...INQUIRY, company: 'Acme Corp' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('does not store or send anything when tripped', async () => {
    await request(app).post('/v1/contact').send({ ...INQUIRY, company: 'Acme Corp' })

    expect(tickets().create).not.toHaveBeenCalled()
    expect(sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('treats an empty honeypot as untripped', async () => {
    const res = await request(app).post('/v1/contact').send({ ...INQUIRY, company: '' })

    expect(res.status).toBe(200)
    expect(tickets().create).toHaveBeenCalledTimes(1)
  })

  it('treats an absent honeypot as untripped', async () => {
    const res = await request(app).post('/v1/contact').send(INQUIRY)

    expect(res.status).toBe(200)
    expect(tickets().create).toHaveBeenCalledTimes(1)
  })

  it('does not let whitespace alone trip it', async () => {
    const res = await request(app).post('/v1/contact').send({ ...INQUIRY, company: '   ' })

    expect(res.status).toBe(200)
    expect(tickets().create).toHaveBeenCalledTimes(1)
  })
})

describe('POST /v1/contact/support-request honeypot', () => {
  const SUPPORT = {
    name: 'Dana Reyes',
    email: 'dana@example.com',
    category: 'technical_issue',
    subject: 'Cannot upload',
    description: 'The upload button does nothing when I choose a file.',
  }

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue(true)
  })

  it('accepts a filled honeypot without creating a ticket', async () => {
    const res = await request(app).post('/v1/contact/support-request').send({ ...SUPPORT, company: 'Acme Corp' })

    expect(res.status).toBe(200)
    expect(tickets().create).not.toHaveBeenCalled()
  })

  it('creates a ticket for a genuine request', async () => {
    const res = await request(app).post('/v1/contact/support-request').send(SUPPORT)

    expect(res.status).toBe(200)
    expect(tickets().create).toHaveBeenCalledTimes(1)
  })
})
