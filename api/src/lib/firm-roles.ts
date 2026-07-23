// Single source of truth for firm-member roles and the permissions each grants.
// Shared by the firm dashboard routes and the staff login endpoint so the
// web app and backend agree on what a case manager / paralegal / etc. can do.

export const FIRM_ROLE_PERMISSIONS: Record<string, string[]> = {
  firm_admin: [
    'manage_users',
    'manage_routing',
    'manage_billing',
    'view_all_cases',
    'view_analytics',
    'assign_cases',
    'manage_subscriptions',
  ],
  attorney: [
    'review_cases',
    'accept_cases',
    'decline_cases',
    'message_plaintiffs',
    'generate_demands',
    'manage_assigned_cases',
    'assign_cases',
  ],
  case_manager: [
    'upload_records',
    'manage_documents',
    'message_plaintiffs',
    'request_evidence',
    'manage_assigned_cases',
  ],
  intake_specialist: ['review_new_leads', 'schedule_consultations', 'request_records'],
  paralegal: ['view_assigned_cases', 'manage_chronology', 'upload_documents'],
  billing_admin: ['manage_invoices', 'view_subscriptions', 'process_payments'],
  legal_assistant: ['view_assigned_cases', 'manage_documents', 'schedule_consultations'],
  demand_writer: ['view_assigned_cases', 'generate_demands', 'manage_documents'],
  medical_records: ['view_assigned_cases', 'upload_records', 'request_records'],
}

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

/** Roles that map to the attorney web experience rather than the staff one. */
export const ATTORNEY_FIRM_ROLES = ['firm_admin', 'attorney']

export function permissionsForRole(role: string | null | undefined): string[] {
  if (!role) return []
  return FIRM_ROLE_PERMISSIONS[role] || []
}

export function roleHasPermission(role: string, permission: string): boolean {
  return permissionsForRole(role).includes(permission)
}
