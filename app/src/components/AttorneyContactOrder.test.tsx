/**
 * The claimant's attorney contact order.
 *
 * The screen used to open on four cards already ranked 1-4 and ask the claimant
 * to sort them, which reads as "you have chosen these four" and asks for a
 * four-way decision before they know anything about anyone. It now asks for one
 * decision — who to approach first — and only then shows the order.
 *
 * Nothing here had a test before, including the reordering.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { AttorneyContactOrder } from './AttorneyContactOrder'
import type { ContactOrderAttorney } from '../lib/attorneyContactOrder'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Assert on keys, so a copy change cannot quietly turn a test green.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

let container: HTMLDivElement
let root: Root | null = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

function attorney(id: string, name: string): ContactOrderAttorney {
  return {
    id,
    name,
    firmName: `${name} Law`,
    photoUrl: '',
    initials: name.slice(0, 2).toUpperCase(),
    rating: null,
    verifiedReviewCount: 0,
    practice: 'auto_accident',
    servedVenue: 'CA',
    responseSignal: null,
    yearsExperience: 0,
    languages: [],
    reasons: ['handles auto', 'serves CA'],
    bookingSlug: null,
  }
}

const ATTORNEYS = [attorney('a1', 'Bobby Smith'), attorney('a2', 'Serry Marteen'), attorney('a3', 'Maria Marteen')]

const handlers = () => ({
  onChooseFirst: vi.fn(),
  onReorder: vi.fn(),
  onMove: vi.fn(),
  onRemove: vi.fn(),
  onRestore: vi.fn(),
  onEditFirstChoice: vi.fn(),
})

async function mount(props: Partial<Parameters<typeof AttorneyContactOrder>[0]> = {}) {
  const spies = handlers()
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <AttorneyContactOrder
        attorneys={ATTORNEYS}
        removed={[]}
        firstChoiceChosen={false}
        readOnly={false}
        t={t}
        {...spies}
        {...props}
      />,
    )
  })
  return spies
}

function buttonsLabelled(label: string): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')].filter(
    (node) => node.textContent?.trim() === label || node.getAttribute('aria-label') === label,
  ) as HTMLButtonElement[]
}

async function click(node: Element) {
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('before a first choice is made', () => {
  it('asks who to contact first rather than presenting a ranking', async () => {
    await mount()
    expect(container.textContent).toContain('results.contactOrder.title')
    expect(container.textContent).toContain('results.contactOrder.intro')
    // No rank badges yet: nothing has been chosen, so nothing is numbered.
    expect(container.textContent).not.toContain('results.contactOrder.rankFirst')
  })

  it('describes the ordering without calling it a recommendation', async () => {
    await mount()
    expect(container.textContent).toContain('results.contactOrder.orderingNote')
  })

  it('offers one choice per attorney and reports which was picked', async () => {
    const spies = await mount()
    const buttons = buttonsLabelled('results.contactOrder.selectFirst')
    expect(buttons).toHaveLength(3)

    await click(buttons[1])
    expect(spies.onChooseFirst).toHaveBeenCalledWith('a2')
  })
})

describe('once a first choice is made', () => {
  it('shows the contact order with what each position means', async () => {
    await mount({ firstChoiceChosen: true })
    expect(container.textContent).toContain('results.contactOrder.yourOrder')
    expect(container.textContent).toContain('results.contactOrder.rankFirst')
    expect(container.textContent).toContain('results.contactOrder.rankSecond')
    expect(container.textContent).toContain('results.contactOrder.rankThird')
  })

  it('restates the order next to the send button, so a drag is visibly saved', async () => {
    await mount({ firstChoiceChosen: true })
    expect(container.textContent).toContain('results.contactOrder.summaryLead')
    const summary = container.textContent ?? ''
    expect(summary.indexOf('Bobby Smith')).toBeLessThan(summary.indexOf('Serry Marteen'))
  })

  it('reorders with the buttons, which are the control that works on touch', async () => {
    const spies = await mount({ firstChoiceChosen: true })
    const down = buttonsLabelled('results.calc.moveDown')
    await click(down[0])
    expect(spies.onMove).toHaveBeenCalledWith('a1', 1)

    const up = buttonsLabelled('results.calc.moveUp')
    await click(up[2])
    expect(spies.onMove).toHaveBeenCalledWith('a3', -1)
  })

  it('disables the moves that would run off either end', async () => {
    await mount({ firstChoiceChosen: true })
    expect(buttonsLabelled('results.calc.moveUp')[0].disabled).toBe(true)
    expect(buttonsLabelled('results.calc.moveDown')[2].disabled).toBe(true)
  })

  it('lets the first choice be reconsidered', async () => {
    const spies = await mount({ firstChoiceChosen: true })
    await click(buttonsLabelled('results.contactOrder.changeFirstChoice')[0])
    expect(spies.onEditFirstChoice).toHaveBeenCalled()
  })

  it('takes an attorney off the list', async () => {
    const spies = await mount({ firstChoiceChosen: true })
    await click(buttonsLabelled('results.calc.remove')[1])
    expect(spies.onRemove).toHaveBeenCalledWith('a2')
  })
})

describe('a drag handle', () => {
  it('is reachable by keyboard, so reordering is not mouse-only', async () => {
    const spies = await mount({ firstChoiceChosen: true })
    const handle = buttonsLabelled('results.contactOrder.dragHandleLabel:{"name":"Bobby Smith"}')[0]
    expect(handle).toBeTruthy()

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(spies.onMove).toHaveBeenCalledWith('a1', 1)
  })

  it('opts out of browser touch scrolling so a touch drag is not stolen', async () => {
    await mount({ firstChoiceChosen: true })
    const handle = buttonsLabelled('results.contactOrder.dragHandleLabel:{"name":"Bobby Smith"}')[0]
    expect(handle.style.touchAction).toBe('none')
  })
})

describe('a single match', () => {
  it('asks for no decision at all', async () => {
    await mount({ attorneys: [ATTORNEYS[0]], firstChoiceChosen: false })
    expect(container.textContent).toContain('results.calc.contactThisAttorney')
    expect(buttonsLabelled('results.contactOrder.selectFirst')).toHaveLength(0)
    expect(buttonsLabelled('results.calc.moveDown')).toHaveLength(0)
  })
})

describe('a shared read-only report', () => {
  it('shows the order but offers no way to change it', async () => {
    await mount({ firstChoiceChosen: true, readOnly: true })
    expect(container.textContent).toContain('results.contactOrder.rankFirst')
    expect(buttonsLabelled('results.calc.moveUp')).toHaveLength(0)
    expect(buttonsLabelled('results.calc.remove')).toHaveLength(0)
    expect(buttonsLabelled('results.contactOrder.selectFirst')).toHaveLength(0)
  })
})

describe('attorneys the claimant removed', () => {
  it('can be put back', async () => {
    const spies = await mount({ removed: [{ id: 'a9', name: 'Jack Reacher' }] })
    expect(container.textContent).toContain('Jack Reacher')
    await click(buttonsLabelled('results.calc.addBack')[0])
    expect(spies.onRestore).toHaveBeenCalledWith('a9')
  })
})
