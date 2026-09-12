import { describe, expect, it } from 'vitest'

import {
  claimantPortalPath,
  safeInternalReturnTo,
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

  it('asks for a sign-in only when there is no token to go on', () => {
    expect(unauthenticatedEvidenceUploadDestination(null)).toBeNull()
    expect(unauthenticatedEvidenceUploadDestination('')).toBeNull()
    expect(unauthenticatedEvidenceUploadDestination('   ')).toBeNull()
  })

  it('escapes the token rather than pasting it into a path', () => {
    expect(claimantPortalPath('a/b?c')).toBe('/respond/documents/a%2Fb%3Fc')
  })
})

describe('returning somewhere after an upload', () => {
  it('refuses a destination that leaves the site', () => {
    expect(safeInternalReturnTo('https://evil.test/steal', '/dashboard')).toBe('/dashboard')
    expect(safeInternalReturnTo('//evil.test', '/dashboard')).toBe('/dashboard')
    expect(safeInternalReturnTo('/dashboard?tab=tasks', '')).toBe('/dashboard?tab=tasks')
  })
})
