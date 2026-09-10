/**
 * Inbound pull sync.
 *
 * The assertions that matter here are the refusals: this feature reads a
 * firm's whole caseload and writes a case for each row, so the tests are
 * weighted towards what it declines to do — sync when nobody enabled it,
 * invent a date of loss, duplicate on a second run, or advance the watermark
 * past data it has not read.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => import('../../test/universalPrismaMock'))
vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

const listMatters = vi.fn()
const createAttorneyOwnedCase = vi.fn()
const finalizeAttorneyCases = vi.fn()
const findExistingImportedCase = vi.fn()

vi.mock('./registry', () => ({
  getConnector: (provider: string) =>
    provider === 'zapier'
      ? { id: 'zapier', authType: 'webhook' }
      : { id: provider, authType: 'oauth', listMatters: (...args: unknown[]) => listMatters(...args) },
}))

vi.mock('./connections', () => ({
  getConnection: (id: string) => Promise.resolve(connectionRow(id)),
  getValidAccessToken: (c: unknown) => Promise.resolve(c),
  buildAuthContext: () => ({ connectionId: 'conn-1', accessToken: 'tok', config: {} }),
}))

vi.mock('../attorney-case-factory', () => ({
  createAttorneyOwnedCase: (...args: unknown[]) => createAttorneyOwnedCase(...args),
  finalizeAttorneyCases: (...args: unknown[]) => finalizeAttorneyCases(...args),
  findExistingImportedCase: (...args: unknown[]) => findExistingImportedCase(...args),
}))

import { prisma } from '../prisma'
import { resetUniversalPrismaMock } from '../../test/universalPrismaMock'
import {
  InboundSyncDisabledError,
  InboundSyncUnsupportedError,
  claimTypeFromPracticeArea,
  syncConnectionInbound,
} from './inbound-sync'

let connectionOverrides: Record<string, unknown> = {}

function connectionRow(id: string) {
  return {
    id,
    provider: 'clio',
    lawFirmId: 'firm-1',
    attorneyId: 'att-1',
    lastSyncedAt: null,
    config: JSON.stringify({ inboundSyncEnabled: true }),
    ...connectionOverrides,
  }
}

/** A matter with everything the factory needs, so tests can subtract from it. */
function matter(overrides: Record<string, unknown> = {}) {
  return {
    externalId: 'm-1',
    clientFirstName: 'Dana',
    clientLastName: 'Reyes',
    clientEmail: 'dana@example.com',
    description: 'Rear-ended at a stoplight',
    practiceArea: 'Motor Vehicle Accidents',
    incidentDate: '2026-03-04',
    ...overrides,
  }
}

function onePage(matters: unknown[], nextCursor: string | null = null) {
  listMatters.mockResolvedValueOnce({ matters, nextCursor })
}

function caseInput(call = 0) {
  return createAttorneyOwnedCase.mock.calls[call]?.[0] as any
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  connectionOverrides = {}
  listMatters.mockReset()
  createAttorneyOwnedCase.mockResolvedValue({ assessmentId: 'asm-1', referenceCode: null })
  finalizeAttorneyCases.mockResolvedValue([])
  findExistingImportedCase.mockResolvedValue(null)
  vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ id: 'att-1', barState: 'CA' } as any)
  vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1', barState: 'CA' } as any)
})

describe('the opt-in gate', () => {
  it('refuses to sync a connection nobody enabled it on', async () => {
    connectionOverrides = { config: JSON.stringify({}) }

    await expect(syncConnectionInbound({ connectionId: 'conn-1' })).rejects.toBeInstanceOf(
      InboundSyncDisabledError,
    )
    expect(listMatters).not.toHaveBeenCalled()
  })

  it('treats a connection with no config at all as disabled', async () => {
    connectionOverrides = { config: null }

    await expect(syncConnectionInbound({ connectionId: 'conn-1' })).rejects.toBeInstanceOf(
      InboundSyncDisabledError,
    )
  })

  it('refuses a provider that cannot read matters back out', async () => {
    connectionOverrides = { provider: 'zapier' }

    await expect(syncConnectionInbound({ connectionId: 'conn-1' })).rejects.toBeInstanceOf(
      InboundSyncUnsupportedError,
    )
  })
})

describe('importing matters', () => {
  it('creates a case per matter and attributes it to the connection\u2019s attorney', async () => {
    onePage([matter()])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.imported).toBe(1)
    expect(result.assessmentIds).toEqual(['asm-1'])
    expect(createAttorneyOwnedCase).toHaveBeenCalledTimes(1)
    const [input, owner, origin] = createAttorneyOwnedCase.mock.calls[0] as any[]
    expect(owner).toMatchObject({ attorneyId: 'att-1', lawFirmId: 'firm-1' })
    expect(origin).toBe('import')
    expect(input).toMatchObject({
      claimType: 'auto',
      venueState: 'CA',
      incidentDate: '2026-03-04',
      plaintiffFirstName: 'Dana',
      importSource: 'clio',
      externalId: 'm-1',
    })
  })

  it('falls back to the firm\u2019s first attorney on a firm-wide connection', async () => {
    connectionOverrides = { attorneyId: null }
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-oldest', barState: 'TX' } as any)
    onePage([matter({ venueState: null })])

    await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(caseInput().venueState).toBe('TX')
    expect((createAttorneyOwnedCase.mock.calls[0] as any[])[1]).toMatchObject({
      attorneyId: 'att-oldest',
    })
  })

  it('prefers the matter\u2019s own venue over the attorney\u2019s bar state', async () => {
    onePage([matter({ venueState: 'nv' })])

    await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(caseInput().venueState).toBe('NV')
  })

  it('runs reference codes and valuations once, after the reads', async () => {
    onePage([matter(), matter({ externalId: 'm-2' })])
    createAttorneyOwnedCase
      .mockResolvedValueOnce({ assessmentId: 'a', referenceCode: null })
      .mockResolvedValueOnce({ assessmentId: 'b', referenceCode: null })

    await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(finalizeAttorneyCases).toHaveBeenCalledTimes(1)
    expect(finalizeAttorneyCases).toHaveBeenCalledWith(['a', 'b'])
  })

  it('records an inbound log row per created case', async () => {
    onePage([matter()])

    await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(prisma.cmsSyncLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: 'inbound',
        operation: 'import_matter',
        status: 'success',
        externalId: 'm-1',
        assessmentId: 'asm-1',
      }),
    })
  })
})

describe('what it refuses to import', () => {
  it('skips a matter with no date of loss instead of guessing one', async () => {
    onePage([matter({ incidentDate: null })])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.imported).toBe(0)
    expect(createAttorneyOwnedCase).not.toHaveBeenCalled()
    expect(result.skipped[0]).toMatchObject({ reason: 'missing_incident_date', label: 'Dana Reyes' })
  })

  it('skips an unparseable date rather than passing it through', async () => {
    onePage([matter({ incidentDate: 'sometime last spring' })])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.skipped[0].reason).toBe('missing_incident_date')
  })

  it('skips a matter with no id to key dedupe on', async () => {
    onePage([matter({ externalId: '' })])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.skipped[0].reason).toBe('missing_external_id')
  })

  it('skips when neither the matter nor the attorney supplies a state', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ id: 'att-1', barState: null } as any)
    onePage([matter({ venueState: null })])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.skipped[0].reason).toBe('missing_venue_state')
  })

  it('does not re-create a case a previous sync already made', async () => {
    findExistingImportedCase.mockResolvedValue({ id: 'asm-existing' })
    onePage([matter()])

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(createAttorneyOwnedCase).not.toHaveBeenCalled()
    expect(result.imported).toBe(0)
    expect(result.skipped[0].reason).toBe('duplicate')
  })

  it('keeps going when one matter fails to create', async () => {
    onePage([matter(), matter({ externalId: 'm-2' })])
    createAttorneyOwnedCase
      .mockRejectedValueOnce(new Error('venue state CA is not supported'))
      .mockResolvedValueOnce({ assessmentId: 'asm-2', referenceCode: null })

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.imported).toBe(1)
    expect(result.skipped[0]).toMatchObject({ reason: 'error', externalId: 'm-1' })
    expect(result.skipped[0].detail).toContain('venue state')
  })
})

describe('paging and the incremental watermark', () => {
  it('follows the cursor across pages', async () => {
    onePage([matter({ externalId: 'm-1' })], 'cur-2')
    onePage([matter({ externalId: 'm-2' })], null)

    const result = await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(result.pagesFetched).toBe(2)
    expect(result.seen).toBe(2)
    expect(listMatters.mock.calls[1][1]).toMatchObject({ cursor: 'cur-2' })
    expect(result.reachedEnd).toBe(true)
  })

  it('sends the connection\u2019s lastSyncedAt as the watermark', async () => {
    connectionOverrides = { lastSyncedAt: new Date('2026-01-15T00:00:00.000Z') }
    onePage([])

    await syncConnectionInbound({ connectionId: 'conn-1' })

    expect(listMatters.mock.calls[0][1].since).toEqual(new Date('2026-01-15T00:00:00.000Z'))
  })

  it('reads everything when the caller explicitly passes since: null', async () => {
    connectionOverrides = { lastSyncedAt: new Date('2026-01-15T00:00:00.000Z') }
    onePage([])

    await syncConnectionInbound({ connectionId: 'conn-1', since: null })

    expect(listMatters.mock.calls[0][1].since).toBeNull()
  })

  it('advances the watermark only after reaching the end of the data', async () => {
    onePage([matter()], null)

    await syncConnectionInbound({ connectionId: 'conn-1' })

    const update = vi.mocked(prisma.cmsConnection.update).mock.calls[0][0] as any
    expect(update.data.lastSyncedAt).toBeInstanceOf(Date)
  })

  it('leaves the watermark alone when it stops on the page cap', async () => {
    onePage([matter({ externalId: 'm-1' })], 'cur-2')
    onePage([matter({ externalId: 'm-2' })], 'cur-3')

    const result = await syncConnectionInbound({ connectionId: 'conn-1', maxPages: 2 })

    expect(result.reachedEnd).toBe(false)
    expect(result.nextCursor).toBe('cur-3')
    // Advancing here would make the next run skip everything after cur-3.
    const update = vi.mocked(prisma.cmsConnection.update).mock.calls[0][0] as any
    expect(update.data.lastSyncedAt).toBeUndefined()
  })

  it('marks the connection errored when the provider call fails', async () => {
    listMatters.mockRejectedValueOnce(new Error('401 unauthorized'))

    await expect(syncConnectionInbound({ connectionId: 'conn-1' })).rejects.toThrow(/401/)

    const update = vi.mocked(prisma.cmsConnection.update).mock.calls[0][0] as any
    expect(update.data).toMatchObject({ status: 'error' })
    expect(update.data.lastError).toContain('401')
  })
})

describe('dry run', () => {
  it('counts what it would create without writing anything', async () => {
    onePage([matter(), matter({ externalId: 'm-2', incidentDate: null })])

    const result = await syncConnectionInbound({ connectionId: 'conn-1', dryRun: true })

    expect(result.imported).toBe(1)
    expect(result.skipped[0].reason).toBe('missing_incident_date')
    expect(createAttorneyOwnedCase).not.toHaveBeenCalled()
    expect(prisma.cmsSyncLog.create).not.toHaveBeenCalled()
    expect(prisma.cmsConnection.update).not.toHaveBeenCalled()
  })
})

describe('claimTypeFromPracticeArea', () => {
  it.each([
    ['Motor Vehicle Accidents', 'auto'],
    ['MVA', 'auto'],
    ['Trucking', 'auto'],
    ['Slip and Fall', 'slip_and_fall'],
    ['Premises Liability', 'premises_liability'],
    ['Medical Malpractice', 'medmal'],
    ['Dog Bite', 'dog_bite'],
    ['Wrongful Death', 'wrongful_death'],
    ['Nursing Home Neglect', 'nursing_home_abuse'],
    ['Products Liability', 'product'],
    ['Asbestos Exposure', 'toxic_exposure'],
    ['Assault and Battery', 'intentional_tort'],
    ['Workplace Injury', 'workplace_injury'],
  ])('maps %s to %s', (input, expected) => {
    expect(claimTypeFromPracticeArea(input)).toBe(expected)
  })

  it('reads our own vocabulary back when a firm named their areas after it', () => {
    expect(claimTypeFromPracticeArea('high_severity_surgery')).toBe('high_severity_surgery')
  })

  it('falls back to other_pi, not auto, on an area it does not recognise', () => {
    // Claim type drives the limitations clock and the valuation model, so
    // guessing 'auto' would be a substantive assertion about the case.
    expect(claimTypeFromPracticeArea('Estate Planning')).toBe('other_pi')
    expect(claimTypeFromPracticeArea('')).toBe('other_pi')
    expect(claimTypeFromPracticeArea(null)).toBe('other_pi')
  })

  it('prefers wrongful death over the accident type in a compound label', () => {
    expect(claimTypeFromPracticeArea('Auto Accident - Wrongful Death')).toBe('wrongful_death')
  })
})
