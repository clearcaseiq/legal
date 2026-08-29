/**
 * Intake hours are the reason this file exists. The control this tab replaced
 * offered a "Custom Hours" option with no editor behind it and persisted an
 * empty array, which the routing scorer reads as a schedule with no open window
 * (smart-recommendations.ts docks 5 points and reports "Currently outside
 * intake hours" at every hour of every day). Any regression that writes [] here
 * silently down-ranks the attorney forever.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import CasePreferencesTab from './CasePreferencesTab'
import { normalizeAttorneyProfile, type AttorneyProfileModel } from '../attorneyProfileModel'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../lib/api', () => ({
  getAttorneyDecisionProfile: vi.fn(async () => ({ negotiationStyle: '', riskTolerance: '' })),
  saveAttorneyDecisionProfile: vi.fn(async () => ({})),
}))

let container: HTMLDivElement
let root: Root | null = null
let onSave: ReturnType<typeof vi.fn>

const BASE = normalizeAttorneyProfile({
  attorney: { name: 'Maya Chen' },
  bio: 'Representing injured Californians.',
  specialties: JSON.stringify(['vehicle']),
  languages: JSON.stringify(['English']),
  excludedCaseTypes: JSON.stringify([]),
  intakeHours: '24/7',
  responseTimeHours: 4,
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
    root!.render(<CasePreferencesTab profile={{ ...BASE, ...overrides }} saving={false} onSave={onSave} />)
  })
}

/** The patch the tab handed to onSave when "Save Changes" was pressed. */
async function save() {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Save Changes'),
  ) as HTMLButtonElement
  await act(async () => button.click())
  expect(onSave).toHaveBeenCalled()
  return onSave.mock.calls[onSave.mock.calls.length - 1][0]
}

function radio(label: string) {
  const found = Array.from(container.querySelectorAll('label')).find((el) =>
    el.textContent?.includes(label),
  )
  return found?.querySelector('input[type="radio"]') as HTMLInputElement
}

it('seeds a real weekly schedule when intake switches off 24/7', async () => {
  mount()
  act(() => radio('Specific hours').click())

  const written = (await save()).intakeHours
  expect(written).not.toEqual([])
  expect(written).toEqual([1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: 9, endTime: 17 })))
})

it('keeps the day and hour pickers editable once specific hours are set', async () => {
  mount({ intakeHours: [{ dayOfWeek: 1, startTime: 9, endTime: 17 }] })

  const startSelect = container.querySelector('select[aria-label="Mon start hour"]') as HTMLSelectElement
  expect(startSelect).toBeTruthy()
  expect(startSelect.value).toBe('9')

  act(() => {
    startSelect.value = '8'
    startSelect.dispatchEvent(new Event('change', { bubbles: true }))
  })

  expect((await save()).intakeHours).toEqual([{ dayOfWeek: 1, startTime: 8, endTime: 17 }])
})

it('switching back to 24/7 stores the sentinel, not a schedule', async () => {
  mount({ intakeHours: [{ dayOfWeek: 1, startTime: 9, endTime: 17 }] })
  act(() => radio('Accept intakes 24/7').click())

  expect((await save()).intakeHours).toBe('24/7')
})

it('warns when a specific-hours schedule has no days left', () => {
  mount({ intakeHours: [] })
  expect(container.textContent).toContain('Pick at least one day')
})

it('keeps Save Changes disabled until something is edited', () => {
  mount()
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Save Changes'),
  ) as HTMLButtonElement
  expect(button.disabled).toBe(true)
})
