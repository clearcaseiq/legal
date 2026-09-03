/**
 * The specialist gate must not become a second admin gate.
 *
 * `adminMiddleware` opens the whole admin API — payments, matching rules, user
 * administration. Widening it to include specialists would hand them all of
 * that along with their queue, which is why Case Assistance has its own gate
 * rather than a new capability on the existing one.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({ ENV: { ADMIN_EMAILS: 'boss@clearcaseiq.com' } }))

import {
  canWorkCaseAssistance,
  isCaseAssistanceManager,
  isSpecialistRole,
  specialistMiddleware,
} from './specialist-access'
import { adminMiddleware } from './admin-access'

const specialist = { email: 'sam@clearcaseiq.com', role: 'specialist' }
const admin = { email: 'admin@clearcaseiq.com', role: 'admin' }
const allowlistAdmin = { email: 'boss@clearcaseiq.com', role: 'client' }
const client = { email: 'claimant@example.com', role: 'client' }
const firmStaff = { email: 'para@firm.com', role: 'staff' }

function runGate(gate: typeof specialistMiddleware, user: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  gate({ user } as any, res as any, next)
  return { status: res.status.mock.calls[0]?.[0] ?? null, passed: next.mock.calls.length > 0 }
}

describe('isSpecialistRole', () => {
  it('matches only the specialist role', () => {
    expect(isSpecialistRole(specialist)).toBe(true)
    expect(isSpecialistRole(admin)).toBe(false)
    // `staff` is law-firm staff, not a ClearCaseIQ employee, despite the name.
    expect(isSpecialistRole(firmStaff)).toBe(false)
    expect(isSpecialistRole(null)).toBe(false)
  })

  it('tolerates stored casing and whitespace', () => {
    expect(isSpecialistRole({ role: ' Specialist ' })).toBe(true)
  })
})

describe('canWorkCaseAssistance', () => {
  it('admits specialists and admins', () => {
    expect(canWorkCaseAssistance(specialist)).toBe(true)
    expect(canWorkCaseAssistance(admin)).toBe(true)
    expect(canWorkCaseAssistance(allowlistAdmin)).toBe(true)
  })

  it('refuses claimants, attorneys and firm staff', () => {
    expect(canWorkCaseAssistance(client)).toBe(false)
    expect(canWorkCaseAssistance({ email: 'a@firm.com', role: 'attorney' })).toBe(false)
    expect(canWorkCaseAssistance(firmStaff)).toBe(false)
    expect(canWorkCaseAssistance(null)).toBe(false)
  })
})

describe('isCaseAssistanceManager', () => {
  it('is admins only — a specialist supervises nobody', () => {
    expect(isCaseAssistanceManager(admin)).toBe(true)
    expect(isCaseAssistanceManager(specialist)).toBe(false)
  })
})

describe('specialistMiddleware', () => {
  it('passes a specialist and an admin', () => {
    expect(runGate(specialistMiddleware, specialist).passed).toBe(true)
    expect(runGate(specialistMiddleware, admin).passed).toBe(true)
  })

  it('401s with no session and 403s with the wrong role', () => {
    expect(runGate(specialistMiddleware, null).status).toBe(401)
    expect(runGate(specialistMiddleware, client).status).toBe(403)
  })
})

describe('the admin gate stayed shut', () => {
  it('does not admit a specialist to the admin API', () => {
    // The whole reason this module exists. If this ever passes, specialists have
    // silently been granted payments, matching rules and user administration.
    const result = runGate(adminMiddleware, specialist)
    expect(result.passed).toBe(false)
    expect(result.status).toBe(403)
  })
})
