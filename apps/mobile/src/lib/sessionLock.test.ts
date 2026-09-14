/**
 * The rules behind the resume prompt. Biometric sign-in used to be decorative —
 * passing it re-read a token that then stayed usable for a week — so these cases
 * describe when the app is allowed to ask again, and the two situations where
 * asking would do more harm than good.
 */
import { describe, expect, it } from 'vitest'
import { IDLE_LOCK_MS, MAX_SESSION_AGE_MS, isSessionExpired, shouldLockOnResume } from './sessionLock'

const NOW = new Date(2026, 8, 14, 12, 0, 0).getTime()

function resume(overrides: Partial<Parameters<typeof shouldLockOnResume>[0]> = {}) {
  return shouldLockOnResume({
    backgroundedAt: NOW - IDLE_LOCK_MS - 1000,
    now: NOW,
    isAuthenticated: true,
    canPrompt: true,
    ...overrides,
  })
}

describe('locking on resume', () => {
  it('asks again after the app has been away a while', () => {
    expect(resume()).toBe(true)
  })

  it('stays out of the way for a quick trip to the camera', () => {
    // Photographing a document or checking a calendar invite must not cost a
    // prompt, or the attorney turns biometrics off and we protect nothing.
    expect(resume({ backgroundedAt: NOW - 30_000 })).toBe(false)
  })

  it('asks exactly at the threshold', () => {
    expect(resume({ backgroundedAt: NOW - IDLE_LOCK_MS })).toBe(true)
  })

  it('does nothing when nobody is signed in', () => {
    expect(resume({ isAuthenticated: false })).toBe(false)
  })

  it('does not lock a device that cannot answer the prompt', () => {
    // Locking with no enrolled biometrics strands the attorney mid-case behind
    // a dialog they have no way to satisfy.
    expect(resume({ canPrompt: false })).toBe(false)
  })

  it('does nothing on a first launch that never backgrounded', () => {
    expect(resume({ backgroundedAt: null })).toBe(false)
  })

  it('honours a caller-supplied idle window', () => {
    expect(resume({ backgroundedAt: NOW - 60_000, idleMs: 30_000 })).toBe(true)
  })
})

describe('deciding a stored session is past saving', () => {
  it('reports a session older than the server would accept', () => {
    expect(isSessionExpired(NOW - MAX_SESSION_AGE_MS - 1, NOW)).toBe(true)
  })

  it('keeps a session still inside the window', () => {
    expect(isSessionExpired(NOW - 60 * 60 * 1000, NOW)).toBe(false)
  })

  it('leaves a token stored before we recorded the time alone', () => {
    // Everyone signed in at upgrade has no issue time. Signing them all out is
    // a worse trade than waiting for the 401 a dead token produces anyway.
    expect(isSessionExpired(null, NOW)).toBe(false)
  })
})
