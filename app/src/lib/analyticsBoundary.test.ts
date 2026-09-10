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

  /**
   * The GTM half. `ga-disable` is gtag's own switch and the vendor tags a
   * container loads do not read it, so a dataLayer variable is the only lever
   * the app has over them.
   */
  it('tells the GTM container when the route is off limits', () => {
    const dataLayer: unknown[] = []
    const scope: Record<string, unknown> = { dataLayer }
    applyAnalyticsBoundary('/assess', undefined, scope)
    expect(dataLayer[dataLayer.length - 1]).toEqual({
      event: 'analytics_boundary',
      analytics_blocked: true,
    })
  })

  it('lifts the GTM block on the way back out to a public page', () => {
    const dataLayer: unknown[] = []
    const scope: Record<string, unknown> = { dataLayer }
    applyAnalyticsBoundary('/assess', undefined, scope)
    applyAnalyticsBoundary('/how-it-works', undefined, scope)
    expect(dataLayer[dataLayer.length - 1]).toEqual({
      event: 'analytics_boundary',
      analytics_blocked: false,
    })
  })

  it('signals both tags when both are installed', () => {
    const dataLayer: unknown[] = []
    const scope: Record<string, unknown> = { dataLayer }
    applyAnalyticsBoundary('/dashboard', 'G-TEST123', scope)
    expect(scope['ga-disable-G-TEST123']).toBe(true)
    expect(dataLayer).toHaveLength(1)
  })

  it('stays quiet when no container has created a dataLayer', () => {
    const scope: Record<string, unknown> = {}
    applyAnalyticsBoundary('/assess', 'G-TEST123', scope)
    expect(scope.dataLayer).toBeUndefined()
  })
})
