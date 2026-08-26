/**
 * The guest case-submission email offers only "create your free account", and
 * links to /register?claim=<signed token>.
 *
 * Anyone who already had an account could not use that link at all. Registering
 * again is refused as a duplicate, and sign-in dropped the token, so the case
 * they were invited to claim stayed unattached with no way to reach it. The
 * backend was never the problem: /assessments/claim accepts any authenticated
 * user and is idempotent. Only the front end insisted on registration.
 *
 * These mount the real pages, because the defect is in how the token travels
 * between them rather than in any single handler.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../contexts/ToastContext'
import { login, register } from '../lib/api-auth'
import { claimAssessmentByToken } from '../lib/api-plaintiff'
import Login from './Login'
import Register from './Register'

vi.mock('../lib/api-auth', () => ({
  register: vi.fn(),
  login: vi.fn(),
}))

vi.mock('../lib/api-plaintiff', () => ({
  associateAssessments: vi.fn(async () => ({})),
  claimAssessmentByToken: vi.fn(async () => ({ claimed: true, assessmentId: 'asm-1' })),
  listAssessments: vi.fn(async () => []),
}))

vi.mock('../lib/api-consent', () => ({
  createConsent: vi.fn(async () => ({})),
  getPlaintiffConsentCompliance: vi.fn(async () => ({ allRequiredConsentsGranted: true })),
}))

vi.mock('../hooks/usePlaintiffSessionSummary', () => ({
  resetCachedPlaintiffSessionSummary: vi.fn(),
  updateCachedPlaintiffAssessments: vi.fn(),
  updateCachedPlaintiffUser: vi.fn(),
}))

vi.mock('../components/OAuthButtons', () => ({ default: () => null }))
vi.mock('../components/ConsentWorkflow', () => ({ default: () => null }))

const CLAIM_TOKEN = 'claim-token-123'

let container: HTMLDivElement
let root: Root | null = null
let assign: ReturnType<typeof vi.fn>
let realLocation: Location

function setActEnvironment(enabled: boolean) {
  const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  scope.IS_REACT_ACT_ENVIRONMENT = enabled
}

beforeEach(() => {
  setActEnvironment(true)
  container = document.createElement('div')
  document.body.appendChild(container)
  window.localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(claimAssessmentByToken).mockResolvedValue({ claimed: true, assessmentId: 'asm-1' })

  // Login finishes with window.location.assign, which jsdom refuses to perform.
  assign = vi.fn()
  realLocation = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, origin: 'http://localhost:3000', assign },
  })
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
  setActEnvironment(false)
})

function mount(path: string) {
  root = createRoot(container)
  act(() => {
    root!.render(
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<div id="dashboard" />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )
  })
}

/** React tracks its own value, so a plain assignment doesn't reach onChange. */
function setInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function field(id: string): HTMLInputElement {
  const el = container.querySelector(`#${id}`) as HTMLInputElement | null
  if (!el) throw new Error(`field #${id} not found`)
  return el
}

function signInLink(): HTMLAnchorElement | null {
  return Array.from(container.querySelectorAll('a')).find((a) =>
    (a.getAttribute('href') || '').startsWith('/login'),
  ) as HTMLAnchorElement | null
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('claim link when the visitor already has an account', () => {
  it('attaches the case immediately when a plaintiff is already signed in', async () => {
    window.localStorage.setItem('auth_token', 'session-token')
    window.localStorage.setItem('auth_role', 'plaintiff')

    mount(`/register?claim=${CLAIM_TOKEN}`)
    await flush()

    expect(vi.mocked(claimAssessmentByToken)).toHaveBeenCalledWith(CLAIM_TOKEN)
    // Landing on the case, rather than a signup form they cannot complete.
    expect(container.querySelector('#dashboard')).not.toBeNull()
    expect(container.querySelector('#email')).toBeNull()
  })

  it('refuses to claim onto a signed-in attorney, whose account is the wrong owner', async () => {
    window.localStorage.setItem('auth_token', 'session-token')
    window.localStorage.setItem('auth_role', 'attorney')

    mount(`/register?claim=${CLAIM_TOKEN}`)
    await flush()

    expect(vi.mocked(claimAssessmentByToken)).not.toHaveBeenCalled()
  })

  it('carries the claim token to sign-in for a signed-out visitor', async () => {
    mount(`/register?claim=${CLAIM_TOKEN}`)
    await flush()

    const link = signInLink()
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe(`/login?claim=${CLAIM_TOKEN}`)
  })

  it('offers sign-in, token intact, when the email already has an account', async () => {
    vi.mocked(register).mockRejectedValue({
      response: { status: 409, data: { error: 'User already exists' } },
    })

    mount(`/register?claim=${CLAIM_TOKEN}`)
    await flush()

    setInput(field('firstName'), 'Dana')
    setInput(field('email'), 'dana@example.com')
    setInput(field('password'), 'correct-horse')
    act(() => {
      field('accept-legal-signup').click()
    })

    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(container.textContent).toContain('This email already has an account.')
    const offered = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') || '') === `/login?claim=${CLAIM_TOKEN}`,
    )
    expect(offered.length).toBeGreaterThan(0)
  })

  it('redeems the claim token after a successful sign-in and lands on the case', async () => {
    vi.mocked(login).mockResolvedValue({
      token: 'new-token',
      user: { id: 'user-1', email: 'dana@example.com' },
      isAttorney: false,
    } as never)

    mount(`/login?claim=${CLAIM_TOKEN}`)
    await flush()

    setInput(field('email'), 'dana@example.com')
    setInput(field('password'), 'correct-horse')

    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(vi.mocked(claimAssessmentByToken)).toHaveBeenCalledWith(CLAIM_TOKEN)
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('case=asm-1'))
  })

  it('still signs in when the claim fails, rather than stranding the user on the form', async () => {
    vi.mocked(login).mockResolvedValue({
      token: 'new-token',
      user: { id: 'user-1', email: 'dana@example.com' },
      isAttorney: false,
    } as never)
    vi.mocked(claimAssessmentByToken).mockRejectedValue(new Error('claim link expired'))

    mount(`/login?claim=${CLAIM_TOKEN}`)
    await flush()

    setInput(field('email'), 'dana@example.com')
    setInput(field('password'), 'correct-horse')

    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(assign).toHaveBeenCalledWith(expect.stringContaining('/dashboard'))
  })
})
