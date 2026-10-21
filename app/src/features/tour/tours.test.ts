import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import enApp from '../../i18n/locales/en-app.json'
import es from '../../i18n/locales/es.json'
import zh from '../../i18n/locales/zh.json'
import {
  TOURS,
  TOURS_BY_SCOPE,
  chromeKey,
  copyKey,
  resolveRoute,
  samePage,
  stepsFor,
  withKeptQuery,
  type TourAudience,
  type TourId,
} from './tours'

const attorney: TourAudience = { isStaff: false, isFirmAdmin: false, staffActions: {}, staffPermissions: [] }
const admin: TourAudience = { ...attorney, isFirmAdmin: true }
const staff: TourAudience = { isStaff: true, isFirmAdmin: false, staffActions: {}, staffPermissions: [] }

function lookup(key: string, messages: unknown = key.startsWith('clientTour.') ? enApp : en): unknown {
  return key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), messages)
}

const ALL_TOURS = Object.keys(TOURS) as TourId[]
const CHROME = ['progress', 'next', 'back', 'done', 'offer.title', 'offer.body', 'offer.start', 'offer.later', 'offer.never']

describe('tour definitions', () => {
  it('every step has a target, a resolvable route and English copy', () => {
    for (const tourId of ALL_TOURS) {
      const tour = TOURS[tourId]
      expect(lookup(chromeKey(tourId, `${tourId}.name`))).toBeTypeOf('string')
      expect(lookup(chromeKey(tourId, `${tourId}.summary`))).toBeTypeOf('string')
      for (const key of CHROME) expect(lookup(chromeKey(tourId, key)), chromeKey(tourId, key)).toBeTypeOf('string')
      const ids = new Set<string>()
      for (const step of tour.steps) {
        expect(ids.has(step.id), `${tourId}.${step.id} duplicated`).toBe(false)
        ids.add(step.id)
        expect(step.target).toMatch(/^[a-z-]+$/)
        expect(resolveRoute(step, 'lead-1')).toMatch(/^\//)
        expect(lookup(copyKey(tourId, step.id, 'title')), copyKey(tourId, step.id, 'title')).toBeTypeOf('string')
        expect(lookup(copyKey(tourId, step.id, 'body')), copyKey(tourId, step.id, 'body')).toBeTypeOf('string')
      }
    }
  })

  it('every tour is listed in exactly the scope it runs in', () => {
    for (const tourId of ALL_TOURS) {
      const scopes = (Object.keys(TOURS_BY_SCOPE) as Array<keyof typeof TOURS_BY_SCOPE>).filter((s) =>
        TOURS_BY_SCOPE[s].includes(tourId),
      )
      expect(scopes).toEqual([TOURS[tourId].scope])
    }
  })

  it('translates the client tour into every portal language', () => {
    const tour = TOURS.client_portal
    const keys = [
      ...CHROME.map((k) => chromeKey('client_portal', k)),
      'clientTour.take',
      'clientTour.replay',
      'clientTour.client_portal.name',
      'clientTour.client_portal.summary',
      ...tour.steps.flatMap((s) => [copyKey('client_portal', s.id, 'title'), copyKey('client_portal', s.id, 'body')]),
    ]
    for (const messages of [enApp, es, zh]) {
      for (const key of keys) expect(lookup(key, messages), key).toBeTypeOf('string')
    }
  })

  it('case steps need a case to build their route', () => {
    const step = TOURS.case_lifecycle.steps[0]
    expect(resolveRoute(step, null)).toBeNull()
    expect(resolveRoute(step, 'abc')).toBe('/attorney-dashboard/cases/abc/overview')
  })
})

describe('stepsFor', () => {
  const ids = (audience: TourAudience) => stepsFor(TOURS.workspace, audience).map((s) => s.id)

  it('shows Firm Settings only to firm admins', () => {
    expect(ids(admin)).toContain('firmSettings')
    expect(ids(attorney)).not.toContain('firmSettings')
    expect(ids({ ...staff, isFirmAdmin: true })).not.toContain('firmSettings')
  })

  it('drops attorney-only pages for staff and gates the rest on their permissions', () => {
    const bare = ids(staff)
    for (const id of ['notifications', 'intake', 'tasks', 'documents', 'billing', 'matches', 'activeCases', 'messages', 'calendar']) {
      expect(bare).not.toContain(id)
    }
    expect(bare).toEqual(['welcome', 'help'])

    const permitted = ids({
      ...staff,
      staffActions: { message: true, schedule: true },
      staffPermissions: ['review_cases', 'manage_assigned_cases'],
    })
    expect(permitted).toEqual(['welcome', 'matches', 'activeCases', 'messages', 'calendar', 'help'])
  })

  it('gives attorneys every non-admin step', () => {
    expect(ids(attorney)).toEqual(TOURS.workspace.steps.filter((s) => s.only !== 'firm_admin').map((s) => s.id))
  })

  it('hides case billing from staff', () => {
    expect(stepsFor(TOURS.case_lifecycle, staff).map((s) => s.id)).not.toContain('billing')
  })
})

describe('samePage', () => {
  it('treats lead and cases paths as the same case page', () => {
    expect(samePage('/attorney-dashboard/lead/abc/tasks/', '', '/attorney-dashboard/cases/abc/tasks')).toBe(true)
  })

  it('requires the route query to match so hub tabs actually open', () => {
    const route = '/attorney-dashboard/cases/calendar?tab=booking'
    expect(samePage('/attorney-dashboard/cases/calendar', '', route)).toBe(false)
    expect(samePage('/attorney-dashboard/cases/calendar', '?tab=booking&x=1', route)).toBe(true)
    expect(samePage('/attorney-dashboard/cases/calendar', '?tab=booking', '/attorney-dashboard/cases/calendar')).toBe(true)
  })
})

describe('withKeptQuery', () => {
  it("keeps the claimant's selected case when a step switches tabs", () => {
    expect(withKeptQuery('/dashboard?tab=tasks', '?tab=documents&case=a1', ['case'])).toBe('/dashboard?tab=tasks&case=a1')
  })

  it('leaves routes alone when there is nothing to keep', () => {
    expect(withKeptQuery('/messaging', '?tab=tasks', ['case'])).toBe('/messaging')
    expect(withKeptQuery('/dashboard?tab=tasks', '?case=a1', undefined)).toBe('/dashboard?tab=tasks')
  })
})
