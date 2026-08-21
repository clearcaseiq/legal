import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
}))

import { DEFAULT_REQUESTER_EMAIL, dropboxSignProvider, requesterIdentity } from './dropbox-sign'

const ORIGINAL_NAME = process.env.DROPBOX_SIGN_REQUESTER_NAME
const ORIGINAL_EMAIL = process.env.DROPBOX_SIGN_REQUESTER_EMAIL

afterEach(() => {
  if (ORIGINAL_NAME === undefined) delete process.env.DROPBOX_SIGN_REQUESTER_NAME
  else process.env.DROPBOX_SIGN_REQUESTER_NAME = ORIGINAL_NAME
  if (ORIGINAL_EMAIL === undefined) delete process.env.DROPBOX_SIGN_REQUESTER_EMAIL
  else process.env.DROPBOX_SIGN_REQUESTER_EMAIL = ORIGINAL_EMAIL
})

describe('Dropbox Sign requester identity', () => {
  it('brands the request as ClearCaseIQ when nothing is configured', () => {
    delete process.env.DROPBOX_SIGN_REQUESTER_NAME
    delete process.env.DROPBOX_SIGN_REQUESTER_EMAIL

    expect(requesterIdentity()).toEqual({ name: 'ClearCaseIQ', email: DEFAULT_REQUESTER_EMAIL })
  })

  it('does not treat a blank override as a name', () => {
    process.env.DROPBOX_SIGN_REQUESTER_NAME = '   '

    expect(requesterIdentity().name).toBe('ClearCaseIQ')
  })

  it('lets an operator rename the requester without changing the adapter', () => {
    process.env.DROPBOX_SIGN_REQUESTER_NAME = 'ClearCaseIQ Legal'

    expect(requesterIdentity().name).toBe('ClearCaseIQ Legal')
  })

  it('lets an operator blank the mailbox if Dropbox Sign has not accepted it yet', () => {
    process.env.DROPBOX_SIGN_REQUESTER_EMAIL = '   '

    expect(requesterIdentity().email).toBeNull()
  })

  it('puts the platform name and mailbox on the Dropbox Sign send', async () => {
    const originalKey = process.env.DROPBOX_SIGN_API_KEY
    process.env.DROPBOX_SIGN_API_KEY = 'test-key'
    delete process.env.DROPBOX_SIGN_REQUESTER_NAME
    delete process.env.DROPBOX_SIGN_REQUESTER_EMAIL

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signature_request: { signature_request_id: 'sr-1' } }),
    })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as any

    try {
      await dropboxSignProvider.createEnvelope({
        documentType: 'retainer',
        title: 'Retainer agreement — Plain17',
        signerName: 'Plain17',
        signerEmail: 'plain17@yopmail.com',
        filePath: '/tmp/retainer.pdf',
      })
    } finally {
      globalThis.fetch = originalFetch
      if (originalKey === undefined) delete process.env.DROPBOX_SIGN_API_KEY
      else process.env.DROPBOX_SIGN_API_KEY = originalKey
    }

    const form = fetchMock.mock.calls[0][1].body as FormData
    expect(form.get('custom_requester_name')).toBe('ClearCaseIQ')
    expect(form.get('custom_requester_email_address')).toBe(DEFAULT_REQUESTER_EMAIL)
  })

  it('retries with the name only when Dropbox Sign has not accepted the mailbox', async () => {
    const originalKey = process.env.DROPBOX_SIGN_API_KEY
    process.env.DROPBOX_SIGN_API_KEY = 'test-key'
    delete process.env.DROPBOX_SIGN_REQUESTER_EMAIL

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error":{"error_msg":"Unknown requester email: not a member of the team"}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signature_request: { signature_request_id: 'sr-2' } }),
      })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as any

    try {
      const result = await dropboxSignProvider.createEnvelope({
        documentType: 'retainer',
        title: 'Retainer agreement — Plain17',
        signerName: 'Plain17',
        signerEmail: 'plain17@yopmail.com',
        filePath: '/tmp/retainer.pdf',
      })
      expect(result.externalEnvelopeId).toBe('sr-2')
    } finally {
      globalThis.fetch = originalFetch
      if (originalKey === undefined) delete process.env.DROPBOX_SIGN_API_KEY
      else process.env.DROPBOX_SIGN_API_KEY = originalKey
    }

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = fetchMock.mock.calls[0][1].body as FormData
    const second = fetchMock.mock.calls[1][1].body as FormData
    expect(first.get('custom_requester_email_address')).toBe(DEFAULT_REQUESTER_EMAIL)
    expect(second.has('custom_requester_email_address')).toBe(false)
    expect(second.get('custom_requester_name')).toBe('ClearCaseIQ')
  })
})
