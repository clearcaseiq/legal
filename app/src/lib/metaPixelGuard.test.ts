import { describe, expect, it, vi } from 'vitest'
import { applyMetaBoundary, metaGuardSnippet } from './metaPixelGuard'
import { applyAnalyticsBoundary } from './analyticsBoundary'

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
  it('keeps Meta’s script off a sensitive landing route even though the tag fires', () => {
    const page = fakePage()
    page.run(metaGuardSnippet(true, PIXEL))
    page.run(GTM_TAG)
    expect(page.injected).toEqual([])
    expect(page.window.__cciqMetaBlocked).toBe(true)
  })

  it('loads the pixel on a public route with automatic events and history PageViews off before init', () => {
    const page = fakePage()
    page.run(metaGuardSnippet(false, PIXEL))
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

  it('adds nothing on a public route when no pixel is configured', () => {
    expect(metaGuardSnippet(false, null)).toBe('')
  })
})

describe('applyMetaBoundary', () => {
  it('revokes consent on entering a sensitive route and never re-grants', () => {
    const fbq = vi.fn()
    const scope: Record<string, unknown> = { fbq }
    applyAnalyticsBoundary('/how-it-works', undefined, scope)
    expect(fbq).not.toHaveBeenCalled()
    applyAnalyticsBoundary('/assess', undefined, scope)
    applyAnalyticsBoundary('/how-it-works', undefined, scope)
    applyAnalyticsBoundary('/dashboard', undefined, scope)
    expect(fbq.mock.calls).toEqual([['consent', 'revoke']])
  })

  it('leaves the inert stub alone', () => {
    const fbq = vi.fn()
    applyMetaBoundary(true, { fbq, __cciqMetaBlocked: true })
    expect(fbq).not.toHaveBeenCalled()
  })
})
