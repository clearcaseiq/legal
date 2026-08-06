/**
 * Repro for the reported mobile white screen: dog bite intake, Step 2 filled,
 * treatments (ER, PT, MRI, injections) selected, then Next to Step 3
 * (injury_severity). A white screen means a render-time crash, so these tests
 * mount the wizard and fail on any thrown error.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import IntakeWizardQuick from './IntakeWizardQuick'

vi.mock('../lib/api-plaintiff', () => ({
  createAssessment: vi.fn(async () => ({ id: 'a1' })),
  predict: vi.fn(async () => ({})),
  uploadEvidenceFile: vi.fn(async () => ({})),
  processEvidenceFile: vi.fn(async () => ({})),
  extractEvidenceData: vi.fn(async () => ({})),
  analyzeCaseWithChatGPT: vi.fn(async () => ({})),
  calculateSOL: vi.fn(async () => ({
    statuteOfLimitations: { years: 2 },
    expiresAt: '2028-08-06T00:00:00.000Z',
    daysRemaining: 730,
    status: 'ok',
  })),
  createIntakeLead: vi.fn(async () => ({ id: 'l1' })),
  updateIntakeLead: vi.fn(async () => ({})),
  getIntakeLead: vi.fn(async () => ({})),
  getEvidenceFiles: vi.fn(async () => []),
}))
vi.mock('../lib/api', () => ({
  deleteEvidenceFile: vi.fn(async () => ({})),
  extractIncidentDetails: vi.fn(async () => ({})),
}))
vi.mock('../lib/api-consent', () => ({
  createConsent: vi.fn(async () => ({})),
  fetchPublicConsentTemplate: vi.fn(async () => ({ version: '1.0', content: '' })),
}))
vi.mock('../components/InlineEvidenceUpload', () => ({
  default: () => null,
}))

let container: HTMLDivElement
let root: Root | null = null
let uncaught: unknown[] = []

beforeEach(() => {
  // jsdom does not implement scrolling; the wizard calls these on step change.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, '', '/assess')
  localStorage.clear()
  uncaught = []
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container.remove()
})

async function mount() {
  await act(async () => {
    root = createRoot(container, { onUncaughtError: (e) => uncaught.push(e) })
    root.render(
      <MemoryRouter initialEntries={["/assess"]}>
        <IntakeWizardQuick />
      </MemoryRouter>
    )
  })
}

async function flush(ms = 50) {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

function buttonWithText(text: string): HTMLButtonElement {
  const match = Array.from(document.querySelectorAll('button')).find(
    (b) => (b.textContent || '').trim().includes(text)
  )
  if (!match) throw new Error(`No button containing text: ${text}`)
  return match as HTMLButtonElement
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  setter.call(el, value)
}

async function change(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  await act(async () => {
    setNativeValue(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function localIsoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

it('full flow: dog bite -> step 2 -> validation error -> treatments -> step 3 renders', async () => {
  await mount()
  await flush(100)

  // Step 1: pick "Animal bite / attack", then subtype "Dog bite".
  await click(buttonWithText('Animal bite / attack'))
  await flush(50)
  await click(buttonWithText('Dog bite'))
  // Subtype confirm may auto-advance after a collapse delay.
  await flush(1200)
  if (!document.body.textContent?.includes('When did the incident happen?')) {
    await click(buttonWithText('Next'))
    await flush(400)
  }
  expect(document.body.textContent).toContain('When did the incident happen?')

  // Step 2: current date, CA + Contra Costa, narrative.
  const dateInput = document.getElementById('incident-exact-date') as HTMLInputElement
  expect(dateInput).toBeTruthy()
  await change(dateInput, localIsoToday())

  const selects = Array.from(document.querySelectorAll('select'))
  const stateSelect = selects.find((s) => Array.from(s.options).some((o) => o.value === 'CA'))
  expect(stateSelect, 'state select not found').toBeTruthy()
  await change(stateSelect!, 'CA')
  await flush(50)

  const countySelect = Array.from(document.querySelectorAll('select')).find((s) =>
    Array.from(s.options).some((o) => /contra costa/i.test(o.textContent || ''))
  )
  expect(countySelect, 'county select not found').toBeTruthy()
  const countyValue = Array.from(countySelect!.options).find((o) => /contra costa/i.test(o.textContent || ''))!.value
  await change(countySelect!, countyValue)
  await flush(50)

  const narrative = Array.from(document.querySelectorAll('textarea'))[0]
  expect(narrative, 'narrative textarea not found').toBeTruthy()
  await change(narrative, 'Random description text for the dog attack repro.')
  await flush(50)

  // Next without treatment: must show the validation error, stay on step 2.
  await click(buttonWithText('Next'))
  await flush(100)
  expect(document.body.textContent).toContain('Please select at least one option')

  // Select all four treatments.
  for (const label of ['ER visit', 'Physical therapy', 'MRI', 'Injections']) {
    await click(buttonWithText(label))
    await flush(20)
  }

  // Next -> Step 3. This is where the white screen was reported.
  await click(buttonWithText('Next'))
  await flush(500)

  expect(uncaught, `render crashed: ${uncaught.map((e) => (e as Error)?.stack ?? String(e)).join('\n')}`).toEqual([])
  expect(document.body.textContent).toContain('Your Injuries & Treatment')
  // The step content should actually be visible (not an empty panel).
  expect(document.body.textContent).toContain('ER visit')
})
