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
        onReleaseAnyway={() => {}}
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

function releaseAnywayButton() {
  return [...container.querySelectorAll('button')].find((b) =>
    /anyway/i.test(b.textContent || ''),
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

describe('WorkflowCard routing-pause override', () => {
  it('offers the override when the pause is what stopped the case', async () => {
    await render({
      releaseResult: {
        ok: false,
        message: 'Routing is switched off platform-wide, so nothing was sent.',
        canOverride: true,
      },
    })

    expect(releaseAnywayButton()).toBeDefined()
  })

  it('releases past the pause when pressed', async () => {
    const onReleaseAnyway = vi.fn()
    await render({
      releaseResult: { ok: false, message: 'Routing is switched off.', canOverride: true },
      onReleaseAnyway,
    })

    await act(async () => {
      releaseAnywayButton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReleaseAnyway).toHaveBeenCalledOnce()
  })

  it('stays hidden for a caller the API did not clear to use it', async () => {
    // A specialist gets the same verdict but no button: the API refuses the
    // override for them, and a button that 403s is worse than no button.
    await render({
      releaseResult: {
        ok: false,
        message: 'Routing is switched off platform-wide, so nothing was sent.',
        canOverride: false,
      },
    })

    expect(releaseAnywayButton()).toBeUndefined()
  })

  it('stays hidden for verdicts an override cannot fix', async () => {
    // The fraud gate and an empty match set are not the pause, and pressing
    // past them is not something this button should imply is possible.
    await render({
      releaseResult: { ok: false, message: 'This case was held for manual review.' },
    })

    expect(releaseAnywayButton()).toBeUndefined()
  })
})
