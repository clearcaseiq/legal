import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import { TOURS, TOUR_ORDER, copyKey, resolveRoute, stepsFor, type TourAudience } from './tours'

const attorney: TourAudience = { isStaff: false, isFirmAdmin: false, staffActions: {}, staffPermissions: [] }
const admin: TourAudience = { ...attorney, isFirmAdmin: true }
const staff: TourAudience = { isStaff: true, isFirmAdmin: false, staffActions: {}, staffPermissions: [] }

function lookup(key: string): unknown {
  return key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), en)
}

describe('tour definitions', () => {
  it('every step has a target, a resolvable route and English copy', () => {
    for (const tourId of TOUR_ORDER) {
      const tour = TOURS[tourId]
      expect(lookup(`attorneyTour.${tourId}.name`)).toBeTypeOf('string')
      expect(lookup(`attorneyTour.${tourId}.summary`)).toBeTypeOf('string')
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
