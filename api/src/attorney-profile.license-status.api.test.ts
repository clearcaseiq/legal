/**
 * A verified license and a live profile are different things, and the license
 * card can only say so if the endpoint tells it.
 *
 * Passing the state-bar lookup sets `AttorneyProfile.licenseVerified`. Being
 * visible to claimants is `Attorney.isVerified`, a separate vetting decision
 * that only an admin can make and that the lookup does not trigger. Before
 * `networkVerified` existed the profile showed a green "License Verified" badge
 * to an attorney no claimant could see, with nothing to suggest anything was
 * still outstanding.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()
const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  firstName: 'Avery',
  lastName: 'Law',
  isActive: true,
}
const authHeader = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

/** Whether this attorney has been let into the network. */
function attorneyIsLive(isVerified: boolean) {
  vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
    id: 'att-1',
    email: attorneyUser.email,
    name: 'Avery Law',
    isVerified,
  } as any)
}

/** A profile whose bar lookup came back clean. */
function licenseOnFile(licenseVerified: boolean) {
  vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
    licenseNumber: '123456',
    licenseState: 'CA',
    licenseVerified,
    licenseFileUrl: null,
    licenseFileName: null,
    licenseVerificationMethod: 'state_bar_lookup',
    licenseVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
  } as any)
}

async function licenseStatus() {
  const res = await request(app).get('/v1/attorney-profile/license/status').set(authHeader)
  expect(res.status).toBe(200)
  return res.body
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
})

describe('GET /v1/attorney-profile/license/status', () => {
  it('separates a passed bar lookup from being live to claimants', async () => {
    attorneyIsLive(false)
    licenseOnFile(true)

    const body = await licenseStatus()
    expect(body.licenseVerified).toBe(true)
    expect(body.networkVerified).toBe(false)
  })

  it('reports a live profile once an admin has verified the attorney', async () => {
    attorneyIsLive(true)
    licenseOnFile(true)

    const body = await licenseStatus()
    expect(body.licenseVerified).toBe(true)
    expect(body.networkVerified).toBe(true)
  })

  it('still answers the question for an attorney with no profile row yet', async () => {
    attorneyIsLive(false)
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue(null as any)

    const body = await licenseStatus()
    expect(body.hasLicense).toBe(false)
    expect(body.networkVerified).toBe(false)
  })

  it('answers it on the database-failure fallback too, where it matters most', async () => {
    attorneyIsLive(true)
    vi.mocked(prisma.attorneyProfile.findUnique).mockRejectedValue(new Error('db down'))

    const body = await licenseStatus()
    expect(body.licenseVerified).toBe(false)
    expect(body.networkVerified).toBe(true)
  })
})
