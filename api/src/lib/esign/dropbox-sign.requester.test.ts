import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
}))

import { dropboxSignProvider } from './dropbox-sign'

/**
 * Who Dropbox Sign names as the sender belongs to the account the API key is
 * on, and no parameter on the send endpoint changes it.
 *
 * This file used to assert the opposite: that `custom_requester_name` and
 * `custom_requester_email_address` went out on every send. They did, and
 * Dropbox Sign ignored both, because neither parameter exists. The tests passed
 * for as long as the bug did, which is the reason they are worth keeping now —
 * the invented parameters looked plausible enough to add once already.
 */
const ORIGINAL_KEY = process.env.DROPBOX_SIGN_API_KEY
const ORIGINAL_FETCH = globalThis.fetch

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  if (ORIGINAL_KEY === undefined) delete process.env.DROPBOX_SIGN_API_KEY
  else process.env.DROPBOX_SIGN_API_KEY = ORIGINAL_KEY
})

async function sendOne() {
  process.env.DROPBOX_SIGN_API_KEY = 'test-key'
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ signature_request: { signature_request_id: 'sr-1' } }),
  })
  globalThis.fetch = fetchMock as any

  const result = await dropboxSignProvider.createEnvelope({
    documentType: 'retainer',
    title: 'Retainer agreement — Plain17',
    signerName: 'Plain17',
    signerEmail: 'plain17@yopmail.com',
    filePath: '/tmp/retainer.pdf',
  })

  return { result, fetchMock, form: fetchMock.mock.calls[0][1].body as FormData }
}

describe('Dropbox Sign send', () => {
  it('invents no requester fields the API would only discard', async () => {
    const { form } = await sendOne()

    expect(form.has('custom_requester_name')).toBe(false)
    expect(form.has('custom_requester_email_address')).toBe(false)
    expect(form.has('requester_email_address')).toBe(false)
  })

  it('sends the document and signer the request is actually for', async () => {
    const { form, result } = await sendOne()

    expect(form.get('signers[0][name]')).toBe('Plain17')
    expect(form.get('signers[0][email_address]')).toBe('plain17@yopmail.com')
    expect(result.externalEnvelopeId).toBe('sr-1')
  })

  it('asks once, having nothing left to retry with', async () => {
    const { fetchMock } = await sendOne()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
