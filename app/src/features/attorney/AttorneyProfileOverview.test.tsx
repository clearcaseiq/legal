/**
 * The Profile tab lets an attorney edit several fields and commit them with one
 * "Save Changes" button. The failure modes worth guarding are the ones that
 * quietly disagree with what was stored: dropping a fluency entry alongside its
 * language, or letting personal-injury years exceed years at the bar (which the
 * API clamps, leaving the screen showing an impossible pair).
 *
 * Service areas moved to the Practice tab and are covered by its own tests.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
vi.mock('../../lib/api', () => ({
  requestEmailVerification: vi.fn().mockResolvedValue({ data: { message: 'Verification link sent.' } }),
}))

import AttorneyProfileOverview, { type OverviewProfile } from './AttorneyProfileOverview'
import { requestEmailVerification } from '../../lib/api'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null
let onSave: ReturnType<typeof vi.fn>

const BASE: OverviewProfile = {
  name: 'Dana Reyes',
  bio: 'Representing injured Californians.',
  photoUrl: '/uploads/a.png',
  specialties: ['vehicle'],
  languages: ['English'],
  languageProficiency: { English: 'native' },
  licenseState: 'CA',
  licenseVerified: true,
  email: 'dana@reyeslaw.test',
  emailVerified: true,
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
    root!.render(<AttorneyProfileOverview profile={{ ...BASE, ...overrides }} onSave={onSave} />)
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

/**
 * The email badge is easy to confuse with the two other verification states on
 * this page (bar admissions, and the vetting flag an admin sets), so these
 * assertions pin the wording rather than just the presence of a badge.
 */
it('shows the signup address as pending, with a way to re-send, until it is confirmed', () => {
  mount({ emailVerified: false })

  expect(container.textContent).toContain('dana@reyeslaw.test')
  expect(container.textContent).toContain('Pending')
  expect(byText('Resend verification email')).toBeTruthy()
})

it('drops the pending state and the re-send once the address is confirmed', () => {
  mount({ emailVerified: true })

  expect(container.textContent).not.toContain('Pending')
  expect(container.textContent).not.toContain('Resend verification email')
})

it('re-sends the verification email on request', async () => {
  vi.mocked(requestEmailVerification).mockClear()
  mount({ emailVerified: false })

  await act(async () => byText('Resend verification email').click())

  expect(requestEmailVerification).toHaveBeenCalledTimes(1)
  expect(container.textContent).toContain('Verification link sent.')
})

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

it('saves the display name, which is stored on the attorney rather than the profile', async () => {
  mount()
  const nameInput = container.querySelector('#attorney-display-name') as HTMLInputElement
  act(() => setValue(nameInput, 'Dana R. Reyes'))
  await act(async () => saveButton().click())

  expect(onSave.mock.calls[0][0].name).toBe('Dana R. Reyes')
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
