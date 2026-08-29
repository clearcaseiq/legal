/**
 * The summary line each state collapses to is the load-bearing part. Routing
 * treats an attorney with no counties listed as serving the whole state, so a
 * blank row means "everywhere", not "nothing set yet" — and reading it the
 * wrong way is how someone narrows coverage they meant to leave open.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { CountyCoverageEditor } from './CountyCoverageEditor'
import type { CountiesByState } from '../lib/attorneyJurisdictions'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

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

function render(states: string[], value: CountiesByState, onChange = vi.fn()) {
  act(() => {
    root = createRoot(container)
    root.render(<CountyCoverageEditor states={states} value={value} onChange={onChange} />)
  })
  return onChange
}

function findByText(text: string) {
  return Array.from(container.querySelectorAll('button')).find((el) => el.textContent?.trim() === text)
}

it('reports a state with no counties as covering all of them', () => {
  render(['CA'], {})
  expect(container.textContent).toContain('All counties')
})

it('reports how much of a state is covered once counties are chosen', () => {
  render(['CA'], { CA: ['Los Angeles', 'Orange'] })
  expect(container.textContent).toMatch(/2 of \d+ counties/)
  expect(container.textContent).not.toContain('All counties')
})

it('keeps each state on its own row', () => {
  render(['CA', 'NV'], { CA: ['Orange'] })
  expect(container.textContent).toContain('California')
  expect(container.textContent).toContain('Nevada')
})

it('hides the county list until a state is expanded', () => {
  render(['CA'], {})
  expect(findByText('Orange')).toBeUndefined()

  const row = container.querySelector('button[aria-expanded]') as HTMLButtonElement
  act(() => row.click())
  expect(container.querySelector('input[type="text"]')).not.toBeNull()
})

it('adds a county without disturbing the other states', () => {
  const onChange = render(['CA', 'NV'], { NV: ['Clark'] })
  const row = container.querySelector('button[aria-expanded]') as HTMLButtonElement
  act(() => row.click())

  const county = Array.from(container.querySelectorAll('button')).find((el) =>
    el.textContent?.includes('Orange'),
  ) as HTMLButtonElement
  act(() => county.click())

  expect(onChange).toHaveBeenCalledWith({ NV: ['Clark'], CA: ['Orange'] })
})

it('asks for a state first when none are selected', () => {
  render([], {})
  expect(container.textContent).toContain('Choose a state above')
})
