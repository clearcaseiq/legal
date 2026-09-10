/**
 * Inbound `listMatters` for Clio and Filevine.
 *
 * These providers cannot be exercised against a live tenant — the credentials
 * are issued per-partner and we do not have them — so the contract is pinned
 * against the request shapes and response payloads in their published docs.
 * If a provider changes its pagination or field names, these fail loudly
 * rather than the sync silently importing nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../env', () => ({
  ENV: {
    CLIO_CLIENT_ID: 'cid',
    CLIO_CLIENT_SECRET: 'secret',
    CLIO_REDIRECT_URI: 'https://app.example.com/cb',
    CLIO_API_BASE: 'https://app.clio.com',
    FILEVINE_CLIENT_ID: 'fv-cid',
    FILEVINE_CLIENT_SECRET: 'fv-secret',
    FILEVINE_API_BASE: 'https://api.filevine.io',
    FILEVINE_IDENTITY_BASE: 'https://identity.filevine.io',
  },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { clioConnector } from './clio'
import { filevineConnector } from './filevine'

const CLIO_AUTH = {
  connectionId: 'conn-1',
  accessToken: 'tok',
  apiBaseUrl: 'https://app.clio.com',
  config: {},
} as any

const FV_AUTH = {
  connectionId: 'conn-2',
  accessToken: 'tok',
  apiBaseUrl: 'https://api.filevine.io',
  externalOrgId: '77',
  externalUserId: '88',
  config: {},
} as any

const fetchMock = vi.fn()

function jsonOnce(body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body })
}

/** The URL of the nth fetch, so a test can assert on the query it built. */
function requestUrl(index = 0): URL {
  return new URL(String(fetchMock.mock.calls[index]?.[0]))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clio listMatters', () => {
  it('asks for the nested client and practice area, which Clio omits by default', async () => {
    jsonOnce({ data: [], meta: { paging: { next: null } } })

    await clioConnector.listMatters!(CLIO_AUTH, {})

    const fields = requestUrl().searchParams.get('fields') || ''
    expect(fields).toContain('client{')
    expect(fields).toContain('practice_area{')
    // Without a name the case has no claimant, which is the whole point.
    expect(fields).toContain('first_name')
  })

  it('passes an incremental watermark as updated_since', async () => {
    jsonOnce({ data: [], meta: {} })

    await clioConnector.listMatters!(CLIO_AUTH, { since: new Date('2026-01-15T00:00:00.000Z') })

    expect(requestUrl().searchParams.get('updated_since')).toBe('2026-01-15T00:00:00.000Z')
  })

  it('omits updated_since on a first, full read', async () => {
    jsonOnce({ data: [], meta: {} })

    await clioConnector.listMatters!(CLIO_AUTH, {})

    expect(requestUrl().searchParams.has('updated_since')).toBe(false)
  })

  it('maps a matter onto the neutral shape', async () => {
    jsonOnce({
      data: [
        {
          id: 4242,
          display_number: '00123-Reyes',
          description: 'Reyes v. Alvarez — rear-end collision',
          status: 'Open',
          open_date: '2026-02-01',
          practice_area: { name: 'Motor Vehicle Accidents' },
          client: {
            first_name: 'Dana',
            last_name: 'Reyes',
            primary_email_address: 'dana@example.com',
            primary_phone_number: '+15555550123',
          },
        },
      ],
      meta: { paging: { next: null } },
    })

    const page = await clioConnector.listMatters!(CLIO_AUTH, {})

    expect(page.matters).toHaveLength(1)
    expect(page.matters[0]).toMatchObject({
      externalId: '4242',
      clientFirstName: 'Dana',
      clientLastName: 'Reyes',
      clientEmail: 'dana@example.com',
      clientPhone: '+15555550123',
      practiceArea: 'Motor Vehicle Accidents',
      status: 'Open',
    })
  })

  it('never reports open_date as the incident date', async () => {
    jsonOnce({
      data: [{ id: 1, open_date: '2026-02-01', client: {} }],
      meta: {},
    })

    const page = await clioConnector.listMatters!(CLIO_AUTH, {})

    // open_date is when the file was opened, which can be months after the
    // loss. Treating it as a date of loss would produce a wrong SOL deadline.
    expect(page.matters[0].incidentDate).toBeNull()
    expect(page.matters[0].raw).toMatchObject({ open_date: '2026-02-01' })
  })

  it('splits a company-style single name rather than dumping it in first name', async () => {
    jsonOnce({
      data: [{ id: 2, client: { name: 'Northgate Logistics LLC' } }],
      meta: {},
    })

    const page = await clioConnector.listMatters!(CLIO_AUTH, {})

    expect(page.matters[0].clientFirstName).toBe('Northgate')
    expect(page.matters[0].clientLastName).toBe('Logistics LLC')
  })

  it('follows Clio\u2019s own paging link instead of building an offset', async () => {
    jsonOnce({
      data: [{ id: 1, client: {} }],
      meta: { paging: { next: 'https://app.clio.com/api/v4/matters.json?page_token=abc123&limit=100' } },
    })
    const first = await clioConnector.listMatters!(CLIO_AUTH, {})
    expect(first.nextCursor).toContain('page_token=abc123')

    jsonOnce({ data: [], meta: { paging: { next: null } } })
    await clioConnector.listMatters!(CLIO_AUTH, { cursor: first.nextCursor })

    // The origin comes from apiBase, so the cursor must be reduced to a path.
    expect(requestUrl(1).pathname).toBe('/api/v4/matters.json')
    expect(requestUrl(1).searchParams.get('page_token')).toBe('abc123')
    expect(String(fetchMock.mock.calls[1][0])).not.toContain('app.clio.comhttps')
  })

  it('reports the end of the data as a null cursor', async () => {
    jsonOnce({ data: [{ id: 1, client: {} }], meta: { paging: {} } })

    const page = await clioConnector.listMatters!(CLIO_AUTH, {})

    expect(page.nextCursor).toBeNull()
  })

  it('surfaces an API error rather than returning an empty page', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' })

    await expect(clioConnector.listMatters!(CLIO_AUTH, {})).rejects.toThrow(/401/)
  })
})

describe('filevine listMatters', () => {
  it('sends the org and user headers the gateway requires', async () => {
    jsonOnce({ items: [], hasMore: false })

    await filevineConnector.listMatters!(FV_AUTH, {})

    const headers = (fetchMock.mock.calls[0][1] as any).headers
    expect(headers['x-fv-orgid']).toBe('77')
    expect(headers['x-fv-userid']).toBe('88')
  })

  it('maps a project, including the date of loss Filevine does carry', async () => {
    jsonOnce({
      items: [
        {
          projectId: { native: 9001 },
          projectName: 'Reyes MVA',
          projectTypeCode: 'Personal Injury - Auto',
          clientName: 'Dana Reyes',
          phaseName: 'Treating',
          incidentDate: '2026-03-04',
        },
      ],
      hasMore: false,
    })

    const page = await filevineConnector.listMatters!(FV_AUTH, {})

    expect(page.matters[0]).toMatchObject({
      externalId: '9001',
      clientFirstName: 'Dana',
      clientLastName: 'Reyes',
      description: 'Reyes MVA',
      practiceArea: 'Personal Injury - Auto',
      incidentDate: '2026-03-04',
      status: 'Treating',
    })
  })

  it('advances the offset cursor by the number of rows returned', async () => {
    jsonOnce({
      items: [{ projectId: 1 }, { projectId: 2 }],
      hasMore: true,
    })

    const page = await filevineConnector.listMatters!(FV_AUTH, { limit: 2 })

    expect(page.nextCursor).toBe('2')

    jsonOnce({ items: [], hasMore: false })
    await filevineConnector.listMatters!(FV_AUTH, { cursor: page.nextCursor, limit: 2 })
    expect(requestUrl(1).searchParams.get('offset')).toBe('2')
  })

  it('stops when hasMore is false even on a full page', async () => {
    jsonOnce({ items: [{ projectId: 1 }, { projectId: 2 }], hasMore: false })

    const page = await filevineConnector.listMatters!(FV_AUTH, { limit: 2 })

    expect(page.nextCursor).toBeNull()
  })

  it('infers another page from a full one when hasMore is absent', async () => {
    jsonOnce({ items: [{ projectId: 1 }, { projectId: 2 }] })

    const page = await filevineConnector.listMatters!(FV_AUTH, { limit: 2 })

    // Stopping here would silently truncate the caseload at the first page.
    expect(page.nextCursor).toBe('2')
  })

  it('does not page forever on an empty last page', async () => {
    jsonOnce({ items: [] })

    const page = await filevineConnector.listMatters!(FV_AUTH, { limit: 2 })

    expect(page.nextCursor).toBeNull()
  })
})
