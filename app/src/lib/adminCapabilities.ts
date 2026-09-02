/**
 * Admin capability helpers shared by the console shell and role management UI.
 */
export const ADMIN_CAPABILITIES = ['ops', 'network', 'oversight', 'config', 'users'] as const
export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number]

export const ADMIN_CAPABILITY_LABELS: Record<AdminCapability, string> = {
  ops: 'Operations',
  network: 'Network',
  oversight: 'Oversight',
  config: 'Configuration',
  users: 'User roles',
}

const CAPABILITY_STORAGE_KEY = 'admin_capabilities'

export function storeAdminCapabilities(capabilities: string[]) {
  const cleaned = capabilities.filter((cap): cap is AdminCapability =>
    ADMIN_CAPABILITIES.includes(cap as AdminCapability),
  )
  localStorage.setItem(CAPABILITY_STORAGE_KEY, JSON.stringify(cleaned.length ? cleaned : [...ADMIN_CAPABILITIES]))
}

export function getStoredAdminCapabilities(): AdminCapability[] {
  try {
    const raw = localStorage.getItem(CAPABILITY_STORAGE_KEY)
    if (!raw) return [...ADMIN_CAPABILITIES]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [...ADMIN_CAPABILITIES]
    const cleaned = parsed.filter((cap): cap is AdminCapability =>
      ADMIN_CAPABILITIES.includes(cap as AdminCapability),
    )
    return cleaned.length ? cleaned : [...ADMIN_CAPABILITIES]
  } catch {
    return [...ADMIN_CAPABILITIES]
  }
}

export function clearStoredAdminCapabilities() {
  localStorage.removeItem(CAPABILITY_STORAGE_KEY)
}

export function hasStoredAdminCapability(capability: AdminCapability) {
  return getStoredAdminCapabilities().includes(capability)
}

/** Map admin nav paths to the capability required to see them. */
export function capabilityForAdminPath(path: string): AdminCapability | null {
  if (path === '/admin') return null
  if (
    path.startsWith('/admin/ops-inbox') ||
    path.startsWith('/admin/cases') ||
    path.startsWith('/admin/case-flow') ||
    path.startsWith('/admin/routing-queue') ||
    path.startsWith('/admin/manual-review') ||
    path.startsWith('/admin/settings')
  ) {
    return 'ops'
  }
  if (
    path.startsWith('/admin/attorneys') ||
    path.startsWith('/admin/invitations') ||
    path.startsWith('/admin/case-results')
  )
    return 'network'
  if (
    path.startsWith('/admin/analytics') ||
    path.startsWith('/admin/routing-feedback') ||
    path.startsWith('/admin/communications') ||
    path.startsWith('/admin/blog') ||
    path.startsWith('/admin/payments') ||
    path.startsWith('/admin/documents') ||
    path.startsWith('/admin/audit-logs') ||
    path.startsWith('/admin/system-status') ||
    path.startsWith('/admin/compliance')
  ) {
    return 'oversight'
  }
  if (
    path.startsWith('/admin/matching-rules') ||
    path.startsWith('/admin/heuristics') ||
    path.startsWith('/admin/field-mappings') ||
    path.startsWith('/admin/feature-toggles') ||
    path.startsWith('/admin/firm-settings')
  ) {
    return 'config'
  }
  if (path.startsWith('/admin/users')) return 'users'
  return null
}
