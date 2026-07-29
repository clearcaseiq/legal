import { describe, it, expect, vi } from 'vitest'
import { respondESignError } from './http'
import { ESignNotConfiguredError, ESignNotImplementedError } from './types'

function fakeRes() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { status, json } as any
}

describe('respondESignError', () => {
  // CP-436: a firm with no provider connected was shown
  // `E-signature provider "dropbox_sign" is not configured on this server`
  // as a 502, naming a vendor they never chose and reading like an outage.
  it('answers 503 with an actionable message when no provider is connected', () => {
    const res = fakeRes()
    respondESignError(res, new ESignNotConfiguredError('dropbox_sign'))

    expect(res.status).toHaveBeenCalledWith(503)
    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.code).toBe('esign_not_configured')
    expect(body.error).toContain('Firm Settings')
    expect(body.error).not.toContain('dropbox_sign')
    expect(body.detail).toBeUndefined()
  })

  it('keeps a real provider failure as a 502 with its detail', () => {
    const res = fakeRes()
    respondESignError(res, new Error('upstream timed out'))

    expect(res.status).toHaveBeenCalledWith(502)
    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.error).toBe('E-signature provider error')
    expect(body.detail).toBe('upstream timed out')
  })

  it('treats an unimplemented provider method as a provider failure, not a config gap', () => {
    const res = fakeRes()
    respondESignError(res, new ESignNotImplementedError('documenso', 'voidEnvelope'))
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('survives a non-Error being thrown', () => {
    const res = fakeRes()
    respondESignError(res, 'something odd')
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.status.mock.results[0].value.json.mock.calls[0][0].detail).toBe('something odd')
  })
})
