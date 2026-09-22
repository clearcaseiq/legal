import { describe, expect, it } from 'vitest'
import { pushScreenView, screenPath } from './screenView'

/**
 * The container is loaded on claimant screens now, which makes the redaction
 * below the thing standing between a claim token and Google. A miss here is
 * silent in exactly the wrong direction: tracking keeps working, and the token
 * rides along in the screen name.
 */
describe('screenPath', () => {
  it('drops the query string, where tokens live', () => {
    expect(screenPath('/evidence-upload/a1?token=secret-value')).toBe('/evidence-upload/:id')
  })

  it('drops the fragment too', () => {
    expect(screenPath('/how-it-works#pricing')).toBe('/how-it-works')
  })

  it('redacts the segment after a token-bearing route whatever it looks like', () => {
    // A claim token need not look generated, so position decides these.
    expect(screenPath('/claim/spring')).toBe('/claim/:id')
    expect(screenPath('/respond/abc')).toBe('/respond/:id')
  })

  it.each([
    ['/results/42', '/results/:id'],
    ['/assessment/cmuc3u4cg003jh6e7y0ax7gn4', '/assessment/:id'],
    ['/edit-assessment/9f3c1b2a-4d5e-6f70-8192-a3b4c5d6e7f8', '/edit-assessment/:id'],
    ['/documents/a1b2c3d4e5f60718', '/documents/:id'],
  ])('redacts the generated id in %s', (url, expected) => {
    expect(screenPath(url)).toBe(expected)
  })

  /**
   * The funnel is the reason this exists, and intake steps are the funnel. A
   * redaction rule broad enough to swallow `step-2` would leave the report
   * saying only that claimants visited intake.
   */
  it.each(['/intake/step-2', '/intake/injury-details', '/assess/review'])(
    'keeps the step name in %s',
    (url) => {
      expect(screenPath(url)).toBe(url)
    },
  )

  it('leaves marketing paths alone so they stay readable in reports', () => {
    expect(screenPath('/settlements/car-accident-settlement-amounts')).toBe(
      '/settlements/car-accident-settlement-amounts',
    )
  })

  it('keeps the locale prefix, which names a language not a record', () => {
    expect(screenPath('/es/assess')).toBe('/es/assess')
    expect(screenPath('/zh/claim/abc')).toBe('/zh/claim/:id')
  })

  it('normalises the root and empty input', () => {
    expect(screenPath('/')).toBe('/')
    expect(screenPath('')).toBe('/')
  })
})

describe('pushScreenView', () => {
  it('announces the redacted screen', () => {
    const dataLayer: unknown[] = []
    pushScreenView('/claim/abc123?token=t', { dataLayer })
    expect(dataLayer).toEqual([{ event: 'screen_view', screen_path: '/claim/:id' }])
  })

  /**
   * The array is created by the GTM snippet, so its absence means no container
   * is listening — the normal state on a host with the tag switched off.
   */
  it('stays quiet when no container has loaded', () => {
    const scope: Record<string, unknown> = {}
    expect(() => pushScreenView('/assess', scope)).not.toThrow()
    expect(scope.dataLayer).toBeUndefined()
  })
})
