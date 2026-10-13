/**
 * Lead creation sends a resume email and text, so with Turnstile on the wizard
 * must not create a lead until the widget has produced a token, and must send
 * that token with the request. With Turnstile off it must behave as before.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ensureAppMessages } from '../i18n'
import IntakeWizardQuick from './IntakeWizardQuick'
import { createIntakeLead, getCaptchaConfig } from '../lib/api-plaintiff'
import { resetTurnstileForTests } from '../components/TurnstileWidget'

const widget = vi.hoisted(() => ({ onToken: null as null | ((token: string | null) => void) }))

vi.mock('../components/TurnstileWidget', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/TurnstileWidget')>()
  return {
    ...actual,
    // Cloudflare's script never loads under test; the fake hands the test the
    // callback the real widget would call with a token.
    default: (props: { onToken: (token: string | null) => void }) => {
      widget.onToken = props.onToken
      return <div data-testid="turnstile" />
    },
  }
})

vi.mock('../lib/api-plaintiff', () => ({
  createAssessment: vi.fn(async () => ({ id: 'a1' })),
  previewAssessmentValuation: vi.fn(async () => {
    throw new Error('offline')
  }),
  predict: vi.fn(async () => ({})),
  checkContactDuplicates: vi.fn(async () => ({ email: null, phone: null })),
  uploadEvidenceFile: vi.fn(async () => ({})),
  processEvidenceFile: vi.fn(async () => ({})),
  extractEvidenceData: vi.fn(async () => ({})),
  analyzeCaseWithChatGPT: vi.fn(async () => ({})),
  calculateSOL: vi.fn(async () => ({})),
  createIntakeLead: vi.fn(async () => 'lead-1'),
  updateIntakeLead: vi.fn(async () => ({})),
  getIntakeLead: vi.fn(async () => ({})),
  getEvidenceFiles: vi.fn(async () => []),
  lookupZipCounties: vi.fn(async () => null),
  getCaptchaConfig: vi.fn(async () => ({ enabled: true, siteKey: 'test-site-key' })),
}))
vi.mock('../lib/api', () => ({
  deleteEvidenceFile: vi.fn(async () => ({})),
  extractIncidentDetails: vi.fn(async () => ({})),
}))
vi.mock('../lib/api-consent', () => ({
  createConsent: vi.fn(async () => ({})),
  fetchPublicConsentTemplate: vi.fn(async () => ({ version: '1.1', documentId: 'hipaa-v1.1', plainLanguageSummary: '', content: '' })),
}))
vi.mock('../components/InlineEvidenceUpload', () => ({ default: () => null }))

let container: HTMLDivElement
let root: Root | null = null

beforeEach(async () => {
  await ensureAppMessages()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, '', '/assess')
  localStorage.clear()
  resetTurnstileForTests()
  widget.onToken = null
  vi.mocked(createIntakeLead).mockClear()
  vi.mocked(getCaptchaConfig).mockResolvedValue({ enabled: true, siteKey: 'test-site-key' })
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
    root = createRoot(container)
    root.render(
      <MemoryRouter initialEntries={['/assess']}>
        <IntakeWizardQuick />
      </MemoryRouter>,
    )
  })
}

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

/** Types an email and leaves the field, which is what saves contact progress. */
async function enterEmail(value: string) {
  const input = document.getElementById('contact-email') as HTMLInputElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

it('waits for a Turnstile token before creating the lead, then sends it', async () => {
  await mount()
  await flush(100)
  expect(document.querySelector('[data-testid="turnstile"]')).toBeTruthy()

  await enterEmail('person@example.com')
  await flush(200)
  expect(createIntakeLead).not.toHaveBeenCalled()

  await act(async () => {
    widget.onToken?.('token-123')
  })
  await flush(50)

  expect(createIntakeLead).toHaveBeenCalledTimes(1)
  expect(vi.mocked(createIntakeLead).mock.calls[0][1]).toBe('token-123')
}, 20000)

it('creates the lead straight away, with no token, when Turnstile is off', async () => {
  vi.mocked(getCaptchaConfig).mockResolvedValue({ enabled: false, siteKey: null })
  await mount()
  await flush(100)
  expect(document.querySelector('[data-testid="turnstile"]')).toBeNull()

  await enterEmail('person@example.com')
  await flush(100)

  expect(createIntakeLead).toHaveBeenCalledTimes(1)
  expect(vi.mocked(createIntakeLead).mock.calls[0][1]).toBeUndefined()
}, 20000)
