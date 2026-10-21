import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import { resolveOnboardingDocuments, type OnboardingSignals } from './intake-acquire'

const none: OnboardingSignals = {
  envelopes: [],
  fileLabels: [],
  listedDocuments: [],
  doneTaskTitles: [],
  hasNegotiationHistory: false,
  hipaaConsentOnFile: false,
}

describe('resolveOnboardingDocuments', () => {
  it('reports both documents missing on a bare imported case', () => {
    const docs = resolveOnboardingDocuments(none)
    expect(docs.retainer.state).toBe('missing')
    expect(docs.hipaa.state).toBe('missing')
  })

  it('treats a signed envelope as signed and an open one as sent', () => {
    const docs = resolveOnboardingDocuments({
      ...none,
      envelopes: [
        { documentType: 'retainer', title: 'Retainer agreement', status: 'signed' },
        { documentType: 'hipaa_authorization', title: 'HIPAA', status: 'viewed' },
      ],
    })
    expect(docs.retainer.state).toBe('signed')
    expect(docs.hipaa.state).toBe('sent')
  })

  it('ignores voided and declined envelopes', () => {
    const docs = resolveOnboardingDocuments({
      ...none,
      envelopes: [
        { documentType: 'retainer', title: 'Retainer', status: 'voided' },
        { documentType: 'hipaa_authorization', title: 'HIPAA', status: 'declined' },
      ],
    })
    expect(docs.retainer.state).toBe('missing')
    expect(docs.hipaa.state).toBe('missing')
  })

  it('matches a firm-template envelope by title', () => {
    const docs = resolveOnboardingDocuments({
      ...none,
      envelopes: [{ documentType: 'other', title: 'Contingency Fee Agreement', status: 'sent' }],
    })
    expect(docs.retainer.state).toBe('sent')
  })

  it('finds documents uploaded to the case or listed in the CMS export', () => {
    const docs = resolveOnboardingDocuments({
      ...none,
      fileLabels: ['Signed_Fee_Agreement.pdf · other'],
      listedDocuments: ['Medical Records Authorization (authorization), 2026-01-04'],
    })
    expect(docs.retainer.state).toBe('on_file')
    expect(docs.hipaa.state).toBe('on_file')
  })

  it('counts a done "send" task as sent but a done "signed" task as on file', () => {
    const sent = resolveOnboardingDocuments({ ...none, doneTaskTitles: ['Send retainer to client'] })
    expect(sent.retainer.state).toBe('sent')
    const signed = resolveOnboardingDocuments({ ...none, doneTaskTitles: ['Confirm signed retainer agreement'] })
    expect(signed.retainer.state).toBe('on_file')
  })

  it('does not send onboarding documents on a case already in negotiation', () => {
    const docs = resolveOnboardingDocuments({ ...none, hasNegotiationHistory: true })
    expect(docs.retainer.state).toBe('on_file')
    expect(docs.hipaa.state).toBe('on_file')
  })

  it('accepts platform HIPAA consent', () => {
    expect(resolveOnboardingDocuments({ ...none, hipaaConsentOnFile: true }).hipaa.state).toBe('signed')
  })
})
