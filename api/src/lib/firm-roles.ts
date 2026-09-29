// Single source of truth for firm-member roles and the permissions each grants.
// Shared by the firm dashboard routes and the staff login endpoint so the
// web app and backend agree on what a case manager / paralegal / etc. can do.

/**
 * The permission catalog: 13 permissions, each covering what used to be one or
 * more finer-grained ones (see LEGACY_PERMISSION_ALIASES). Several of the old
 * ones were only ever enforced as a group, so they could not be told apart.
 */
export const FIRM_PERMISSIONS = [
  'manage_users',
  'manage_routing', // Manage firm: workflow, routing, plan and seats
  'view_analytics', // also firm fees, ROI and platform spend
  'view_all_cases',
  'assign_cases',
  'manage_assigned_cases', // Work cases, including the chronology
  'review_cases', // Review Active Cases, including new leads
  'accept_cases', // Accept & decline cases
  'message_plaintiffs',
  'schedule_consultations',
  'manage_documents', // Documents & records, including requests to the client
  'generate_demands',
  'manage_billing', // Billing & payments
] as const

/** Retired permission → the permission that now covers it. */
export const LEGACY_PERMISSION_ALIASES: Record<string, string> = {
  manage_subscriptions: 'manage_routing',
  // Not to manage_routing: billing admins hold it, and it must not hand them routing.
  view_subscriptions: 'manage_billing',
  view_assigned_cases: 'view_all_cases',
  manage_chronology: 'manage_assigned_cases',
  review_new_leads: 'review_cases',
  decline_cases: 'accept_cases',
  upload_documents: 'manage_documents',
  upload_records: 'manage_documents',
  request_evidence: 'manage_documents',
  request_records: 'manage_documents',
  manage_invoices: 'manage_billing',
  process_payments: 'manage_billing',
}

/** The current permission for `permission`, whether it is current or retired. */
export function canonicalPermission(permission: string): string {
  return LEGACY_PERMISSION_ALIASES[permission] || permission
}

/** Map a list that may hold retired permissions onto the current catalog. */
export function canonicalPermissions(permissions: string[]): string[] {
  return Array.from(new Set(permissions.map(canonicalPermission)))
}

/**
 * Role defaults as they stood before consolidation, in retired terms. Only
 * `permissionsForMember` reads it: a member's adjustments saved back then were
 * made against these lists and must keep meaning what they meant.
 */
export const LEGACY_ROLE_PERMISSIONS: Record<string, string[]> = {
  firm_admin: ['manage_users', 'manage_routing', 'manage_billing', 'view_all_cases', 'view_analytics', 'assign_cases', 'manage_subscriptions'],
  attorney: [
    'review_cases', 'accept_cases', 'decline_cases', 'message_plaintiffs', 'generate_demands', 'manage_assigned_cases',
    'view_assigned_cases', 'assign_cases', 'upload_documents', 'manage_documents', 'request_evidence', 'request_records',
    'schedule_consultations', 'manage_chronology',
  ],
  case_manager: [
    'upload_records', 'manage_documents', 'message_plaintiffs', 'request_evidence', 'request_records',
    'schedule_consultations', 'manage_assigned_cases', 'view_assigned_cases',
  ],
  intake_specialist: ['review_new_leads', 'schedule_consultations', 'request_records'],
  paralegal: ['view_assigned_cases', 'manage_chronology', 'upload_documents'],
  billing_admin: ['manage_invoices', 'view_subscriptions', 'process_payments'],
  legal_assistant: ['view_assigned_cases', 'manage_documents', 'schedule_consultations'],
  demand_writer: ['view_assigned_cases', 'generate_demands', 'manage_documents'],
  medical_records: ['view_assigned_cases', 'upload_records', 'request_records'],
}

export const FIRM_ROLE_PERMISSIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(LEGACY_ROLE_PERMISSIONS).map(([role, perms]) => [role, canonicalPermissions(perms)]),
)

export const CASE_ASSIGNMENT_ROLES = [
  'lead_attorney',
  'secondary_attorney',
  'case_manager',
  'paralegal',
  'intake_owner',
  'billing_owner',
  'demand_writer',
  'medical_records',
]

/**
 * Permissions that are work on cases. Holding any of them lets a member see the
 * cases they work through the firm (their case team's and unstaffed ones); a
 * member whose admin removed all of them sees no cases. Account-level grants
 * (users, routing, subscriptions) are deliberately absent.
 */
export const CASE_ACCESS_PERMISSIONS = [
  'view_all_cases',
  'manage_assigned_cases',
  'review_cases',
  'accept_cases',
  'message_plaintiffs',
  'generate_demands',
  'manage_documents',
  'schedule_consultations',
  'manage_billing',
]

/**
 * Case-team roles several people can hold at once (co-counsel). Every other
 * role has a single owner, and assigning someone new replaces the last one.
 */
export const MULTI_ASSIGNEE_CASE_ROLES = ['secondary_attorney']

/** Roles that map to the attorney web experience rather than the staff one. */
export const ATTORNEY_FIRM_ROLES = ['firm_admin', 'attorney']

export function permissionsForRole(role: string | null | undefined): string[] {
  if (!role) return []
  return FIRM_ROLE_PERMISSIONS[role] || []
}

export function roleHasPermission(role: string, permission: string): boolean {
  return permissionsForRole(role).includes(permission)
}

// The full catalog of assignable permissions. Used to validate custom role
// edits so a firm can't invent permissions.
export const ALL_FIRM_PERMISSIONS: string[] = [...FIRM_PERMISSIONS].sort()

// firm_admin must always retain user management, otherwise a firm could lock
// itself out of the very screen used to fix permissions.
export const LOCKED_ROLE_PERMISSIONS: Record<string, string[]> = {
  firm_admin: ['manage_users'],
}

/**
 * Resolve a firm's effective role→permission map: each known role uses the
 * firm's override when present (sanitized to the catalog + locked perms), else
 * the platform default. `overridesJson` is LawFirm.rolePermissions.
 */
function parseRoleOverrides(overridesJson?: string | null): Record<string, string[]> {
  if (!overridesJson) return {}
  try {
    const parsed = JSON.parse(overridesJson)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {}
  } catch {
    return {} // malformed → treat as no overrides
  }
}

/**
 * The role's list as the firm saved it, in whatever terms it was saved (retired
 * permissions included), else the pre-consolidation default.
 */
export function storedRolePermissions(overridesJson: string | null | undefined, role: string): string[] {
  const ov = parseRoleOverrides(overridesJson)[role]
  return Array.isArray(ov) ? ov.map(String) : LEGACY_ROLE_PERMISSIONS[role] || []
}

export function effectiveRolePermissions(
  overridesJson?: string | null,
): Record<string, string[]> {
  const overrides = parseRoleOverrides(overridesJson)
  const out: Record<string, string[]> = {}
  for (const role of Object.keys(FIRM_ROLE_PERMISSIONS)) {
    const ov = overrides[role]
    if (Array.isArray(ov)) {
      const sanitized = canonicalPermissions(ov.map(String)).filter((p) => ALL_FIRM_PERMISSIONS.includes(p))
      const locked = LOCKED_ROLE_PERMISSIONS[role] || []
      out[role] = Array.from(new Set([...sanitized, ...locked]))
    } else {
      out[role] = FIRM_ROLE_PERMISSIONS[role]
    }
  }
  return out
}
