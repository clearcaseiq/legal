/**
 * A bar lookup has to prove two things, and it used to prove one.
 *
 * Every California bar number is published, so resolving one to an active
 * record shows only that the number exists — not that the person who typed it
 * holds it. These tests pin both halves: the badge requires an active licence
 * *and* a record that plausibly names this attorney, and the pre-registration
 * preview reports what the Bar said without being able to verify anyone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  firstName: 'Bobby',
  lastName: 'Smith',
  isActive: true,
}
const authHeader = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

/** A calbar result page with one licensee row, in the column order we parse. */
function barSearchPage(name: string, status: string, number: string) {
  return `<html><body><table>
    <tr><th>Name</th><th>Status</th><th>Number</th></tr>
    <tr>
      <td><a href="/attorney/Licensee/Detail/${number}">${name}</a></td>
      <td>${status}</td>
      <td>${number}</td>
      <td>Los Angeles</td>
      <td>June 15, 2018</td>
    </tr>
  </table></body></html>`
}

function barReturns(html: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }))
}

function barIsUnreachable() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')))
}

function preview(body: Record<string, unknown>) {
  return request(app).post('/v1/attorney-profile/license/state-bar-preview').send(body)
}

/** The registering attorney's name, as stored on the account. */
function accountNamed(name: string) {
  vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
    id: 'att-1',
    email: attorneyUser.email,
    name,
    isVerified: false,
  } as any)
  vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({ attorneyId: 'att-1' } as any)
  vi.mocked(prisma.attorneyProfile.update).mockImplementation(
    (async (args: any) => args.data) as any,
  )
}

function lookup(body: Record<string, unknown>) {
  return request(app).post('/v1/attorney-profile/license/state-bar-lookup').set(authHeader).send(body)
}

/** What the lookup wrote to the profile. */
function writtenProfile() {
  return vi.mocked(prisma.attorneyProfile.update).mock.calls[0][0].data as any
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
})

// A stubbed `fetch` left in place outlives this file if the pool reuses the
// worker, and every other suite that reaches the network would then get our
// calbar fixture.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /v1/attorney-profile/license/state-bar-preview', () => {
  it('reports an active licence that names the person asking', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await preview({ licenseNumber: '271370', state: 'CA', name: 'Adam Link' })
    expect(res.status).toBe(200)
    expect(res.body.found).toBe(true)
    expect(res.body.status).toBe('Active')
    expect(res.body.recordName).toBe('Adam D. Link')
    expect(res.body.nameMatch).toBe('match')
    expect(res.body.wouldVerify).toBe(true)
    expect(res.body.admissionDate).toBe('June 15, 2018')
  })

  it('refuses to promise a badge on somebody else\'s licence', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await preview({ licenseNumber: '271370', state: 'CA', name: 'Bobby Smith' })
    expect(res.status).toBe(200)
    expect(res.body.found).toBe(true)
    expect(res.body.nameMatch).toBe('mismatch')
    expect(res.body.wouldVerify).toBe(false)
    // Naming the real licensee is what lets the attorney spot their own typo.
    expect(res.body.recordName).toBe('Adam D. Link')
  })

  it('reports a non-active licence as found but not verifiable', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Suspended', '271370'))

    const res = await preview({ licenseNumber: '271370', state: 'CA', name: 'Adam Link' })
    expect(res.status).toBe(200)
    expect(res.body.found).toBe(false)
    expect(res.body.wouldVerify).toBe(false)
  })

  it('does not match the caller against the name they supplied when no record exists', async () => {
    barReturns('<html><body><table><tr><td>No results</td></tr></table></body></html>')

    const res = await preview({ licenseNumber: '999999', state: 'CA', name: 'Bobby Smith' })
    expect(res.status).toBe(200)
    expect(res.body.found).toBe(false)
    expect(res.body.nameMatch).toBe('unknown')
    expect(res.body.wouldVerify).toBe(false)
  })

  it('says so plainly for a state it cannot check', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await preview({ licenseNumber: '271370', state: 'NY', name: 'Adam Link' })
    expect(res.status).toBe(200)
    expect(res.body.found).toBe(false)
    expect(res.body.message).toMatch(/California only/i)
  })

  it('requires a number and a state', async () => {
    const res = await preview({ name: 'Adam Link' })
    expect(res.status).toBe(400)
  })

  it('distinguishes a State Bar outage from a failed check', async () => {
    barIsUnreachable()

    const res = await preview({ licenseNumber: '271370', state: 'CA', name: 'Adam Link' })
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('state_bar_unreachable')
  })

  it('writes nothing, so it cannot verify anybody', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    await preview({ licenseNumber: '271370', state: 'CA', name: 'Adam Link' })
    expect(prisma.attorneyProfile.update).not.toHaveBeenCalled()
    expect(prisma.attorneyProfile.create).not.toHaveBeenCalled()
  })

  it('needs no account, because there is none yet at registration', async () => {
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await preview({ licenseNumber: '271370', state: 'CA', name: 'Adam Link' })
    expect(res.status).not.toBe(401)
  })
})

describe('POST /v1/attorney-profile/license/state-bar-lookup', () => {
  it('verifies an active licence that names the attorney', async () => {
    accountNamed('Adam Link')
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await lookup({ licenseNumber: '271370', state: 'CA' })
    expect(res.status).toBe(200)
    expect(writtenProfile().licenseVerified).toBe(true)
    expect(writtenProfile().licenseNameMatch).toBe('match')
    expect(writtenProfile().licenseStatus).toBe('Active')
  })

  it('withholds the badge when the licence belongs to someone else', async () => {
    accountNamed('Bobby Smith')
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await lookup({ licenseNumber: '271370', state: 'CA' })
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseVerifiedAt).toBeNull()
    expect(writtenProfile().licenseNameMatch).toBe('mismatch')
    // Recorded rather than discarded, so an admin can resolve it without
    // asking the attorney to type anything again.
    expect(writtenProfile().licenseRecordName).toBe('Adam D. Link')
  })

  it('tells the attorney whose licence the number actually is', async () => {
    accountNamed('Bobby Smith')
    barReturns(barSearchPage('Adam D. Link', 'Active', '271370'))

    const res = await lookup({ licenseNumber: '271370', state: 'CA' })
    expect(res.body.error).toContain('Adam D. Link')
    expect(res.body.nameMatch).toBe('mismatch')
  })

  it('records a suspended licence as suspended rather than as missing', async () => {
    accountNamed('Adam Link')
    barReturns(barSearchPage('Adam D. Link', 'Suspended', '271370'))

    const res = await lookup({ licenseNumber: '271370', state: 'CA' })
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseStatus).toBe('Suspended')
  })

  it('does not verify a number that resolves to nothing', async () => {
    accountNamed('Bobby Smith')
    barReturns('<html><body><table><tr><td>No results</td></tr></table></body></html>')

    const res = await lookup({ licenseNumber: '999999', state: 'CA' })
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseNameMatch).toBe('unknown')
  })
})
