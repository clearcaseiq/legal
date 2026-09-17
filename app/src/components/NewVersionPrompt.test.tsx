/**
 * The prompt exists to catch a tab that has quietly gone stale, so the failure
 * that matters most is the opposite one: telling a claimant mid-intake that
 * they should reload when nothing has actually changed. A failed poll and an
 * unreadable response both have to stay silent.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))

import NewVersionPrompt from './NewVersionPrompt'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

function html(buildId: string) {
  return `<script id="__NEXT_DATA__">{"buildId":"${buildId}"}</script>`
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
