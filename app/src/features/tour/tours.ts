/**
 * Guided tours of the attorney workspace and the client portal. Each step opens
 * a real page and highlights one element marked `data-tour="<target>"`. Copy
 * lives under `<copyPrefix>.<tourId>.<stepId>.{title,body}` in the locale
 * files: `attorneyTour` (English, en.json) or `clientTour` (every portal
 * language, en-app.json / es.json / zh.json).
 */

export type TourId = 'workspace' | 'case_lifecycle' | 'client_portal'

/** Where a tour runs: the attorney workspace or the claimant portal. */
export type TourScope = 'workspace' | 'client'

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
  /** How long to wait for the target before skipping; shorter for elements that often don't exist. */
  waitMs?: number
}

export type TourDefinition = {
  id: TourId
  scope: TourScope
  copyPrefix: 'attorneyTour' | 'clientTour'
  /** Needs a case to run on; the provider resolves the attorney's latest. */
  needsCase?: boolean
  /** Query params carried over when a step navigates (e.g. the claimant's selected case). */
  keepQuery?: string[]
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
    scope: 'workspace',
    copyPrefix: 'attorneyTour',
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
    scope: 'workspace',
    copyPrefix: 'attorneyTour',
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
  client_portal: {
    id: 'client_portal',
    scope: 'client',
    copyPrefix: 'clientTour',
    keepQuery: ['case'],
    // `?tab=dashboard` rather than bare /dashboard so a step can return to the
    // main tab from another one (samePage ignores routes without a query).
    steps: [
      { id: 'welcome', route: '/dashboard?tab=dashboard', target: 'client-progress' },
      // Only once an attorney is matched.
      { id: 'attorney', route: '/dashboard?tab=dashboard', target: 'client-attorney', waitMs: 1500 },
      { id: 'tabs', route: '/dashboard?tab=dashboard', target: 'client-tabs' },
      { id: 'tasks', route: '/dashboard?tab=tasks', target: 'client-tab-tasks' },
      { id: 'documents', route: '/dashboard?tab=documents', target: 'client-tab-documents' },
      // The Attorney Review tab disappears once an attorney is matched.
      { id: 'attorneyReview', route: '/dashboard?tab=attorney', target: 'client-tab-attorney', waitMs: 1500 },
      { id: 'value', route: '/dashboard?tab=value', target: 'client-tab-value' },
      { id: 'journal', route: '/dashboard?tab=journal', target: 'client-tab-journal' },
      { id: 'cases', route: '/dashboard?tab=cases', target: 'client-tab-cases' },
      { id: 'messages', route: '/messaging', target: 'client-messages' },
      { id: 'help', route: '/dashboard?tab=dashboard', target: 'client-tour-button' },
    ],
  },
}

/** Tours offered in each place, in display order. */
export const TOURS_BY_SCOPE: Record<TourScope, TourId[]> = {
  workspace: ['workspace', 'case_lifecycle'],
  client: ['client_portal'],
}

/** The tour offered on first visit in each scope. */
export const OFFER_TOUR: Record<TourScope, TourId> = {
  workspace: 'workspace',
  client: 'client_portal',
}

/** Visible once the page is ready for the offered tour (the client's case has loaded). */
export const OFFER_READY_TARGET: Partial<Record<TourScope, string>> = {
  client: 'client-tabs',
}

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
  return `${TOURS[tourId].copyPrefix}.${tourId}.${stepId}.${field}`
}

/** Shared tour chrome (Next, Back, the welcome card…) in the tour's language file. */
export function chromeKey(tourId: TourId, key: string): string {
  return `${TOURS[tourId].copyPrefix}.${key}`
}

/** `route` plus the current values of the tour's `keepQuery` params it doesn't set itself. */
export function withKeptQuery(route: string, search: string, keep: string[] | undefined): string {
  if (!keep?.length) return route
  const [path, query] = route.split('?')
  const next = new URLSearchParams(query || '')
  const current = new URLSearchParams(search)
  for (const key of keep) {
    const value = current.get(key)
    if (value && !next.has(key)) next.set(key, value)
  }
  const qs = next.toString()
  return qs ? `${path}?${qs}` : path
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
