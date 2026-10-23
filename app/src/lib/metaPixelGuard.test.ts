import { describe, expect, it, vi } from 'vitest'
import { applyLandingOnlyTracking, metaGuardSnippet } from './metaPixelGuard'
import { applyAnalyticsBoundary } from './analyticsBoundary'
import { gtmHeadSnippet } from './tagManager'

const PIXEL = '1594082249036343'

/** The GTM Custom HTML tag, as published in the container. */
const GTM_TAG =
  '!function(b,e,f,g,a,c,d){b.fbq||(a=b.fbq=function(){a.callMethod?a.callMethod.apply(a,arguments):a.queue.push(arguments)},' +
  'b._fbq||(b._fbq=a),a.push=a,a.loaded=!0,a.version="2.0",a.queue=[],c=e.createElement(f),c.async=!0,c.src=g,' +
  'd=e.getElementsByTagName(f)[0],d.parentNode.insertBefore(c,d))}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");' +
  `fbq("init","${PIXEL}");fbq("track","PageView");`

function fakePage() {
  const injected: string[] = []
  const anchor = { parentNode: { insertBefore: (el: { src: string }) => injected.push(el.src) } }
  const window: Record<string, any> = {}
  const document = {
    createElement: () => ({}) as { src: string },
    getElementsByTagName: () => [anchor],
  }
  const run = (code: string) => new Function('window', 'document', `with (window) { ${code} }`)(window, document)
  return { window, injected, run }
}

describe('metaGuardSnippet', () => {
  it('keeps Meta’s script off a page that is not allowed, even though the tag fires', () => {
    const page = fakePage()
    page.run(metaGuardSnippet(false, PIXEL))
    page.run(GTM_TAG)
    expect(page.injected).toEqual([])
    expect(page.window.__cciqMetaBlocked).toBe(true)
  })

  it('loads the pixel on an allowed page with automatic events and history PageViews off before init', () => {
    const page = fakePage()
    page.run(metaGuardSnippet(true, PIXEL))
    page.run(GTM_TAG)
    expect(page.injected).toEqual(['https://connect.facebook.net/en_US/fbevents.js'])
    expect(page.window.fbq.disablePushState).toBe(true)
    const calls = page.window.fbq.queue.map((args: IArguments) => Array.from(args))
    expect(calls).toEqual([
      ['set', 'autoConfig', false, PIXEL],
      ['init', PIXEL],
      ['track', 'PageView'],
    ])
  })

  it('blocks rather than leaving the tag unguarded when no pixel id is configured', () => {
    const page = fakePage()
    page.run(metaGuardSnippet(true, null))
    page.run(GTM_TAG)
    expect(page.injected).toEqual([])
  })
})

describe('gtmHeadSnippet', () => {
  it('fails closed: Meta is blocked unless the page is explicitly allowed', () => {
    expect(gtmHeadSnippet('GTM-X', false)).toContain('__cciqMetaBlocked')
    expect(gtmHeadSnippet('GTM-X', true, true)).toContain('__cciqMetaBlocked')
    expect(gtmHeadSnippet('GTM-X', false, true)).toContain('fbevents.js')
  })

  it('installs the guard before the container loads', () => {
    const snippet = gtmHeadSnippet('GTM-X', false, true)
    expect(snippet.indexOf('fbq')).toBeLessThan(snippet.indexOf('gtm.js'))
  })
})

describe('applyLandingOnlyTracking', () => {
  it('revokes Meta consent on the first move away from the landing page, wherever it goes, and never re-grants', () => {
    const fbq = vi.fn()
    const scope: Record<string, unknown> = { fbq, dataLayer: [] }
    applyAnalyticsBoundary('/car-accident-lawyer', undefined, scope)
    applyAnalyticsBoundary('/car-accident-lawyer', undefined, scope)
    expect(fbq).not.toHaveBeenCalled()
    applyAnalyticsBoundary('/some-unclassified-route', undefined, scope)
    applyAnalyticsBoundary('/assess', undefined, scope)
    applyAnalyticsBoundary('/car-accident-lawyer', undefined, scope)
    expect(fbq.mock.calls).toEqual([['consent', 'revoke']])
  })

  it('stops Clarity once the visitor leaves the landing page, even if Clarity loads late', () => {
    const scope: Record<string, unknown> = { dataLayer: [] }
    applyLandingOnlyTracking('/', scope)
    applyLandingOnlyTracking('/assess', scope)
    const clarity = vi.fn()
    scope.clarity = clarity
    applyLandingOnlyTracking('/assess/step-2', scope)
    applyLandingOnlyTracking('/assess/step-3', scope)
    expect(clarity.mock.calls).toEqual([['stop']])
  })

  it('keeps stopping a late Clarity even after returning to the landing path', () => {
    const scope: Record<string, unknown> = { dataLayer: [] }
    applyLandingOnlyTracking('/', scope)
    applyLandingOnlyTracking('/assess', scope)
    const clarity = vi.fn()
    scope.clarity = clarity
    applyLandingOnlyTracking('/', scope)
    expect(clarity.mock.calls).toEqual([['stop']])
  })

  it('stops Clarity when the router changes the URL, before the new screen renders', () => {
    const pushed: unknown[] = []
    const history = { pushState: (...a: unknown[]) => pushed.push(a), replaceState: () => undefined }
    const clarity = vi.fn()
    const scope: Record<string, unknown> = {
      dataLayer: [],
      clarity,
      history,
      location: { href: 'https://www.clearcaseiq.com/', assign: vi.fn(), replace: vi.fn() },
    }
    applyLandingOnlyTracking('/', scope)
    ;(history as unknown as History).pushState({}, '', '/?utm=x')
    expect(clarity).not.toHaveBeenCalled()
    ;(history as unknown as History).pushState({}, '', '/assess')
    expect(clarity.mock.calls).toEqual([['stop']])
    expect(pushed).toHaveLength(1)
  })

  it('leaves the landing page by loading a new document, with the URL unchanged until it arrives', () => {
    const pushed: unknown[] = []
    const replaced: unknown[] = []
    const history = {
      pushState: (...a: unknown[]) => pushed.push(a),
      replaceState: (...a: unknown[]) => replaced.push(a),
    }
    const location = { href: 'https://www.clearcaseiq.com/', assign: vi.fn(), replace: vi.fn() }
    const scope: Record<string, unknown> = { dataLayer: [], history, location }
    applyLandingOnlyTracking('/', scope)

    ;(history as unknown as History).pushState({}, '', '/assess')
    expect(location.assign.mock.calls).toEqual([['https://www.clearcaseiq.com/assess']])
    ;(history as unknown as History).replaceState({}, '', '/assess?step=injury_type')
    ;(history as unknown as History).pushState({}, '', '/dashboard')
    expect(pushed).toEqual([])
    expect(replaced).toEqual([])
    expect(location.assign).toHaveBeenCalledTimes(1)
    expect(location.replace).not.toHaveBeenCalled()
  })

  it('uses a replace navigation when the router redirects off the landing page', () => {
    const originalReplace = vi.fn()
    const history = { pushState: vi.fn(), replaceState: originalReplace }
    const location = { href: 'https://www.clearcaseiq.com/assessment/start', assign: vi.fn(), replace: vi.fn() }
    const scope: Record<string, unknown> = { dataLayer: [], history, location }
    applyLandingOnlyTracking('/assessment/start', scope)
    ;(history as unknown as History).replaceState({}, '', '/assess?fresh=1')
    expect(location.replace.mock.calls).toEqual([['https://www.clearcaseiq.com/assess?fresh=1']])
    expect(originalReplace).not.toHaveBeenCalled()
  })

  it('switches off every GA4 property the container loaded once the visitor leaves the landing page', () => {
    const scope: Record<string, unknown> = {
      dataLayer: [],
      google_tag_manager: { 'GTM-PBTSJLC5': {}, 'G-8F3T9DFK8Q': {}, 'AW-18422074186': {}, dataLayer: {} },
    }
    applyLandingOnlyTracking('/', scope)
    expect(scope['ga-disable-G-8F3T9DFK8Q']).toBeUndefined()
    applyLandingOnlyTracking('/assess', scope)
    expect(scope['ga-disable-G-8F3T9DFK8Q']).toBe(true)
    expect(Object.keys(scope).filter((key) => key.startsWith('ga-disable-'))).toEqual(['ga-disable-G-8F3T9DFK8Q'])
  })

  it('leaves the inert Meta stub alone', () => {
    const fbq = vi.fn()
    const scope = { fbq, __cciqMetaBlocked: true }
    applyLandingOnlyTracking('/a', scope)
    applyLandingOnlyTracking('/b', scope)
    expect(fbq).not.toHaveBeenCalled()
  })
})
