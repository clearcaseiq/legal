/**
 * The test-number namespace, and the two ways it must not work.
 *
 * Fixtures exist because the live bar cannot be asked for a suspended licence
 * or a name mismatch on demand — producing those against calbar would mean
 * registering in a real attorney's name. The risk they introduce is the mirror
 * image: a fabricated "Active" record is indistinguishable from a real one once
 * stored, so the tests that matter most are the ones proving a TEST- number
 * cannot verify anything unless the mock is explicitly switched on.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  firstName: 'Ryan',
  lastName: 'Garcia',
  isActive: true,
}
const authHeader = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

/**
 * One app per mode, built once.
 *
 * `STATE_BAR_LOOKUP_MODE` is read through `ENV`, which is captured at module
 * load, so switching modes means re-importing the graph. That costs several
 * seconds, which is well past the default per-test timeout — hence `beforeAll`
 * rather than a helper called from each test.
 */
async function appInMode(mode: string) {
  process.env.STATE_BAR_LOOKUP_MODE = mode
  vi.resetModules()
  const { buildApp } = await import('./build-app')
  return buildApp()
}

let mockApp: any
let liveApp: any

beforeAll(async () => {
  mockApp = await appInMode('mock')
  liveApp = await appInMode('live')
}, 120_000)

function accountNamed(name: string) {
  vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
    id: 'att-1',
    email: attorneyUser.email,
    name,
    isVerified: false,
  } as any)
  vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({ attorneyId: 'att-1' } as any)
  vi.mocked(prisma.attorneyProfile.update).mockImplementation((async (args: any) => args.data) as any)
}

function writtenProfile() {
  return vi.mocked(prisma.attorneyProfile.update).mock.calls[0][0].data as any
}

/** Proves the mock never opens a socket, rather than trusting that it does not. */
function networkIsForbidden() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('the mock must not reach the network')
    }),
  )
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
  networkIsForbidden()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.STATE_BAR_LOOKUP_MODE
})

describe('STATE_BAR_LOOKUP_MODE=mock', () => {
  function lookup(licenseNumber: string, name = 'Ryan Garcia') {
    accountNamed(name)
    return request(mockApp)
      .post('/v1/attorney-profile/license/state-bar-lookup')
      .set(authHeader)
      .send({ licenseNumber, state: 'CA' })
  }

  it('verifies the active fixture without touching the network', async () => {
    const res = await lookup('TEST-CA-000001')
    expect(res.status).toBe(200)
    expect(writtenProfile().licenseVerified).toBe(true)
    expect(writtenProfile().licenseStatus).toBe('Active')
    expect(writtenProfile().licenseRecordName).toBe('Ryan Garcia')
  })

  it('keeps the raw test number rather than reducing it to digits', async () => {
    await lookup('TEST-CA-000001')
    expect(writtenProfile().licenseNumber).toBe('TEST-CA-000001')
  })

  it('matches the namespace case-insensitively', async () => {
    const res = await lookup('test-ca-000001')
    expect(res.status).toBe(200)
    expect(writtenProfile().licenseVerified).toBe(true)
  })

  it('refuses an inactive licence and records the real status', async () => {
    const res = await lookup('TEST-CA-000002', 'Dana Whitfield')
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseStatus).toBe('Inactive')
  })

  it('refuses a suspended licence as suspended, not as missing', async () => {
    const res = await lookup('TEST-CA-000003', 'Marcus Feld')
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseStatus).toBe('Suspended')
  })

  it('refuses an active licence registered under another name', async () => {
    const res = await lookup('TEST-CA-000005', 'Bobby Smith')
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseNameMatch).toBe('mismatch')
    expect(res.body.error).toContain('Eleanor Vance')
  })

  it('still verifies through a maiden name, where a surname is all that is shared', async () => {
    const res = await lookup('TEST-CA-000006', 'Jennifer Okonkwo')
    expect(res.status).toBe(200)
    expect(writtenProfile().licenseNameMatch).toBe('match')
  })

  it('reports an unlisted number in the namespace as no record', async () => {
    const res = await lookup('TEST-CA-999999')
    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    expect(writtenProfile().licenseNameMatch).toBe('unknown')
  })

  it('simulates an upstream failure without recording a verdict', async () => {
    const res = await lookup('TEST-CA-000007')
    expect(res.status).toBe(500)
    expect(prisma.attorneyProfile.update).not.toHaveBeenCalled()
  })

  it('leaves real bar numbers to the live lookup', async () => {
    // The forbidden `fetch` is the assertion: a plain number must not be served
    // from fixtures just because the mock is enabled.
    const res = await lookup('271370')
    expect(res.status).toBe(500)
  })
})

describe('STATE_BAR_LOOKUP_MODE=live', () => {
  it('refuses a test number instead of asking calbar about its digits', async () => {
    accountNamed('Ryan Garcia')

    const res = await request(liveApp)
      .post('/v1/attorney-profile/license/state-bar-lookup')
      .set(authHeader)
      .send({ licenseNumber: 'TEST-CA-000001', state: 'CA' })

    expect(res.status).toBe(422)
    expect(writtenProfile().licenseVerified).toBe(false)
    // Explains the switch rather than reporting a missing record, which is what
    // stripping the prefix used to produce.
    expect(res.body.error).toMatch(/STATE_BAR_LOOKUP_MODE=mock/)
  })

  it('does not fabricate a record for the preview either', async () => {
    const res = await request(liveApp)
      .post('/v1/attorney-profile/license/state-bar-preview')
      .send({ licenseNumber: 'TEST-CA-000001', state: 'CA', name: 'Ryan Garcia' })

    expect(res.status).toBe(200)
    expect(res.body.found).toBe(false)
    expect(res.body.wouldVerify).toBe(false)
  })
})

describe('boot guard', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('refuses to start a production API that serves fabricated licences', async () => {
    process.env.STATE_BAR_LOOKUP_MODE = 'mock'
    process.env.NODE_ENV = 'production'
    vi.resetModules()

    await expect(import('./env')).rejects.toThrow(/refused when NODE_ENV=production/)
  })

  it('allows the mock outside production', async () => {
    process.env.STATE_BAR_LOOKUP_MODE = 'mock'
    process.env.NODE_ENV = 'development'
    vi.resetModules()

    const { ENV } = await import('./env')
    expect(ENV.STATE_BAR_LOOKUP_MODE).toBe('mock')
  })

  it('refuses a mode it does not recognise rather than guessing', async () => {
    process.env.STATE_BAR_LOOKUP_MODE = 'staging'
    vi.resetModules()

    await expect(import('./env')).rejects.toThrow(/must be 'live' or 'mock'/)
  })

  it('defaults to live when unset', async () => {
    delete process.env.STATE_BAR_LOOKUP_MODE
    vi.resetModules()

    const { ENV } = await import('./env')
    expect(ENV.STATE_BAR_LOOKUP_MODE).toBe('live')
  })
})
