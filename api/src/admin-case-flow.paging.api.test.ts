import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/matching-rules-config', () => ({
  getMatchingRules: vi.fn().mockResolvedValue({}),
  getAttorneyResponseDeadlineMinutes: vi.fn().mockReturnValue(60),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@test.local',
  role: 'admin',
  isActive: true,
  adminCapabilities: JSON.stringify(['network']),
}
const plaintiffUser = {
  id: 'user-plaintiff-1',
  email: 'plaintiff@test.local',
  firstName: 'Pat',
  lastName: 'Claimant',
  role: 'plaintiff',
  isActive: true,
}

const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const plaintiffAuth = { Authorization: `Bearer ${generateToken(plaintiffUser.id)}` }

const HOUR = 3_600_000

/**
 * A lead shaped the way the case-flow query selects it. `minutesAgo` drives both
 * the age in stage and, for routing cases, whether the offer window has lapsed.
 */
function lead(
  overrides: {
    id: string
    plaintiff?: string
    claimType?: string
    venueState?: string
    value?: number
    minutesAgo?: number
    stage?: 'intake' | 'routing' | 'manual_review' | 'matched' | 'closed'
    attorney?: string
  },
) {
  const {
    id,
    plaintiff = 'Case Owner',
    claimType = 'auto',
    venueState = 'CA',
    value = 10_000,
    minutesAgo = 10,
    stage = 'intake',
    attorney,
  } = overrides
  const at = new Date(Date.now() - minutesAgo * 60_000)

  const lifecycleState =
    stage === 'closed'
      ? 'closed'
      : stage === 'matched'
        ? 'attorney_matched'
        : stage === 'manual_review'
          ? 'manual_review_needed'
          : stage === 'routing'
            ? 'routing_active'
            : 'draft'

  return {
    status: stage === 'routing' ? 'submitted' : stage === 'closed' ? 'closed' : 'draft',
    lifecycleState,
    routingLocked: stage === 'matched',
    assignedAttorneyId: attorney ? 'att-1' : null,
    assignedAttorney: attorney ? { name: attorney } : null,
    submittedAt: at,
    lastContactAt: at,
    updatedAt: at,
    sourceDetails: null,
    assessment: {
      id,
      status: stage === 'closed' ? 'closed' : 'active',
      caseStage: stage === 'closed' ? 'CLOSED' : 'INTAKE',
      claimType,
      venueState,
      referenceCode: `REF-${id}`,
      createdAt: at,
      manualReviewStatus: stage === 'manual_review' ? 'pending' : null,
      manualReviewReason: stage === 'manual_review' ? 'Needs a human' : null,
      manualReviewHeldAt: at,
      user: { firstName: plaintiff, lastName: '' },
      predictions: [{ bands: JSON.stringify({ median: value }) }],
      introductions: [],
      routingWaves: [],
    },
  }
}

/**
 * Intake cases, each an hour older than the last, so paging and sort order are
 * unambiguous. Ages are spaced by the hour because the route rounds ageHours to
 * one decimal, which would tie minute-apart fixtures together.
 */
function manyLeads(count: number) {
  return Array.from({ length: count }, (_, i) =>
    lead({
      id: `case-${String(i).padStart(3, '0')}`,
      plaintiff: `Plaintiff ${i}`,
      minutesAgo: (i + 1) * 60,
      value: i * 1000,
    }),
  )
}

function loaded(leads: unknown[]) {
  vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue(leads as any)
}

const get = (query = '') => request(app).get(`/v1/admin/case-flow${query}`).set(adminAuth)

describe('admin case flow paging', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any)
  })

  it('returns one page rather than the whole pipeline', async () => {
    loaded(manyLeads(60))

    const res = await get()

    expect(res.status).toBe(200)
    expect(res.body.cases).toHaveLength(50)
    expect(res.body.meta.limit).toBe(50)
    expect(res.body.meta.filteredCases).toBe(60)
  })

  it('walks to the next page without repeating rows', async () => {
    loaded(manyLeads(60))

    const first = await get('?limit=25&offset=0')
    const second = await get('?limit=25&offset=25')

    expect(first.body.cases).toHaveLength(25)
    expect(second.body.cases).toHaveLength(25)
    const overlap = first.body.cases
      .map((c: any) => c.id)
      .filter((id: string) => second.body.cases.some((c: any) => c.id === id))
    expect(overlap).toEqual([])
  })

  it('caps the page size so a client cannot ask for everything', async () => {
    loaded(manyLeads(60))

    const res = await get('?limit=100000')

    expect(res.body.meta.limit).toBe(200)
  })

  it('counts every stage across the pipeline, not just the returned page', async () => {
    loaded([
      ...manyLeads(60),
      lead({ id: 'closed-1', stage: 'closed' }),
      lead({ id: 'matched-1', stage: 'matched', attorney: 'Avery Law' }),
    ])

    const res = await get('?limit=5')

    expect(res.body.cases).toHaveLength(5)
    const byKey = Object.fromEntries(res.body.stages.map((s: any) => [s.key, s.count]))
    expect(byKey.intake).toBe(60)
    expect(byKey.closed).toBe(1)
    expect(byKey.matched).toBe(1)
    expect(res.body.meta.totalCases).toBe(62)
  })

  it('scopes the page to one stage when asked', async () => {
    loaded([...manyLeads(3), lead({ id: 'review-1', stage: 'manual_review' })])

    const res = await get('?stage=manual_review')

    expect(res.body.meta.filteredCases).toBe(1)
    expect(res.body.cases.map((c: any) => c.id)).toEqual(['review-1'])
    // Funnel counts stay whole-pipeline so the header still describes everything.
    expect(res.body.meta.totalCases).toBe(4)
  })

  it('ignores a stage that is not a real stage', async () => {
    loaded(manyLeads(4))

    const res = await get('?stage=not-a-stage')

    expect(res.body.meta.filteredCases).toBe(4)
  })

  it('searches the whole pipeline, not only the first page', async () => {
    loaded([
      ...manyLeads(60),
      lead({ id: 'needle-1', plaintiff: 'Zenobia Marchetti', minutesAgo: 5000 }),
    ])

    const res = await get('?search=zenobia&limit=10')

    expect(res.body.meta.filteredCases).toBe(1)
    expect(res.body.cases[0].id).toBe('needle-1')
  })

  it('sorts across the whole set so the oldest case is on page one', async () => {
    loaded(manyLeads(60))

    const res = await get('?sort=age&direction=desc&limit=1')

    // manyLeads ages by index, so the last one created is the oldest.
    expect(res.body.cases[0].id).toBe('case-059')
  })

  it('reverses the sort on request', async () => {
    loaded(manyLeads(60))

    const res = await get('?sort=age&direction=asc&limit=1')

    expect(res.body.cases[0].id).toBe('case-000')
  })

  it('sorts by value when asked', async () => {
    loaded(manyLeads(60))

    const res = await get('?sort=value&direction=desc&limit=1')

    expect(res.body.cases[0].valueEstimate).toBe(59_000)
  })

  it('filters to stuck cases and still reports the pipeline total', async () => {
    loaded([
      lead({ id: 'fresh-1', stage: 'intake', minutesAgo: 5 }),
      // Past the 24h intake threshold, so the route flags it stuck.
      lead({ id: 'stale-1', stage: 'intake', minutesAgo: (48 * HOUR) / 60_000 }),
    ])

    const res = await get('?stuckOnly=true')

    expect(res.body.cases.map((c: any) => c.id)).toEqual(['stale-1'])
    expect(res.body.meta.filteredCases).toBe(1)
    expect(res.body.meta.totalCases).toBe(2)
    expect(res.body.meta.stuckCases).toBe(1)
  })

  it('says so when the pipeline is larger than it can scan', async () => {
    loaded(manyLeads(5000))

    const res = await get('?limit=25')

    expect(res.body.meta.truncated).toBe(true)
  })

  it('does not claim truncation for a pipeline it fully scanned', async () => {
    loaded(manyLeads(60))

    const res = await get()

    expect(res.body.meta.truncated).toBe(false)
  })

  it('stays closed to non-admins', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(plaintiffUser as any)
    loaded(manyLeads(3))

    const res = await request(app).get('/v1/admin/case-flow').set(plaintiffAuth)

    expect(res.status).toBe(403)
  })
})
