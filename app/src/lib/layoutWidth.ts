/**
 * Which screens render edge-to-edge (full-width) vs. the default centered
 * reading-width column.
 *
 * The entire attorney experience uses the full viewport width so dense grids,
 * tables and dashboards get maximum horizontal room. Public / plaintiff /
 * marketing routes keep the centered column.
 *
 * Shared by the outer app shell (Layout) and the workspace shell
 * (AttorneyWorkspaceLayout) so both drop their max-width cap in lockstep, and
 * re-used by App.tsx for other attorney-route logic (single source of truth).
 */

export const ATTORNEY_ROUTE_PREFIXES = [
  '/attorney-dashboard',
  '/attorney-profile',
  '/attorney-preferences',
  '/integrations',
  '/attorney-billing',
  '/firm-dashboard',
  '/medical-providers',
]

/** Calendar gets both full-width AND a full-height (viewport) treatment. */
export function isCalendarRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/attorney-dashboard/cases/calendar') ||
    pathname.startsWith('/attorney-dashboard/calendar')
  )
}

/** True for screens that should span the full viewport width. */
export function isWideAttorneyRoute(pathname: string): boolean {
  return ATTORNEY_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
