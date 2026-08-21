/**
 * Dashboard settings absorbed two editors that previously only existed on the
 * retired /attorney-preferences page. The intake-hours one is the reason this
 * file exists: the old control offered a "Custom Hours" option with no editor
 * behind it and persisted an empty array, which the routing scorer reads as a
 * schedule with no open window (smart-recommendations.ts docks 5 points and
 * reports "Currently outside intake hours" at every hour of every day). Any
 * regression that writes [] here silently down-ranks the attorney forever.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import AttorneyDashboardProfileTab from './AttorneyDashboardProfileTab'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api', () => ({ uploadAttorneyProfilePhoto: vi.fn() }))
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? '' }),
}))

let container: HTMLDivElement
let root: Root | null = null
let setProfile: ReturnType<typeof vi.fn>

const BASE_PROFILE = {
  attorney: { name: 'Maya Chen' },
  bio: 'Representing injured Californians.',
  specialties: JSON.stringify(['vehicle']),
  languages: JSON.stringify(['English']),
  jurisdictions: JSON.stringify([{ state: 'CA', counties: [] }]),
  excludedCaseTypes: JSON.stringify([]),
  firmName: 'Chen Injury Law',
  firmLocations: JSON.stringify([]),
  intakeHours: '24/7',
  yearsExperience: 15,
  responseTimeHours: 4,
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  setProfile = vi.fn()
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

function mount(overrides: Record<string, unknown> = {}, editing = true) {
  if (root) act(() => root!.unmount())
  root = createRoot(container)
  act(() => {
    root!.render(
      <AttorneyDashboardProfileTab
        error={null}
        profileLoading={false}
        profile={{ ...BASE_PROFILE, ...overrides }}
        editing={editing}
        setEditing={() => {}}
        setProfile={setProfile}
        handleSaveProfile={() => {}}
        negotiationStyle="balanced"
        setNegotiationStyle={() => {}}
        riskTolerance="moderate"
        setRiskTolerance={() => {}}
        handleSaveDecisionProfile={() => {}}
        decisionProfileLoading={false}
        licenseStatus={null}
        licenseSuccess={false}
        licenseError={null}
        setLicenseError={() => {}}
        licenseLoading={false}
        licenseMethod="state_bar_lookup"
        setLicenseMethod={() => {}}
        licenseNumber=""
        setLicenseNumber={() => {}}
        licenseState=""
        setLicenseState={() => {}}
        selectedLicenseFile={null}
        handleStateBarLookup={() => {}}
        handleLicenseFileUpload={() => {}}
        handleLicenseFileChange={() => {}}
      />,
    )
  })
}

/** The saved patch the component handed back to setProfile. */
function savedPatch() {
  expect(setProfile).toHaveBeenCalled()
  const calls = setProfile.mock.calls
  return calls[calls.length - 1][0]
}

function radio(label: string) {
  const found = Array.from(container.querySelectorAll('label')).find((el) =>
    el.textContent?.includes(label),
  )
  return found?.querySelector('input[type="radio"]') as HTMLInputElement
}

it('seeds a real weekly schedule when intake switches off 24/7', () => {
  mount()

  act(() => {
    radio('Specific hours').click()
  })

  const written = JSON.parse(savedPatch().intakeHours)
  expect(written).not.toEqual([])
  expect(written).toEqual([1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: 9, endTime: 17 })))
})

it('keeps the day and hour pickers editable once specific hours are set', () => {
  mount({ intakeHours: JSON.stringify([{ dayOfWeek: 1, startTime: 9, endTime: 17 }]) })

  const startSelect = container.querySelector('select[aria-label="Mon start hour"]') as HTMLSelectElement
  expect(startSelect).toBeTruthy()
  expect(startSelect.value).toBe('9')

  act(() => {
    startSelect.value = '8'
    startSelect.dispatchEvent(new Event('change', { bubbles: true }))
  })

  expect(JSON.parse(savedPatch().intakeHours)).toEqual([{ dayOfWeek: 1, startTime: 8, endTime: 17 }])
})

it('switching back to 24/7 stores the sentinel, not a schedule', () => {
  mount({ intakeHours: JSON.stringify([{ dayOfWeek: 1, startTime: 9, endTime: 17 }]) })

  act(() => {
    radio('Accept intakes 24/7').click()
  })

  expect(savedPatch().intakeHours).toBe('24/7')
})

it('warns when a specific-hours schedule has no days left', () => {
  mount({ intakeHours: JSON.stringify([]) })
  expect(container.textContent).toContain('Pick at least one day')
})

it('lets a solo attorney add and remove office locations', () => {
  mount()

  const addButton = Array.from(container.querySelectorAll('button')).find((el) =>
    el.textContent?.includes('Add office'),
  )!
  act(() => addButton.click())

  expect(JSON.parse(savedPatch().firmLocations)).toHaveLength(1)

  mount({ firmLocations: JSON.stringify([{ address: '1 Main St', city: 'LA', state: 'CA', zip: '90001' }]) })
  const remove = container.querySelector('button[aria-label="Remove office 1"]') as HTMLButtonElement
  act(() => remove.click())

  expect(JSON.parse(savedPatch().firmLocations)).toEqual([])
})

it('keeps firm offices read-only for an attorney linked to a firm', () => {
  // Firm details are owned centrally by the firm dashboard (CP-591), so an
  // associate must not be able to edit them from a personal profile.
  mount({
    lawFirmId: 'firm_1',
    firmLocations: JSON.stringify([{ address: '1 Main St', city: 'LA', state: 'CA', zip: '90001' }]),
  })

  expect(Array.from(container.querySelectorAll('button')).some((el) => el.textContent?.includes('Add office'))).toBe(false)
  expect(container.textContent).toContain('1 Main St')
})
