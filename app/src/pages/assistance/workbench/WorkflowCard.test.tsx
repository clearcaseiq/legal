/**
 * Releasing a case has to say what happened, next to the button that did it.
 *
 * The verdict used to be posted into the page-level banner slot under the
 * header. This card is the second one down the side column, so on a real screen
 * that message renders above the fold: the release ran, the engine reported
 * itself, and to the specialist standing at the button nothing happened. That
 * is the whole reason "I release for routing and nothing happens" was reported.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { WorkflowCard } from './WorkflowCard'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

const assistance = {
  id: 'assist-1',
  assessmentId: 'assess-1',
  status: 'ready_for_attorney_review',
  priority: 'normal',
  nextAction: null,
  reviewDueAt: null,
  assignedSpecialist: null,
} as any

function render(props: Partial<Parameters<typeof WorkflowCard>[0]> = {}) {
  return act(() => {
    root!.render(
      <WorkflowCard
        assistance={assistance}
        specialists={[]}
        saving={false}
        releasing={false}
        releaseResult={null}
        onPatch={() => {}}
        onRelease={() => {}}
        {...props}
      />,
    )
  })
}

function releaseButton() {
  return [...container.querySelectorAll('button')].find((b) =>
    /Release for Routing|Releasing/.test(b.textContent || ''),
  )
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  root = null
})

describe('WorkflowCard release', () => {
  it('shows the verdict in the card when the case was routed', async () => {
    await render({
      releaseResult: { ok: true, message: 'Released for routing. Offered to 3 attorneys.' },
    })

    expect(container.textContent).toContain('Released for routing. Offered to 3 attorneys.')
  })

  it('shows the verdict in the card when nobody was reached', async () => {
    // The outcome that looked like a broken button: a real answer from the
    // engine that the specialist never saw.
    await render({
      releaseResult: {
        ok: false,
        message: 'No attorney matched this case, so it has been parked in Manual Review.',
      },
    })

    expect(container.textContent).toContain('parked in Manual Review')
  })

  it('announces the verdict to assistive tech', async () => {
    await render({ releaseResult: { ok: true, message: 'Released for routing.' } })

    const status = container.querySelector('[role="status"]')
    expect(status?.textContent).toContain('Released for routing.')
  })

  it('says nothing before a release has been attempted', async () => {
    await render()

    expect(container.textContent).not.toContain('Released for routing')
  })

  it('calls the handler when pressed in the releasable status', async () => {
    const onRelease = vi.fn()
    await render({ onRelease })

    await act(async () => {
      releaseButton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onRelease).toHaveBeenCalledOnce()
  })

  it('cannot be pressed from any other status', async () => {
    const onRelease = vi.fn()
    await render({ assistance: { ...assistance, status: 'intake_in_progress' }, onRelease })

    expect(releaseButton()!.disabled).toBe(true)
  })
})
