import { describe, expect, it } from 'vitest'

import {
  caseReportEvidencePath,
  claimantPortalPath,
  safeInternalReturnTo,
  supportingDocumentsPath,
  unauthenticatedEvidenceUploadDestination,
} from './evidenceUploadNav'

/**
 * An attorney's document request reaches the claimant by email, in-app message
 * and text, and every one of those carries an `/evidence-upload/:id?token=`
 * link. That route used to send anyone without a session to sign in — in front
 * of people who overwhelmingly have no account, since an imported case's
 * claimant has never registered. The token is the portal's own `secureToken`,
 * so there was never a reason to ask.
 */
describe('opening a document-request link with no session', () => {
  it('goes to the portal the token already opens', () => {
    expect(unauthenticatedEvidenceUploadDestination('tok-1')).toBe('/respond/documents/tok-1')
  })

  it('returns null when the link has no portal token', () => {
    expect(unauthenticatedEvidenceUploadDestination(null)).toBeNull()
    expect(unauthenticatedEvidenceUploadDestination('')).toBeNull()
    expect(unauthenticatedEvidenceUploadDestination('   ')).toBeNull()
  })

  it('escapes the token rather than pasting it into a path', () => {
    expect(claimantPortalPath('a/b?c')).toBe('/respond/documents/a%2Fb%3Fc')
  })
})

describe('Case Snapshot upload with no session', () => {
  it('opens Supporting Documents, the same screen as Add records', () => {
    expect(caseReportEvidencePath('asm-1')).toBe('/intake2?assessment=asm-1&step=evidence')
    expect(supportingDocumentsPath('asm-1', { from: 'results', returnTo: '/results/asm-1' })).toBe(
      '/intake2?assessment=asm-1&step=evidence&from=results&returnTo=%2Fresults%2Fasm-1',
    )
  })

  it('still opens Supporting Documents when the id is missing', () => {
    expect(caseReportEvidencePath(null)).toBe('/intake2?step=evidence')
    expect(caseReportEvidencePath('undefined')).toBe('/intake2?step=evidence')
  })
})

describe('returning somewhere after an upload', () => {
  it('refuses a destination that leaves the site', () => {
    expect(safeInternalReturnTo('https://evil.test/steal', '/dashboard')).toBe('/dashboard')
    expect(safeInternalReturnTo('//evil.test', '/dashboard')).toBe('/dashboard')
    expect(safeInternalReturnTo('/dashboard?tab=tasks', '')).toBe('/dashboard?tab=tasks')
  })
})
