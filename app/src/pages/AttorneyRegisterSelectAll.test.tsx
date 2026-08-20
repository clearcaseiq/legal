/**
 * Step 2 of attorney registration asks "Which cases do you want?" and offers
 * twelve incident types. A firm that takes the full range had to tap all twelve,
 * so the header carries a tri-state "Select all" control.
 *
 * These tests mount the real page rather than testing the handler in isolation,
 * because the bug the control is most likely to develop is selecting a value the
 * attorney cannot see — the option list is derived from translations, so a
 * select-all wired to the raw constant instead of the rendered options would
 * still pass a unit test of the handler.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ATTORNEY_CASE_TYPES } from '../lib/constants'
import AttorneyRegister from './AttorneyRegister'

vi.mock('../lib/api-auth', () => ({
  registerAttorney: vi.fn(async () => ({})),
  lookupStateBarLicense: vi.fn(async () => ({})),
  uploadAttorneyLicense: vi.fn(async () => ({})),
  checkAttorneyEmailAvailable: vi.fn(async () => ({ available: true })),
}))

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

function mount() {
  root = createRoot(container)
  act(() => {
    root!.render(
      <MemoryRouter>
        <AttorneyRegister />
      </MemoryRouter>,
    )
  })
}

/**
 * Step 2 stays mounted behind the `hidden` attribute, so its controls are
 * reachable without stepping the wizard forward through validation.
 */
function practiceAreaField() {
  const selectAllLabel = Array.from(container.querySelectorAll('label')).find(
    (el) => el.textContent?.trim() === 'Select all',
  )
  if (!selectAllLabel) throw new Error('Select all control not found')
  const selectAll = selectAllLabel.querySelector('input[type="checkbox"]') as HTMLInputElement
  const field = selectAllLabel.closest('div')?.parentElement
  if (!field) throw new Error('practice area field not found')
  const chips = Array.from(
    field.querySelectorAll('input.sr-only[type="checkbox"]'),
  ) as HTMLInputElement[]
  return { selectAll, chips }
}

const checkedCount = (chips: HTMLInputElement[]) => chips.filter((c) => c.checked).length

it('offers one chip per incident type, none selected by default', () => {
  mount()
  const { selectAll, chips } = practiceAreaField()
  expect(chips).toHaveLength(ATTORNEY_CASE_TYPES.length)
  expect(checkedCount(chips)).toBe(0)
  expect(selectAll.checked).toBe(false)
  expect(selectAll.indeterminate).toBe(false)
})

it('selects every case type, then clears them on a second click', () => {
  mount()
  act(() => practiceAreaField().selectAll.click())
  {
    const { selectAll, chips } = practiceAreaField()
    expect(checkedCount(chips)).toBe(ATTORNEY_CASE_TYPES.length)
    expect(selectAll.checked).toBe(true)
    expect(selectAll.indeterminate).toBe(false)
  }

  act(() => practiceAreaField().selectAll.click())
  {
    const { selectAll, chips } = practiceAreaField()
    expect(checkedCount(chips)).toBe(0)
    expect(selectAll.checked).toBe(false)
  }
})

it('shows an indeterminate state for a partial selection', () => {
  mount()
  act(() => practiceAreaField().chips[0].click())
  const { selectAll, chips } = practiceAreaField()
  expect(checkedCount(chips)).toBe(1)
  expect(selectAll.checked).toBe(false)
  expect(selectAll.indeterminate).toBe(true)
})

it('completes a partial selection rather than inverting it', () => {
  mount()
  act(() => practiceAreaField().chips[0].click())
  act(() => practiceAreaField().selectAll.click())
  const { chips } = practiceAreaField()
  expect(checkedCount(chips)).toBe(ATTORNEY_CASE_TYPES.length)
})
