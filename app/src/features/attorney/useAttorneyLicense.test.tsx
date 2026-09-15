/**
 * Manual Upload has to check the bar number too.
 *
 * Nothing in the product reads an uploaded licence document — there is no OCR,
 * no review queue, and no admin screen that opens it. So an attorney who chose
 * Manual Upload and typed a perfectly good bar number stayed unverified
 * indefinitely, waiting on a review that does not happen, while the one check
 * that could have verified them sat unused next to the file.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const uploadAttorneyLicense = vi.fn()
const lookupStateBarLicense = vi.fn()
const getAttorneyLicenseStatus = vi.fn()

vi.mock('../../lib/api', () => ({
  uploadAttorneyLicense: (...args: unknown[]) => uploadAttorneyLicense(...args),
  lookupStateBarLicense: (...args: unknown[]) => lookupStateBarLicense(...args),
  getAttorneyLicenseStatus: (...args: unknown[]) => getAttorneyLicenseStatus(...args),
}))

import { useAttorneyLicense } from './useAttorneyLicense'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null
let api: ReturnType<typeof useAttorneyLicense>

function Harness() {
  api = useAttorneyLicense()
  return null
}

beforeEach(async () => {
  uploadAttorneyLicense.mockReset().mockResolvedValue({ profile: {} })
  lookupStateBarLicense.mockReset().mockResolvedValue({ success: true })
  getAttorneyLicenseStatus.mockReset().mockResolvedValue({ hasLicense: false })

  container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    root = createRoot(container)
    root.render(<Harness />)
  })
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

const noopSubmit = { preventDefault: () => {} } as React.FormEvent

async function uploadWith({ number, state }: { number?: string; state?: string }) {
  await act(async () => {
    api.selectLicenseFile(new File(['x'], 'bar-card.pdf', { type: 'application/pdf' }))
  })
  if (number !== undefined) await act(async () => api.setLicenseNumber(number))
  if (state !== undefined) await act(async () => api.setLicenseState(state))
  await act(async () => {
    await api.handleLicenseFileUpload(noopSubmit)
  })
}

describe('handleLicenseFileUpload', () => {
  it('checks the bar number against the State Bar after uploading the document', async () => {
    await uploadWith({ number: '271370', state: 'CA' })

    expect(uploadAttorneyLicense).toHaveBeenCalledTimes(1)
    expect(lookupStateBarLicense).toHaveBeenCalledWith('271370', 'CA')
  })

  it('uploads before looking up, so the document cannot claim the verification', async () => {
    const order: string[] = []
    uploadAttorneyLicense.mockImplementation(async () => {
      order.push('upload')
      return { profile: {} }
    })
    lookupStateBarLicense.mockImplementation(async () => {
      order.push('lookup')
      return { success: true }
    })

    await uploadWith({ number: '271370', state: 'CA' })

    expect(order).toEqual(['upload', 'lookup'])
  })

  it('does not look up without a state, which the lookup cannot work without', async () => {
    await uploadWith({ number: '271370' })
    expect(lookupStateBarLicense).not.toHaveBeenCalled()
  })

  it('does not look up when no number was supplied', async () => {
    await uploadWith({ state: 'CA' })
    expect(lookupStateBarLicense).not.toHaveBeenCalled()
  })

  it('still reports the upload as successful when the number fails to verify', async () => {
    lookupStateBarLicense.mockRejectedValue({
      response: { data: { error: 'The State Bar lists license 271370 under Adam D. Link' } },
    })

    await uploadWith({ number: '271370', state: 'CA' })

    // The file did upload; only the number failed. Reporting an upload failure
    // would send the attorney back to re-upload a document that arrived fine.
    expect(api.licenseSuccess).toBe(true)
    expect(api.licenseError).toContain('Adam D. Link')
  })

  it('refreshes the stored status after the lookup, not before it', async () => {
    await uploadWith({ number: '271370', state: 'CA' })

    const lookupCall = lookupStateBarLicense.mock.invocationCallOrder[0]
    const statusCalls = getAttorneyLicenseStatus.mock.invocationCallOrder
    expect(statusCalls[statusCalls.length - 1]).toBeGreaterThan(lookupCall)
  })

  it('reports a genuine upload failure as one, and never reaches the lookup', async () => {
    uploadAttorneyLicense.mockRejectedValue({ response: { data: { error: 'File too large' } } })

    await uploadWith({ number: '271370', state: 'CA' })

    expect(api.licenseError).toBe('File too large')
    expect(api.licenseSuccess).toBe(false)
    expect(lookupStateBarLicense).not.toHaveBeenCalled()
  })

  it('refuses to submit with no file chosen', async () => {
    await act(async () => {
      await api.handleLicenseFileUpload(noopSubmit)
    })

    expect(uploadAttorneyLicense).not.toHaveBeenCalled()
    expect(api.licenseError).toBe('Please select a license file to upload')
  })
})

describe('selectLicenseFile', () => {
  it('rejects a file type the API will not accept', async () => {
    await act(async () => {
      api.selectLicenseFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))
    })

    expect(api.selectedLicenseFile).toBeNull()
    expect(api.licenseError).toContain('PDF or image')
  })

  it('rejects a file over the size limit', async () => {
    const big = new File(['x'], 'scan.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })

    await act(async () => {
      api.selectLicenseFile(big)
    })

    expect(api.selectedLicenseFile).toBeNull()
    expect(api.licenseError).toContain('10MB')
  })

  it('ignores a cancelled picker rather than clearing a prior choice', async () => {
    const file = new File(['x'], 'bar-card.pdf', { type: 'application/pdf' })
    await act(async () => api.selectLicenseFile(file))
    await act(async () => api.selectLicenseFile(undefined))

    expect(api.selectedLicenseFile).toBe(file)
  })
})
