import { describe, expect, it } from 'vitest'
import { CASE_ASSIGNMENTS, NEXT_STEPS } from './caseTypeAssignments'
import { caseTypeHubBySlug, caseTypeHubs } from './caseTypeHubDefs'
import { allLandingPages, landingPagesBySlug, nextStepsFor } from './seoLandingPages'

const english = allLandingPages.filter((page) => !page.locale)

/** A URL naming one of the six case types is a page one of the hubs should own. */
const CASE_TYPE_KEYWORDS = /car-accident|slip-and-fall|dog-bite|pedestrian|malpractice|wrongful-death|birth-injury/

describe('case-type assignments', () => {
  it('assigns every page whose URL names a case type', () => {
    const missing = english
      .filter((page) => CASE_TYPE_KEYWORDS.test(page.slug))
      .filter((page) => !page.caseType || !page.caseSection)
      .map((page) => page.slug)
    expect(missing).toEqual([])
  })

  it('assigns every injury and treatment page, which are read as car accident pages', () => {
    const missing = english
      .filter((page) => page.category === 'Symptoms' || page.category === 'Treatment')
      .filter((page) => !page.caseType)
      .map((page) => page.slug)
    expect(missing).toEqual([])
  })

  it('never assigns a case type without a section, or the reverse', () => {
    const halfAssigned = allLandingPages
      .filter((page) => Boolean(page.caseType) !== Boolean(page.caseSection))
      .map((page) => page.slug)
    expect(halfAssigned).toEqual([])
  })

  it('leaves translated pages out of the English hubs', () => {
    const translated = allLandingPages.filter((page) => page.locale && page.caseType)
    expect(translated.map((page) => page.slug)).toEqual([])
  })

  it('files city pages under Near you', () => {
    const cityPages = english.filter((page) => page.category === 'Cities' && page.caseType)
    expect(cityPages.length).toBeGreaterThan(70)
    expect(cityPages.filter((page) => page.caseSection !== 'local').map((page) => page.slug)).toEqual([])
    expect(landingPagesBySlug.get('/los-angeles-dog-bite')?.caseType).toBe('dog_bite')
  })

  it('does not mistake a non-city page ending in a city suffix for a city page', () => {
    const ptsd = landingPagesBySlug.get('/injuries/ptsd-after-car-accident')
    expect(ptsd?.caseSection).toBe('injuries')
  })

  it('names only pages that exist', () => {
    const stale = [...Object.keys(CASE_ASSIGNMENTS), ...Object.keys(NEXT_STEPS)].filter(
      (slug) => !landingPagesBySlug.has(slug)
    )
    expect(stale).toEqual([])
  })

  it('gives every case type its value page, assigned to the value section', () => {
    for (const hub of caseTypeHubs) {
      const value = landingPagesBySlug.get(hub.valueSlug)
      expect(value?.caseType, hub.valueSlug).toBe(hub.caseType)
      expect(value?.caseSection, hub.valueSlug).toBe('value')
    }
  })
})

describe('next-step links', () => {
  const withSteps = allLandingPages.filter((page) => nextStepsFor(page).length > 0)

  it('has authored links to check', () => {
    expect(withSteps.length).toBeGreaterThan(40)
  })

  it('carries no more than three on any page', () => {
    expect(withSteps.filter((page) => nextStepsFor(page).length > 3).map((page) => page.slug)).toEqual([])
  })

  it('points at a real page, never the page itself', () => {
    const broken = withSteps.flatMap((page) =>
      nextStepsFor(page)
        .filter((step) => step.to === page.slug || (!landingPagesBySlug.has(step.to) && !caseTypeHubBySlug.has(step.to)))
        .map((step) => `${page.slug} -> ${step.to}`)
    )
    expect(broken).toEqual([])
  })

  it('uses descriptive anchors rather than generic ones', () => {
    const generic = /^(click here|here|read more|learn more|this page|this article)$/i
    const offenders = withSteps.flatMap((page) =>
      nextStepsFor(page)
        .filter((step) => generic.test(step.anchor.trim()) || step.anchor.split(/\s+/).length < 3)
        .map((step) => `${page.slug}: ${step.anchor}`)
    )
    expect(offenders).toEqual([])
  })
})
