/**
 * The claimant's half of on-behalf editing.
 *
 * The property that matters is that declining is a real, equally available
 * option. If the card nudged toward confirming — by hiding what the claimant
 * already had, or by making "no" harder to reach — it would be a slower way of
 * letting a specialist overwrite someone's account of their own injury, which is
 * the exact thing the proposal mechanism exists to prevent.
 */
import { it, expect, vi, beforeEach, afterEach, describe } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { getMock, respondMock } = vi.hoisted(() => ({ getMock: vi.fn(), respondMock: vi.fn() }))

vi.mock('../lib/api-plaintiff', () => ({
  getFactConfirmations: getMock,
  respondToFactConfirmation: respondMock,
}))

import PlaintiffFactConfirmations from './PlaintiffFactConfirmations'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

const PENDING = {
  id: 'p-1',
  path: 'damages.wage_loss',
  label: 'Lost wages',
  type: 'number' as const,
  currentValue: '900',
  proposedValue: '2400',
  proposedBy: 'Sam Reyes',
  proposedAt: '2026-09-03T10:00:00.000Z',
}

beforeEach(() => {
  getMock.mockReset().mockResolvedValue([])
  respondMock.mockReset().mockResolvedValue([])
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

async function render(assessmentId: string | null = 'asm-1', readOnly = false) {
  await act(async () => {
    root = createRoot(container)
    root.render(<PlaintiffFactConfirmations assessmentId={assessmentId} readOnly={readOnly} />)
  })
}

function buttonLabelled(text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined
}

async function click(button: HTMLButtonElement | undefined) {
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('PlaintiffFactConfirmations', () => {
  it('renders nothing when nothing is waiting', async () => {
    await render()
    expect(container.textContent).toBe('')
  })

  it('renders nothing, and asks for nothing, without an assessment', async () => {
    await render(null)
    expect(getMock).not.toHaveBeenCalled()
    expect(container.textContent).toBe('')
  })

  it('shows both values so the claimant can see what would change', async () => {
    getMock.mockResolvedValue([PENDING])
    await render()

    expect(container.textContent).toContain('Lost wages')
    // Their own answer stays visible next to the specialist's.
    expect(container.textContent).toContain('900')
    expect(container.textContent).toContain('2400')
    expect(container.textContent).toContain('Sam Reyes')
  })

  it('says plainly that nothing has changed yet', async () => {
    getMock.mockResolvedValue([PENDING])
    await render()
    expect(container.textContent).toContain('Nothing has changed on your case yet')
  })

  it('confirms', async () => {
    getMock.mockResolvedValue([PENDING])
    await render()

    await click(buttonLabelled('Yes, that is right'))

    expect(respondMock).toHaveBeenCalledWith('asm-1', 'p-1', { decision: 'confirm' })
  })

  it('offers declining just as readily, and sends it as a decline', async () => {
    getMock.mockResolvedValue([PENDING])
    await render()

    const decline = buttonLabelled('No, keep what I had')
    expect(decline).toBeTruthy()
    expect(decline?.disabled).toBe(false)

    await click(decline)

    expect(respondMock).toHaveBeenCalledWith('asm-1', 'p-1', { decision: 'decline' })
  })

  it('shows what an empty proposal would do rather than leaving it blank', async () => {
    // Clearing a field is a legitimate correction, and "nothing" has to read as
    // a deliberate change rather than a rendering bug.
    getMock.mockResolvedValue([{ ...PENDING, currentValue: '900', proposedValue: null }])
    await render()

    expect(container.textContent).toContain('Clear this')
  })

  it('labels an unanswered field rather than showing an empty box', async () => {
    getMock.mockResolvedValue([{ ...PENDING, currentValue: null }])
    await render()

    expect(container.textContent).toContain('Nothing yet')
  })

  it('acknowledges the last one instead of vanishing', async () => {
    getMock.mockResolvedValue([PENDING])
    respondMock.mockResolvedValue([])
    await render()

    await click(buttonLabelled('Yes, that is right'))

    expect(container.textContent).toContain('that is all updated')
  })

  it('explains a race rather than showing a generic failure', async () => {
    getMock.mockResolvedValue([PENDING])
    respondMock.mockRejectedValue({ response: { data: { error: 'not_pending' } } })
    await render()

    await click(buttonLabelled('Yes, that is right'))

    expect(container.textContent).toContain('Someone already answered this one')
  })

  it('hides the buttons on a shared read-only view', async () => {
    // A case shared with an attorney must not let them answer for the claimant.
    getMock.mockResolvedValue([PENDING])
    await render('asm-1', true)

    expect(container.textContent).toContain('Lost wages')
    expect(buttonLabelled('Yes, that is right')).toBeUndefined()
    expect(buttonLabelled('No, keep what I had')).toBeUndefined()
  })
})
