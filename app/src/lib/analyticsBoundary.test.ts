import { describe, expect, it } from 'vitest'
import { applyAnalyticsBoundary, isSensitivePath } from './analyticsBoundary'

/**
 * The tag must not run on screens carrying health information.
 *
 * The server keeps it off the page a visitor lands on, but the app is a SPA:
 * arriving on a city page and clicking into the assessment leaves the tag
 * loaded. These pin the client-side half of that boundary, since a route going
 * missing from the list is silent - analytics keeps working, which is exactly
 * what it looks like when it is working correctly.
 */
describe('analytics boundary', () => {
  const sensitive = [
    '/assess',
    '/assess?fresh=1',
    '/assessments',
    '/edit-assessment/abc-123',
    '/intake',
    '/dashboard',
    '/results/xyz',
    '/case-tracker',
    '/evidence-upload',
    '/documents',
    '/messaging',
    '/hipaa-authorization',
    '/claim/token-123',
    '/attorney-dashboard/leads/1',
    '/admin/users',
    '/firm-dashboard',
    '/payment/checkout',
    '/profile',
  ]

  it.each(sensitive)('keeps analytics off %s', (path) => {
    expect(isSensitivePath(path)).toBe(true)
  })

  const publicPaths = [
    '/',
    '/how-it-works',
    '/about',
    '/press',
    '/contact',
    '/help',
    '/blog',
    '/attorneys',
    '/for-attorneys',
    '/privacy-policy',
    '/settlements/car-accident-settlement-amounts',
    '/injuries/whiplash-symptoms',
    '/tools/california-sol-checker',
  ]

  it.each(publicPaths)('leaves analytics on %s', (path) => {
    expect(isSensitivePath(path)).toBe(false)
  })

  it('covers the Spanish and Chinese copies of a private screen', () => {
    expect(isSensitivePath('/es/assess')).toBe(true)
    expect(isSensitivePath('/zh/dashboard')).toBe(true)
    // The locale root itself is the marketing home page in that language.
    expect(isSensitivePath('/es')).toBe(false)
  })

  it('does not catch a public path that merely starts with a private one', () => {
    // `/book` is private; a marketing page whose name begins with it is not.
    expect(isSensitivePath('/bookstore')).toBe(false)
    expect(isSensitivePath('/assessment-guide')).toBe(false)
  })

  it('sets the kill switch GA actually reads', () => {
    const scope: Record<string, unknown> = {}
    applyAnalyticsBoundary('/assess', 'G-TEST123', scope)
    expect(scope['ga-disable-G-TEST123']).toBe(true)
  })

  it('turns analytics back on when the visitor returns to a public page', () => {
    const scope: Record<string, unknown> = {}
    applyAnalyticsBoundary('/assess', 'G-TEST123', scope)
    applyAnalyticsBoundary('/how-it-works', 'G-TEST123', scope)
    expect(scope['ga-disable-G-TEST123']).toBe(false)
  })

  it('does nothing when no measurement id is configured', () => {
    const scope: Record<string, unknown> = {}
    applyAnalyticsBoundary('/assess', undefined, scope)
    expect(Object.keys(scope)).toHaveLength(0)
  })
})
