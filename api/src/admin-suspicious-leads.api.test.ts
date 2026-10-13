/**
 * GET /v1/admin/intake-leads/suspicious.csv is the file handed to the Google
 * Ads agency. What matters most is what it leaves out: it goes to a third party
 * under a service-provider agreement, so no contact details, no case content,
 * and no lead id (which is the credential behind a resume link).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { SUSPICIOUS_LEAD_COLUMNS } from './lib/suspicious-leads'

const app = buildApp()

const adminUser = { id: 'user-admin-1', email: 'admin@test.local', role: 'admin', isActive: true }
const attorneyUser = { id: 'user-att-1', email: 'attorney@test.local', role: 'attorney', isActive: true }
const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const attorneyAuth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const URL = '/v1/admin/intake-leads/suspicious.csv'
const DAY_MS = 24 * 60 * 60 * 1000

function signedInAs(user: Record<string, unknown> | null) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
}

function lead(over: Record<string, unknown> = {}) {
  return {
    createdAt: new Date(Date.now() - DAY_MS),
    ipAddress: '203.0.113.7',
    gclid: 'Cj0KCQ',
    utmCampaign: 'pi-search',
    deviceType: 'mobile',
    repeatCount: 0,
    captchaPassed: true,
    currentStep: 'contact',
    stepHistory: JSON.stringify([{ step: 'injury_type', at: '2026-10-01T00:00:00Z' }, { step: 'contact', at: '2026-10-01T00:01:00Z' }]),
    status: 'in_progress',
    assessmentId: null,
    // Selected by nothing, but present on the row: the export must not leak them.
    email: 'victim@example.com',
    phone: '4155550100',
    ...over,
  }
}

function parseCsv(text: string): Array<Record<string, string>> {
  const [header, ...lines] = text.trim().split('\n')
  const columns = header.split(',')
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, i) => [columns[i], value])))
}

beforeEach(() => {
  resetUniversalPrismaMock()
  signedInAs(adminUser)
})

describe('who can download it', () => {
  it('turns away a request with no token', async () => {
    const res = await request(app).get(URL)

    expect(res.status).toBe(401)
  })

  it('turns away an authenticated attorney', async () => {
    signedInAs(attorneyUser)

    const res = await request(app).get(URL).set(attorneyAuth)

    expect(res.status).toBe(403)
    expect(prisma.intakeLead.findMany).not.toHaveBeenCalled()
  })

  it('serves an admin a CSV attachment', async () => {
    const res = await request(app).get(URL).set(adminAuth)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="suspicious-leads-.*\.csv"/)
  })
})

describe('what it contains', () => {
  it('has no contact, case or lead-id columns', async () => {
    const res = await request(app).get(URL).set(adminAuth)

    const header = res.text.split('\n')[0].split(',')
    expect(header).toEqual([...SUSPICIOUS_LEAD_COLUMNS])
    for (const forbidden of ['email', 'phone', 'name', 'first_name', 'id', 'lead_id', 'assessment_id', 'injury_type', 'form_snapshot']) {
      expect(header).not.toContain(forbidden)
    }
  })

  it('never asks the database for contact details', async () => {
    await request(app).get(URL).set(adminAuth)

    const select = (vi.mocked(prisma.intakeLead.findMany).mock.calls[0][0] as any).select
    expect(select.email).toBeUndefined()
    expect(select.phone).toBeUndefined()
    expect(select.formSnapshot).toBeUndefined()
    expect(select.id).toBeUndefined()
  })

  it('keeps contact details out of the file even when the row carries them', async () => {
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue([lead({ repeatCount: 2 })] as any)

    const res = await request(app).get(URL).set(adminAuth)

    expect(res.text).not.toContain('victim@example.com')
    expect(res.text).not.toContain('4155550100')
  })

  it('lists only leads that meet a suspicious rule, with the reasons', async () => {
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue([
      lead({ repeatCount: 1, ipAddress: '198.51.100.1' }),
      lead({ ipAddress: '198.51.100.2' }),
      lead({ captchaPassed: false, ipAddress: '198.51.100.3' }),
    ] as any)

    const rows = parseCsv((await request(app).get(URL).set(adminAuth)).text)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ repeat_count: '1', reasons: 'repeat_contact', steps_reached: '2' })
    expect(rows[1].reasons).toBe('captcha_not_verified')
  })

  it('flags three or more leads from one IP and reports the count', async () => {
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue([lead(), lead(), lead()] as any)

    const rows = parseCsv((await request(app).get(URL).set(adminAuth)).text)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ leads_from_same_ip: '3', reasons: 'many_leads_same_ip' })
  })

  it('flags a week-old lead with no verified code, but not one that verified', async () => {
    const old = new Date(Date.now() - 8 * DAY_MS)
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue([
      lead({ createdAt: old, ipAddress: '198.51.100.4', assessmentId: 'asm-unverified' }),
      lead({ createdAt: old, ipAddress: '198.51.100.5', assessmentId: 'asm-verified' }),
    ] as any)
    vi.mocked(prisma.caseSubmitOtp.findMany).mockResolvedValue([{ assessmentId: 'asm-verified' }] as any)

    const rows = parseCsv((await request(app).get(URL).set(adminAuth)).text)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ otp_verified: 'no', reasons: 'no_response_7_days' })
  })

  /** gclid and UTM values arrive from a URL anyone can craft and are opened in a spreadsheet. */
  it('neutralises a value that would run as a spreadsheet formula', async () => {
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue([lead({ repeatCount: 1, utmCampaign: '=HYPERLINK("x")' })] as any)

    const res = await request(app).get(URL).set(adminAuth)

    expect(res.text).toContain(`"'=HYPERLINK(""x"")"`)
  })
})

describe('the date range', () => {
  it('defaults to the last 30 days', async () => {
    await request(app).get(URL).set(adminAuth)

    const where = (vi.mocked(prisma.intakeLead.findMany).mock.calls[0][0] as any).where
    const span = where.createdAt.lte.getTime() - where.createdAt.gte.getTime()
    expect(Math.round(span / DAY_MS)).toBe(30)
    expect(Math.abs(Date.now() - where.createdAt.lte.getTime())).toBeLessThan(60_000)
  })

  it('applies a requested range, through the end of the last day', async () => {
    await request(app).get(`${URL}?from=2026-09-01&to=2026-09-15`).set(adminAuth)

    const where = (vi.mocked(prisma.intakeLead.findMany).mock.calls[0][0] as any).where
    expect(where.createdAt.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(where.createdAt.lte.toISOString()).toBe('2026-09-15T23:59:59.999Z')
  })

  it('rejects a range wider than 180 days', async () => {
    const res = await request(app).get(`${URL}?from=2026-01-01&to=2026-09-01`).set(adminAuth)

    expect(res.status).toBe(400)
    expect(prisma.intakeLead.findMany).not.toHaveBeenCalled()
  })

  it('rejects a date it cannot read', async () => {
    const res = await request(app).get(`${URL}?from=last-tuesday`).set(adminAuth)

    expect(res.status).toBe(400)
  })
})
