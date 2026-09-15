/**
 * The pre-registration bar check has four outcomes, and only one of them earns
 * a green tick.
 *
 * The outcome worth testing hardest is an active licence under someone else's
 * name: it is a successful lookup, so anything keying off "found" alone reports
 * success and quietly walks the attorney into claiming a stranger's licence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Assert on keys, so a copy change cannot quietly turn a test green.
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

import StateBarPreviewResult from './StateBarPreviewResult'
import type { StateBarPreview } from '../lib/api-auth'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

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

function render(preview: StateBarPreview | null, error: string | null = null) {
  act(() => {
    root = createRoot(container)
    root.render(<StateBarPreviewResult preview={preview} error={error} />)
  })
  return container.textContent || ''
}

function previewOf(overrides: Partial<StateBarPreview>): StateBarPreview {
  return {
    found: true,
    status: 'Active',
    recordName: 'Adam D. Link',
    nameMatch: 'match',
    city: 'Los Angeles',
    admissionDate: 'June 15, 2018',
    profileUrl: null,
    licenseNumber: '271370',
    state: 'CA',
    wouldVerify: true,
    message: 'Verified active California State Bar license for Adam D. Link.',
    ...overrides,
  }
}

describe('StateBarPreviewResult', () => {
  it('renders nothing before a check has run', () => {
    expect(render(null)).toBe('')
  })

  it('confirms an active licence that matches the applicant', () => {
    const text = render(previewOf({}))
    expect(text).toContain('attorneyReg.barPreviewActive')
    expect(text).toContain('attorneyReg.barPreviewMatched')
  })

  it('shows the record details that let the applicant recognise themselves', () => {
    const text = render(previewOf({}))
    expect(text).toContain('Adam D. Link')
    expect(text).toContain('June 15, 2018')
    expect(text).toContain('Los Angeles')
  })

  it('does not congratulate an applicant on an active licence that is not theirs', () => {
    const text = render(previewOf({ nameMatch: 'mismatch', wouldVerify: false }))
    expect(text).not.toContain('attorneyReg.barPreviewActive')
    expect(text).not.toContain('attorneyReg.barPreviewMatched')
  })

  it('names the real licensee on a mismatch, which is how a typo gets spotted', () => {
    const text = render(previewOf({ nameMatch: 'mismatch', wouldVerify: false }))
    expect(text).toContain('attorneyReg.barPreviewMismatch')
    expect(text).toContain('Adam D. Link')
  })

  it('says so when it found the licence but could not compare the name', () => {
    const text = render(previewOf({ nameMatch: 'unknown', recordName: null, wouldVerify: false }))
    expect(text).toContain('attorneyReg.barPreviewUnknownName')
  })

  it('passes through the server message for a number that resolves to nothing', () => {
    const text = render(
      previewOf({
        found: false,
        status: null,
        recordName: null,
        nameMatch: 'unknown',
        wouldVerify: false,
        message: 'No matching California State Bar record was found for that bar number.',
      }),
    )
    expect(text).toContain('attorneyReg.barPreviewNotVerified')
    expect(text).toContain('No matching California State Bar record')
  })

  it('passes through the server message for a state it cannot check', () => {
    const text = render(
      previewOf({
        found: false,
        state: 'NY',
        nameMatch: 'unknown',
        recordName: null,
        wouldVerify: false,
        message: 'Automated State Bar lookup is currently available for California only.',
      }),
    )
    expect(text).toContain('California only')
  })

  it('reassures the applicant that signup continues on every unverified outcome', () => {
    for (const overrides of [
      { nameMatch: 'mismatch' as const },
      { nameMatch: 'unknown' as const },
      { found: false },
    ]) {
      const text = render(previewOf({ ...overrides, wouldVerify: false }))
      expect(text).toContain('attorneyReg.barPreviewContinue')
      act(() => root?.unmount())
      root = null
      container.innerHTML = ''
    }
  })

  it('reports an unreachable State Bar as a failure to check, not a failed check', () => {
    const text = render(null, 'We could not reach the State Bar just now.')
    expect(text).toContain('could not reach the State Bar')
    expect(text).not.toContain('attorneyReg.barPreviewNotVerified')
  })
})
