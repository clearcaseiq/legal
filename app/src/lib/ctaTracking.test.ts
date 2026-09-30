import { describe, expect, it } from 'vitest'
import { trackCtaClick } from './ctaTracking'

describe('trackCtaClick', () => {
  it('pushes the CTA location to the data layer', () => {
    const scope = { dataLayer: [] as unknown[] }
    trackCtaClick('hero', {}, scope)
    expect(scope.dataLayer).toEqual([{ event: 'cta_click', cta_location: 'hero' }])
  })

  it('includes the case type for chips', () => {
    const scope = { dataLayer: [] as unknown[] }
    trackCtaClick('case_type_chip', { caseType: 'car' }, scope)
    expect(scope.dataLayer).toEqual([{ event: 'cta_click', cta_location: 'case_type_chip', cta_case_type: 'car' }])
  })

  it('includes the page the button is on for hubs and articles', () => {
    const scope = { dataLayer: [] as unknown[] }
    trackCtaClick('hub_header', { caseType: 'car', page: '/car-accident' }, scope)
    expect(scope.dataLayer).toEqual([
      { event: 'cta_click', cta_location: 'hub_header', cta_case_type: 'car', cta_page: '/car-accident' },
    ])
  })

  it('does nothing when no container has loaded', () => {
    const scope: Record<string, unknown> = {}
    expect(() => trackCtaClick('hero', {}, scope)).not.toThrow()
    expect(scope.dataLayer).toBeUndefined()
  })
})
