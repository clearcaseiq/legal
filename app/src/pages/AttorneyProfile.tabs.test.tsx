/**
 * The merged profile page keeps its active tab in `?tab=`, because the two
 * pages it replaced were separate URLs and several places in the app linked
 * straight at what is now the Case Preferences section. A deep link that lands
 * on the default tab would be a silent regression: nothing errors, the visitor
 * just arrives at the wrong place.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import AttorneyProfile from './AttorneyProfile'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const PROFILE = {
  id: 'p1',
  attorney: { name: 'Maya Chen' },
  bio: 'Representing injured Californians.',
  specialties: JSON.stringify(['vehicle']),
  languages: JSON.stringify(['English']),
  jurisdictions: JSON.stringify([{ state: 'CA', counties: ['Los Angeles'], cities: [] }]),
  intakeHours: '24/7',
  responseTimeHours: 4,
  verifiedVerdicts: JSON.stringify([]),
}

vi.mock('../lib/api', () => ({
  getMyAttorneyProfile: vi.fn(async () => PROFILE),
  getAttorneyProfilePerformance: vi.fn(async () => null),
  getAttorneyDashboard: vi.fn(async () => null),
  updateAttorneyProfile: vi.fn(async () => PROFILE),
  getAttorneyDecisionProfile: vi.fn(async () => ({ negotiationStyle: '', riskTolerance: '' })),
  saveAttorneyDecisionProfile: vi.fn(async () => ({})),
  getAttorneyLicenseStatus: vi.fn(async () => null),
  lookupStateBarLicense: vi.fn(async () => ({ profile: null })),
  uploadAttorneyLicense: vi.fn(async () => ({ profile: null })),
  addAttorneyVerifiedVerdict: vi.fn(),
  updateAttorneyVerifiedVerdict: vi.fn(),
  deleteAttorneyVerifiedVerdict: vi.fn(),
  uploadVerifiedVerdictDocument: vi.fn(),
  uploadAttorneyProfilePhoto: vi.fn(),
}))

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? 'My Profile' }),
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

async function mount(url: string) {
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[url]}>
        <AttorneyProfile />
      </MemoryRouter>,
    )
  })
}

/** The tab whose button is styled as current. */
function activeTabName() {
  const current = Array.from(container.querySelectorAll('nav button')).find((b) =>
    b.className.includes('border-primary-500'),
  )
  return current?.textContent?.trim()
}

it('opens the tab named in the URL', async () => {
  await mount('/attorney-profile?tab=preferences')
  expect(activeTabName()).toBe('Case Preferences')
  expect(container.textContent).toContain('Case Filters')
})

it('falls back to the Profile tab for a missing or unknown tab', async () => {
  await mount('/attorney-profile')
  expect(activeTabName()).toBe('Profile')

  act(() => root!.unmount())
  await mount('/attorney-profile?tab=nonsense')
  expect(activeTabName()).toBe('Profile')
})

it('puts the tab in the URL when one is picked, so the view can be linked to', async () => {
  await mount('/attorney-profile')
  const practice = Array.from(container.querySelectorAll('nav button')).find(
    (b) => b.textContent?.trim() === 'Practice',
  ) as HTMLButtonElement
  await act(async () => practice.click())

  expect(activeTabName()).toBe('Practice')
  expect(container.textContent).toContain('Service Areas')
})
