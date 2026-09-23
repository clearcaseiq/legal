/**
 * Walks the three-screen intake end to end: a dog bite with its date, ZIP and
 * contact on the first screen, then the injuries screen's required questions,
 * then the review. The original repro was a mobile white screen on reaching the
 * injuries screen, so every render also fails the test on a thrown error.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ensureAppMessages } from '../i18n'
import en from '../i18n/locales/en-app.json'
import IntakeWizardQuick from './IntakeWizardQuick'

/**
 * Labels are read from the dictionary the wizard renders from rather than
 * repeated as copy, so rewording an option does not fail a test about flow.
 */
const TREATMENT_ANSWER = en.intake.treatment_er

vi.mock('../lib/api-plaintiff', () => ({
  createAssessment: vi.fn(async () => ({ id: 'a1' })),
  // Requested when the claimant reaches the consent step. Rejecting is the
  // realistic offline case, and the wizard must show no figure rather than
  // computing one, so this also covers that path if a test walks that far.
  previewAssessmentValuation: vi.fn(async () => {
    throw new Error('offline')
  }),
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
  lookupZipCounties: vi.fn(async (zip: string) => ({
    zip,
    state: 'CA',
    counties: [{ state: 'CA', county: 'Contra Costa' }],
  })),
}))
vi.mock('../lib/api', () => ({
  deleteEvidenceFile: vi.fn(async () => ({})),
  extractIncidentDetails: vi.fn(async () => ({})),
}))
vi.mock('../lib/api-consent', () => ({
  createConsent: vi.fn(async () => ({})),
  fetchPublicConsentTemplate: vi.fn(async () => ({
    version: '1.1',
    documentId: 'hipaa-v1.1',
    plainLanguageSummary: '',
    content: '',
  })),
}))
vi.mock('../components/InlineEvidenceUpload', () => ({
  default: () => null,
}))

let container: HTMLDivElement
let root: Root | null = null
let uncaught: unknown[] = []

beforeEach(async () => {
  // The wizard's own strings ship separately from the rest of the dictionary and
  // are normally awaited by its route's lazy loader. Mounting the component
  // directly skips that, so without this its labels render as raw key paths.
  await ensureAppMessages()
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

/**
 * Prefers an exact label, and only falls back to a substring when exactly one
 * button contains it.
 *
 * A plain substring search picked the wrong button here for a long time:
 * choosing a place of care reveals the care-timing options, one of which is
 * "Next day", and it sits above the footer in the DOM. So "Next" stopped
 * meaning the Next button the moment the step was half filled in, the wizard
 * never advanced, and the failure surfaced as step 3 not rendering.
 */
function buttonWithText(text: string): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll('button'))
  const label = (b: Element) => (b.textContent || '').trim()

  const exact = buttons.filter((b) => label(b) === text)
  if (exact.length > 0) return exact[0] as HTMLButtonElement

  const partial = buttons.filter((b) => label(b).includes(text))
  // Naming what was on screen: a step that renders different options than the
  // test expects and a step that fails to render at all both read as "not
  // found", and they need different fixes.
  const onScreen = buttons.map((b) => JSON.stringify(label(b))).join(', ')
  if (partial.length === 0) throw new Error(`No button labelled ${text}\nButtons on screen: ${onScreen}`)
  if (partial.length > 1) {
    throw new Error(
      `${partial.length} buttons contain ${text}, so the intended one is ambiguous: ` +
        `${partial.map((b) => JSON.stringify(label(b))).join(', ')}`,
    )
  }
  return partial[0] as HTMLButtonElement
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

function within(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el) throw new Error(`#${id} is not on screen`)
  return el
}

function buttonIn(id: string, text: string): HTMLButtonElement {
  const match = Array.from(within(id).querySelectorAll('button')).find((b) => (b.textContent || '').includes(text))
  if (!match) throw new Error(`No button containing ${text} in #${id}`)
  return match as HTMLButtonElement
}

function expectNoCrash() {
  expect(uncaught, `render crashed: ${uncaught.map((e) => (e as Error)?.stack ?? String(e)).join('\n')}`).toEqual([])
}

it('three screens: what happened -> injuries & costs -> review', async () => {
  await mount()
  await flush(100)

  // Screen 1 holds the incident type and the date, ZIP and contact together.
  expect(document.body.textContent).toContain(en.intake.stepHeading_whatHappened)
  expect(document.body.textContent).toContain(en.intake.required_summary.replace('{count}', '4'))
  expect(document.getElementById('incident-exact-date')).toBeTruthy()
  expect(document.getElementById('contact-email')).toBeTruthy()

  await click(buttonWithText('Animal bite / attack'))
  await flush(50)
  await click(buttonWithText('Dog bite'))
  // Choosing a subtype must not jump ahead now that the rest of the screen is required.
  await flush(700)
  expect(document.body.textContent).toContain(en.intake.stepHeading_whatHappened)
  expect(document.body.textContent).not.toContain(en.intake.stepHeading_injuriesCosts)

  // Next with only the type answered stays put and names what is missing.
  await click(buttonWithText('Next'))
  await flush(100)
  expect(document.body.textContent).toContain(en.intake.error_enterDate)
  expect(document.body.textContent).toContain(en.intake.contact_required)

  await change(document.getElementById('incident-exact-date') as HTMLInputElement, localIsoToday())
  await change(document.getElementById('intake-zip') as HTMLInputElement, '94520')
  await flush(50)
  expect(document.body.textContent).toContain('Contra Costa, CA')
  await change(document.getElementById('contact-email') as HTMLInputElement, 'repro@example.com')
  await flush(50)

  // The story is optional and collapsed until asked for.
  expect(document.querySelector('textarea')).toBeNull()
  await click(buttonWithText(en.intake.optional_story_title))
  const narrative = document.querySelector('textarea') as HTMLTextAreaElement
  expect(narrative, 'narrative textarea not found').toBeTruthy()
  await change(narrative, 'Random description text for the dog attack repro.')

  await click(buttonWithText('Next'))
  await flush(500)
  expectNoCrash()

  // Screen 2: severity, treatment, medical bills, fault and lawyer are required; the rest is collapsed.
  expect(document.body.textContent).toContain(en.intake.stepHeading_injuriesCosts)
  expect(document.body.textContent).toContain(en.intake.optional_estimate_title)
  expect(document.getElementById('intake-medical-bills')).toBeTruthy()
  expect(document.body.textContent).not.toContain(en.intake.financial_outOfPocket)

  await click(buttonWithText(en.intake.cta_continueReview))
  await flush(100)
  expect(document.body.textContent).toContain(en.intake.treatment_required)
  expect(document.body.textContent).toContain(en.intake.financial_billsRequired)
  expect(document.body.textContent).toContain(en.intake.legal_faultRequired)
  expect(document.body.textContent).toContain(en.intake.legal_attorneyRequired)

  await click(within('intake-severity').querySelector('button')!)
  await click(buttonIn('intake-treatment', TREATMENT_ANSWER))
  // "Not sure" is a valid answer; the server estimates bills from severity.
  await click(buttonIn('intake-medical-bills', en.intake.optionNotSure))
  await click(buttonIn('intake-fault', en.intake.optionNotSure))
  await click(buttonIn('intake-attorney-status', en.intake.optionNo))
  await flush(20)

  // Opening the optional group shows the money questions without making them required.
  await click(buttonWithText(en.intake.optional_estimate_title))
  expect(document.body.textContent).toContain(en.intake.financial_outOfPocket)

  await click(buttonWithText(en.intake.cta_continueReview))
  await flush(500)
  expectNoCrash()

  // Screen 3: the review, with the report button.
  expect(document.body.textContent).toContain(en.intake.stepHeading_review)
  expect(document.body.textContent).toContain(en.intake.cta_generateReport)
  expect(document.body.textContent).toContain(en.intake.step + ' 3 ' + en.intake.of + ' 3')
}, 20000)

it('resumes an old draft saved on a retired step onto the screen that now asks it', async () => {
  localStorage.setItem('intake_quick_draft_v2', JSON.stringify({
    formData: { injuryType: 'vehicle' },
    currentStep: 'financial_impact',
    furthestReachedStepIndex: 3,
  }))
  await mount()
  await flush(100)
  expectNoCrash()
  expect(document.body.textContent).toContain(en.intake.stepHeading_injuriesCosts)
}, 20000)
