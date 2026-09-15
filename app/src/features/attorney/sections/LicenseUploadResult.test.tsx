/**
 * The upload confirmation must not promise a review that does not happen.
 *
 * This is the regression these tests exist for: production told an attorney
 * "someone from our team will look it up" when no queue listed the document,
 * no process read it, and no admin could even open it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import LicenseUploadResult from './LicenseUploadResult'
import type { LicenseDocumentCheck } from '../useAttorneyLicense'

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

function render(documentCheck: LicenseDocumentCheck | null) {
  act(() => {
    root = createRoot(container)
    root.render(<LicenseUploadResult documentCheck={documentCheck} />)
  })
  return container.textContent || ''
}

function checkOf(overrides: Partial<LicenseDocumentCheck> = {}): LicenseDocumentCheck {
  return {
    licenseNumber: '271370',
    state: 'CA',
    verified: false,
    status: null,
    recordName: null,
    nameMatch: 'unknown',
    ...overrides,
  }
}

describe('LicenseUploadResult', () => {
  it('never claims a person will review the document', () => {
    const outcomes: (LicenseDocumentCheck | null)[] = [
      null,
      checkOf({ verified: true, status: 'Active', recordName: 'Adam D. Link', nameMatch: 'match' }),
      checkOf({ recordName: 'Adam D. Link', nameMatch: 'mismatch' }),
      checkOf({ status: 'Suspended' }),
      checkOf(),
    ]

    for (const documentCheck of outcomes) {
      const text = render(documentCheck)
      expect(text).not.toMatch(/our team/i)
      expect(text).not.toMatch(/will be reviewed/i)
      act(() => root?.unmount())
      root = null
    }
  })

  it('reports the verified licence with the number it read', () => {
    const text = render(
      checkOf({ verified: true, status: 'Active', recordName: 'Adam D. Link', nameMatch: 'match' }),
    )

    expect(text).toMatch(/License verified/i)
    expect(text).toContain('271370')
    expect(text).toContain('Adam D. Link')
  })

  it('asks for the number when the document could not be read', () => {
    const text = render(null)

    expect(text).toMatch(/could not read a bar number/i)
    expect(text).toMatch(/not verified yet/i)
  })

  it('names the other licensee on a mismatch so a typo is obvious', () => {
    const text = render(checkOf({ recordName: 'Adam D. Link', nameMatch: 'mismatch' }))

    expect(text).toMatch(/under a different name/i)
    expect(text).toContain('Adam D. Link')
  })

  it('gives the actual status rather than a generic failure', () => {
    expect(render(checkOf({ status: 'Suspended' }))).toContain('Suspended')
  })

  it('distinguishes no record from a disqualifying status', () => {
    expect(render(checkOf())).toMatch(/no active record/i)
  })
})
