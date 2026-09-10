/**
 * The panel that pulls a firm's caseload out of their own CMS.
 *
 * What is asserted here is mostly restraint. This imports someone's entire
 * caseload, so it must not appear where it cannot work, must not run until the
 * firm turns it on, and must not report a clean run while quietly dropping the
 * matters that need a date of loss adding in the CMS.
 */
import { it, expect, vi, describe, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const getCmsConnections = vi.fn()
const setInboundSyncEnabled = vi.fn()
const runInboundSync = vi.fn()

vi.mock('../lib/api-integrations', () => ({
  getCmsConnections: () => getCmsConnections(),
  setInboundSyncEnabled: (...args: unknown[]) => setInboundSyncEnabled(...args),
  runInboundSync: (...args: unknown[]) => runInboundSync(...args),
}))

import AttorneyDashboardCaseloadSync from './AttorneyDashboardCaseloadSync'

let container: HTMLDivElement
let root: Root | null = null

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conn-1',
    provider: 'clio',
    authType: 'oauth',
    status: 'active',
    createdAt: new Date().toISOString(),
    supportsInbound: true,
    inboundSyncEnabled: false,
    ...overrides,
  }
}

function syncResult(overrides: Record<string, unknown> = {}) {
  return {
    connectionId: 'conn-1',
    provider: 'clio',
    dryRun: false,
    imported: 0,
    assessmentIds: [],
    skipped: [],
    seen: 0,
    pagesFetched: 1,
    nextCursor: null,
    reachedEnd: true,
    ...overrides,
  }
}

async function mount() {
  root = createRoot(container)
  await act(async () => {
    root!.render(<AttorneyDashboardCaseloadSync />)
  })
}

/** The button whose visible label contains `label`, or null. */
function button(label: RegExp): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find((el) =>
      label.test(el.textContent || ''),
    ) || null
  )
}

async function click(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getCmsConnections.mockResolvedValue([connection()])
  setInboundSyncEnabled.mockResolvedValue({ inboundSyncEnabled: true })
  runInboundSync.mockResolvedValue(syncResult())
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

describe('when there is nothing to sync from', () => {
  it('renders nothing rather than an empty panel', async () => {
    getCmsConnections.mockResolvedValue([])
    await mount()

    expect(container.textContent).toBe('')
  })

  /** A firm can push to Zapier, but there is nothing there to read back. */
  it('ignores a connection that can only be written to', async () => {
    getCmsConnections.mockResolvedValue([connection({ provider: 'zapier', supportsInbound: false })])
    await mount()

    expect(container.textContent).toBe('')
  })
})

describe('before the firm turns it on', () => {
  it('offers no way to start a sync', async () => {
    await mount()

    expect(container.textContent).toMatch(/bring in your existing caseload/i)
    expect(button(/sync now/i)).toBeNull()
    expect(button(/preview/i)).toBeNull()
  })

  /**
   * The two questions a firm asks before handing over their caseload, answered
   * where they will ask them rather than in a help article.
   */
  it('says what happens to the cases they bring', async () => {
    await mount()

    expect(container.textContent).toMatch(/never offered to another firm/i)
    expect(container.textContent).toMatch(/no routing fee/i)
  })

  it('turns on when asked', async () => {
    await mount()

    // A real click, so the box toggles itself. Assigning `checked` directly
    // desynchronises React's value tracker and the change never fires.
    await click(container.querySelector('input[type="checkbox"]'))

    expect(setInboundSyncEnabled).toHaveBeenCalledWith('conn-1', true)
  })
})

describe('once it is on', () => {
  beforeEach(() => {
    getCmsConnections.mockResolvedValue([connection({ inboundSyncEnabled: true })])
  })

  /** A firm with thousands of matters should see the shape of a run first. */
  it('previews without writing anything', async () => {
    await mount()

    await click(button(/preview/i))

    expect(runInboundSync).toHaveBeenCalledWith('conn-1', { dryRun: true })
  })

  it('runs for real from Sync now', async () => {
    await mount()

    await click(button(/sync now/i))

    expect(runInboundSync).toHaveBeenCalledWith('conn-1', { dryRun: false })
  })

  /**
   * The reported half of the feature. "Imported 340" on its own hides the
   * matters a person has to go and fix, and the fix is in their CMS.
   */
  it('names the matters that could not be imported', async () => {
    runInboundSync.mockResolvedValue(
      syncResult({
        imported: 2,
        seen: 4,
        skipped: [
          {
            externalId: '881',
            reason: 'missing_incident_date',
            label: 'Alvarez v. Hart',
            detail: 'No date of loss on the matter.',
          },
          { externalId: '882', reason: 'duplicate', label: 'Chen v. Metro' },
        ],
      }),
    )
    await mount()

    await click(button(/sync now/i))

    expect(container.textContent).toContain('Alvarez v. Hart')
    expect(container.textContent).toMatch(/no date of loss/i)
    expect(container.textContent).toMatch(/1 need attention/i)
  })

  /** Expected on every run after the first, and not something to act on. */
  it('keeps already-imported matters out of the attention list', async () => {
    runInboundSync.mockResolvedValue(
      syncResult({
        seen: 3,
        skipped: [
          { externalId: '1', reason: 'duplicate', label: 'A' },
          { externalId: '2', reason: 'duplicate', label: 'B' },
        ],
      }),
    )
    await mount()

    await click(button(/sync now/i))

    expect(container.textContent).toMatch(/2 already on file/i)
    expect(container.textContent).not.toMatch(/need attention/i)
  })

  /**
   * A capped run leaves the watermark alone so the next pass resumes. Without
   * saying so, a firm sees 100 of their 4000 matters and concludes it broke.
   */
  it('says more is coming when the caseload did not fit in one run', async () => {
    runInboundSync.mockResolvedValue(syncResult({ imported: 100, seen: 100, reachedEnd: false }))
    await mount()

    await click(button(/sync now/i))

    expect(container.textContent).toMatch(/rest arrives on the next sync/i)
  })

  it('reports a failure instead of a silent no-op', async () => {
    runInboundSync.mockRejectedValue({
      response: { data: { error: 'Token has been expired or revoked.' } },
    })
    await mount()

    await click(button(/sync now/i))

    expect(container.textContent).toMatch(/expired or revoked/i)
  })
})
