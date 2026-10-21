/**
 * Guided tours of the attorney workspace. Each step opens a real page and
 * highlights one element marked `data-tour="<target>"`. Copy lives under
 * `attorneyTour.<tourId>.<stepId>.{title,body}` in the locale files.
 */

export type TourId = 'workspace' | 'case_lifecycle'

export type TourAudience = {
  isStaff: boolean
  isFirmAdmin: boolean
  /** Staff firm actions (schedule, message, …) that unlock sidebar pages. */
  staffActions: Record<string, boolean>
  /** Staff firm permissions; gate New Matches and Active Cases like the sidebar does. */
  staffPermissions: string[]
}

export type TourStep = {
  id: string
  /** A fixed route, or a builder that needs the case the tour runs on. */
  route: string | ((ctx: { leadId: string }) => string)
  target: string
  /** Who may see it. Omitted means every workspace user. */
  only?: 'attorney' | 'firm_admin'
  /** Staff see it only with this firm action, mirroring the sidebar. */
  staffAction?: string
  /** Staff see it only with at least one of these firm permissions. */
  staffAnyPermission?: string[]
}

export type TourDefinition = {
  id: TourId
  /** Needs a case to run on; the provider resolves the attorney's latest. */
  needsCase?: boolean
  steps: TourStep[]
}

/** Mirrors STAFF_ACTIVE_CASE_PERMISSIONS in AttorneyWorkspaceLayout. */
const STAFF_CASE_PERMISSIONS = [
  'view_all_cases',
  'assign_cases',
  'manage_assigned_cases',
  'message_plaintiffs',
  'manage_documents',
  'manage_billing',
]

const caseRoute = (section: string) => ({ leadId }: { leadId: string }) =>
  `/attorney-dashboard/cases/${leadId}/${section}`

export const TOURS: Record<TourId, TourDefinition> = {
  workspace: {
    id: 'workspace',
    steps: [
      { id: 'welcome', route: '/attorney-dashboard/guides', target: 'sidebar' },
      { id: 'notifications', route: '/attorney-dashboard/notifications', target: 'nav-notifications', only: 'attorney' },
      { id: 'matches', route: '/attorney-dashboard/leadgen/matches', target: 'nav-matches', staffAnyPermission: ['review_cases'] },
      { id: 'intake', route: '/attorney-dashboard/leadgen/intake', target: 'intake-import-type', only: 'attorney' },
      { id: 'activeCases', route: '/attorney-dashboard/cases/active', target: 'active-cases', staffAnyPermission: STAFF_CASE_PERMISSIONS },
      { id: 'tasks', route: '/attorney-dashboard/cases/tasks', target: 'tasks-hub', only: 'attorney' },
      { id: 'documents', route: '/attorney-dashboard/cases/documents', target: 'documents-hub', only: 'attorney' },
      { id: 'messages', route: '/attorney-dashboard/cases/messages', target: 'nav-messages', staffAction: 'message' },
      { id: 'calendar', route: '/attorney-dashboard/cases/calendar', target: 'nav-calendar', staffAction: 'schedule' },
      { id: 'video', route: '/attorney-dashboard/cases/calendar?tab=booking', target: 'video-connections', only: 'attorney' },
      { id: 'billing', route: '/attorney-dashboard/cases/billing', target: 'nav-billing', only: 'attorney' },
      { id: 'firmSettings', route: '/firm-settings', target: 'welcome-packet', only: 'firm_admin' },
      { id: 'help', route: '/attorney-dashboard/tours', target: 'nav-help' },
    ],
  },
  case_lifecycle: {
    id: 'case_lifecycle',
    needsCase: true,
    steps: [
      { id: 'tabs', route: caseRoute('overview'), target: 'case-tabs' },
      { id: 'overview', route: caseRoute('overview'), target: 'case-section' },
      { id: 'tasks', route: caseRoute('tasks'), target: 'case-section' },
      { id: 'documents', route: caseRoute('documents'), target: 'case-section' },
      { id: 'medical', route: caseRoute('medical'), target: 'case-section' },
      { id: 'demand', route: caseRoute('demand'), target: 'case-section' },
      { id: 'negotiation', route: caseRoute('negotiation'), target: 'case-section' },
      { id: 'settlement', route: caseRoute('settlement'), target: 'case-section' },
      { id: 'billing', route: caseRoute('billing'), target: 'case-section', only: 'attorney' },
    ],
  },
}

export const TOUR_ORDER: TourId[] = ['workspace', 'case_lifecycle']

/** The steps this user can actually reach, in order. */
export function stepsFor(tour: TourDefinition, audience: TourAudience): TourStep[] {
  return tour.steps.filter((step) => {
    if (step.only === 'firm_admin' && (audience.isStaff || !audience.isFirmAdmin)) return false
    if (step.only === 'attorney' && audience.isStaff) return false
    if (step.staffAction && audience.isStaff && audience.staffActions[step.staffAction] !== true) return false
    if (
      step.staffAnyPermission &&
      audience.isStaff &&
      !step.staffAnyPermission.some((p) => audience.staffPermissions.includes(p))
    )
      return false
    return true
  })
}

export function resolveRoute(step: TourStep, leadId: string | null): string | null {
  if (typeof step.route === 'string') return step.route
  return leadId ? step.route({ leadId }) : null
}

export function copyKey(tourId: TourId, stepId: string, field: 'title' | 'body'): string {
  return `attorneyTour.${tourId}.${stepId}.${field}`
}

/** `/lead/:id/...` and `/cases/:id/...` open the same case page; query params on the route (e.g. `?tab=`) must match too. */
export function samePage(pathname: string, search: string, route: string): boolean {
  const norm = (p: string) => p.replace(/\/+$/, '').replace('/attorney-dashboard/lead/', '/attorney-dashboard/cases/')
  const [routePath, routeQuery] = route.split('?')
  if (norm(pathname) !== norm(routePath)) return false
  const current = new URLSearchParams(search)
  for (const [key, value] of new URLSearchParams(routeQuery || '')) {
    if (current.get(key) !== value) return false
  }
  return true
}
