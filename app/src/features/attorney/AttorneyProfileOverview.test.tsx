/**
 * The Overview lets an attorney edit several fields and commit them with one
 * "Save Changes" button. The failure modes worth guarding are the ones that
 * quietly corrupt routing data: writing a county back under the wrong state,
 * offering a county from a state the attorney does not practise in, or letting
 * personal-injury years exceed years at the bar (which the API would clamp,
 * leaving the screen disagreeing with what was stored).
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import AttorneyProfileOverview, { type OverviewProfile } from './AttorneyProfileOverview'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null
let onSave: ReturnType<typeof vi.fn>

const BASE: OverviewProfile = {
  bio: 'Representing injured Californians.',
  photoUrl: '/uploads/a.png',
  specialties: ['vehicle'],
  languages: ['English'],
  languageProficiency: { English: 'native' },
  jurisdictions: [{ state: 'CA', counties: ['Los Angeles'], cities: [] }],
  licenseState: 'CA',
  licenseVerified: true,
  yearsExperience: 15,
  yearsPiExperience: 12,
  totalSettlements: 250_000,
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  onSave = vi.fn(async () => {})
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

function mount(overrides: Partial<OverviewProfile> = {}) {
  root = createRoot(container)
  act(() => {
    root!.render(
      <AttorneyProfileOverview
        profile={{ ...BASE, ...overrides }}
        onSave={onSave}
        onOpenDashboardProfile={() => {}}
      />,
    )
  })
}

const byLabel = <T extends Element>(label: string) =>
  container.querySelector(`[aria-label="${label}"]`) as T

const byText = (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  )
  if (!button) throw new Error(`no button labelled "${text}"`)
  return button as HTMLButtonElement
}

const saveButton = () =>
  Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Save Changes'),
  ) as HTMLButtonElement

const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

const editYears = (label: string) => {
  act(() => byLabel<HTMLButtonElement>(`Edit ${label}`).click())
  return byLabel<HTMLInputElement>(label)
}

it('keeps Save Changes disabled until something is edited', () => {
  mount()
  expect(saveButton().disabled).toBe(true)

  const input = editYears('Years practicing law')
  act(() => setValue(input, '20'))
  expect(saveButton().disabled).toBe(false)
})

it('sends the whole edited draft in one save', async () => {
  mount()
  const input = editYears('Years practicing law')
  act(() => setValue(input, '20'))
  await act(async () => saveButton().click())

  expect(onSave).toHaveBeenCalledTimes(1)
  expect(onSave.mock.calls[0][0]).toMatchObject({
    yearsExperience: 20,
    yearsPiExperience: 12,
    bio: BASE.bio,
    specialties: ['vehicle'],
  })
})

it('pulls personal-injury years down when years of practice drop below them', () => {
  // The API clamps this pair, so the screen has to show the value that will
  // actually be stored rather than an impossible 12-of-8.
  mount()
  const input = editYears('Years practicing law')
  act(() => setValue(input, '8'))

  expect(container.textContent).toContain('8 years')
  act(() => byLabel<HTMLButtonElement>('Edit Years handling personal injury').click())
  expect(byLabel<HTMLInputElement>('Years handling personal injury').value).toBe('8')
})

it('will not let personal-injury years exceed years of practice', () => {
  mount()
  const input = editYears('Years handling personal injury')
  act(() => setValue(input, '40'))
  expect(input.value).toBe('15')
})

it('records a new language together with its fluency', async () => {
  mount()
  act(() => byText('Add language').click())
  act(() => setValue(byLabel<HTMLInputElement>('New language'), 'Spanish'))
  act(() => setValue(byLabel<HTMLSelectElement>('New language proficiency'), 'professional'))
  act(() => byLabel<HTMLButtonElement>('Save language').click())
  await act(async () => saveButton().click())

  expect(onSave.mock.calls[0][0]).toMatchObject({
    languages: ['English', 'Spanish'],
    languageProficiency: { English: 'native', Spanish: 'professional' },
  })
})

it('drops the fluency entry when its language is removed', async () => {
  mount({ languages: ['English', 'Spanish'], languageProficiency: { English: 'native', Spanish: 'basic' } })
  act(() => byLabel<HTMLButtonElement>('Remove Spanish').click())
  await act(async () => saveButton().click())

  const draft = onSave.mock.calls[0][0]
  expect(draft.languages).toEqual(['English'])
  expect(draft.languageProficiency).toEqual({ English: 'native' })
})

it('puts an added county back under its own state', async () => {
  mount({
    jurisdictions: [
      { state: 'CA', counties: ['Los Angeles'], cities: [] },
      { state: 'NV', counties: ['Clark'], cities: [] },
    ],
  })
  act(() => byText('Add area').click())
  act(() => setValue(byLabel<HTMLSelectElement>('Add service area'), 'NV::Washoe'))
  await act(async () => saveButton().click())

  expect(onSave.mock.calls[0][0].jurisdictions).toEqual([
    { state: 'CA', counties: ['Los Angeles'], cities: [] },
    { state: 'NV', counties: ['Clark', 'Washoe'], cities: [] },
  ])
})

it('only offers counties from states the attorney already covers', () => {
  mount()
  act(() => byText('Add area').click())
  const options = Array.from(byLabel<HTMLSelectElement>('Add service area').options)
    .map((o) => o.value)
    .filter(Boolean)

  expect(options.length).toBeGreaterThan(0)
  expect(options.every((v) => v.startsWith('CA::'))).toBe(true)
  // Already selected, so it must not be offered a second time.
  expect(options).not.toContain('CA::Los Angeles')
})

it('says a state with no counties chosen is covered statewide', () => {
  mount({ jurisdictions: [{ state: 'CA', counties: [], cities: [] }] })
  expect(container.textContent).toContain('California — statewide')
  expect(container.textContent).toContain('cases from anywhere in the state')
})

it('shows the bar admission as verified and does not offer to edit it', () => {
  mount()
  expect(container.textContent).toContain('California')
  expect(container.textContent).toContain('Verified')
  expect(byLabel('Edit Bar admissions')).toBeNull()
})

it('reports profile strength from the draft, so edits update it immediately', () => {
  // No headshot and no Spanish leaves two of the four items outstanding.
  mount({ photoUrl: null, languages: ['English'] })
  expect(container.textContent).toContain('50%')
  expect(container.textContent).toContain('Missing: Headshot, Spanish Language')
})

it('keeps the draft dirty when the save fails', async () => {
  onSave.mockRejectedValueOnce(new Error('nope'))
  mount()
  const input = editYears('Years practicing law')
  act(() => setValue(input, '20'))
  await act(async () => saveButton().click())

  expect(saveButton().disabled).toBe(false)
  expect(container.textContent).not.toContain('Saved')
})
