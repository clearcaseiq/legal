/**
 * The prompt exists to catch a tab that has quietly gone stale, so the failure
 * that matters most is the opposite one: telling a claimant mid-intake that
 * they should reload when nothing has actually changed. A failed poll and an
 * unreadable response both have to stay silent.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Assert on keys so a copy change cannot quietly turn a test green, but keep
// the interpolated values visible so the date can be checked.
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    language: 'en-US',
  }),
}))

import NewVersionPrompt from './NewVersionPrompt'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

function html(buildId: string, buildTime?: string) {
  const props = buildTime ? `"props":{"pageProps":{"buildTime":"${buildTime}"}},` : ''
  return `<script id="__NEXT_DATA__">{${props}"buildId":"${buildId}"}</script>`
}

/** Renders, then lets the visibility-triggered poll settle. */
async function renderAndPoll() {
  await act(async () => {
    root!.render(<NewVersionPrompt />)
  })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  ;(globalThis as any).__NEXT_DATA__ = { buildId: 'build-one' }
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  root = null
  delete (globalThis as any).__NEXT_DATA__
  vi.unstubAllGlobals()
})

describe('NewVersionPrompt', () => {
  it('prompts a reload once the deployed build has moved on', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => html('build-two') })),
    )

    await renderAndPoll()

    expect(container.textContent).toContain('newVersion.title')
  })

  it('says when the new version was released', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => html('build-two', '2026-09-18T20:15:03Z') })),
    )

    await renderAndPoll()

    expect(container.textContent).toContain('newVersion.titleDated')
    expect(container.textContent).toContain('2026')
  })

  it('still prompts, undated, when the new build carries no stamp', async () => {
    // Every image built before the stamp reached the page props. Withholding
    // the prompt over a missing date would be worse than the missing date.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => html('build-two') })),
    )

    await renderAndPoll()

    expect(container.textContent).toContain('newVersion.title')
    expect(container.textContent).not.toContain('newVersion.titleDated')
  })

  it('stays silent while the tab is current', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => html('build-one') })),
    )

    await renderAndPoll()

    expect(container.textContent).toBe('')
  })

  it('stays silent when the poll fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    await renderAndPoll()

    expect(container.textContent).toBe('')
  })

  it('stays silent when the response is not HTML it can read', async () => {
    // An error page or a captive-portal interception must not read as a deploy.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => '<html>Gateway timeout</html>' })),
    )

    await renderAndPoll()

    expect(container.textContent).toBe('')
  })

  it('can be dismissed by someone who does not want to reload now', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => html('build-two') })),
    )

    await renderAndPoll()
    const dismiss = container.querySelector<HTMLButtonElement>('[aria-label="newVersion.dismiss"]')

    await act(async () => {
      dismiss!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toBe('')
  })
})
