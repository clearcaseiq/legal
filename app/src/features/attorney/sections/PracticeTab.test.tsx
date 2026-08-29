/**
 * Service areas and firm details, the two things on this tab that routing and
 * firm governance depend on.
 *
 * The county round-trip matters because coverage is edited as a state list plus
 * a per-state county map but stored as a single `[{ state, counties }]` array:
 * the editor that came before this one rebuilt an entry as `counties: []` when a
 * state was unticked and reinstated, quietly widening the attorney to the whole
 * state. Firm details matter because an associate must not be able to rewrite
 * them from a personal profile (CP-591).
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import PracticeTab from './PracticeTab'
import { normalizeAttorneyProfile, type AttorneyProfileModel } from '../attorneyProfileModel'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../lib/api', () => ({
  getAttorneyLicenseStatus: vi.fn(async () => null),
  lookupStateBarLicense: vi.fn(async () => ({ profile: null })),
  uploadAttorneyLicense: vi.fn(async () => ({ profile: null })),
}))

let container: HTMLDivElement
let root: Root | null = null
let onSave: ReturnType<typeof vi.fn>

const BASE = normalizeAttorneyProfile({
  attorney: { name: 'Maya Chen' },
  jurisdictions: JSON.stringify([{ state: 'CA', counties: ['Los Angeles'], cities: [] }]),
  firmName: 'Chen Injury Law',
  firmLocations: JSON.stringify([]),
})

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  onSave = vi.fn(async () => true)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

function mount(overrides: Partial<AttorneyProfileModel> = {}) {
  if (root) act(() => root!.unmount())
  root = createRoot(container)
  act(() => {
    root!.render(
      <PracticeTab
        profile={{ ...BASE, ...overrides }}
        saving={false}
        onSave={onSave}
        onProfileChanged={() => {}}
      />,
    )
  })
}

function button(text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as
    | HTMLButtonElement
    | undefined
}

const toggleLabel = (el: Element) => (el.textContent || '').replace('✓', '').trim()

/** A county toggle, whose label is just the county name. */
function countyToggle(county: string) {
  const found = Array.from(container.querySelectorAll('button[aria-pressed]')).find(
    (b) => toggleLabel(b) === county,
  )
  if (!found) throw new Error(`no county toggle for "${county}"`)
  return found as HTMLButtonElement
}

/** A state toggle, labelled with the code and the full state name. */
function stateToggle(code: string, name: string) {
  const found = Array.from(container.querySelectorAll('button[aria-pressed]')).find(
    (b) => toggleLabel(b) === `${code}${name}`,
  )
  if (!found) throw new Error(`no state toggle for "${code}"`)
  return found as HTMLButtonElement
}

/** Counties are collapsed behind a per-state row until that state is expanded. */
function expandCounties(code: string) {
  const row = Array.from(container.querySelectorAll('button[aria-expanded]')).find((b) =>
    b.textContent?.includes(code),
  ) as HTMLButtonElement
  act(() => row.click())
}

async function save() {
  await act(async () => button('Save Changes')!.click())
  expect(onSave).toHaveBeenCalled()
  return onSave.mock.calls[onSave.mock.calls.length - 1][0]
}

it('writes the chosen counties back under their own state', async () => {
  mount()
  expandCounties('CA')
  act(() => countyToggle('Orange').click())

  expect((await save()).jurisdictions).toEqual([
    { state: 'CA', counties: ['Los Angeles', 'Orange'], cities: [] },
  ])
})

it('a state with every county cleared still means the whole state', async () => {
  mount()
  expandCounties('CA')
  act(() => countyToggle('Los Angeles').click())

  expect((await save()).jurisdictions).toEqual([{ state: 'CA', counties: [], cities: [] }])
})

it('brings a state back with its counties intact after it is unticked', async () => {
  // The previous editor rebuilt the entry as `counties: []` here, which routing
  // reads as the whole state — a silent widening of coverage.
  mount()
  act(() => stateToggle('CA', 'California').click())
  act(() => stateToggle('CA', 'California').click())

  expect((await save()).jurisdictions).toEqual([
    { state: 'CA', counties: ['Los Angeles'], cities: [] },
  ])
})

it('keeps firm offices read-only for an attorney linked to a firm', () => {
  // Firm details are owned centrally by the firm dashboard (CP-591), so an
  // associate must not be able to edit them from a personal profile.
  mount({
    lawFirmId: 'firm_1',
    firmLocations: [{ address: '1 Main St', city: 'LA', state: 'CA', zip: '90001' }],
  })

  expect(button('Add office')).toBeUndefined()
  expect(container.textContent).toContain('1 Main St')
})

it('lets a solo attorney add and remove office locations', async () => {
  mount()
  act(() => button('Add office')!.click())
  expect((await save()).firmLocations).toHaveLength(1)

  mount({ firmLocations: [{ address: '1 Main St', city: 'LA', state: 'CA', zip: '90001' }] })
  const remove = container.querySelector('button[aria-label="Remove office 1"]') as HTMLButtonElement
  act(() => remove.click())

  expect((await save()).firmLocations).toEqual([])
})
