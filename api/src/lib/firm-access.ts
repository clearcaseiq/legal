import { ALL_FIRM_PERMISSIONS, effectiveRolePermissions } from './firm-roles'

/**
 * What a firm member may do, resolved once from the firm's role matrix.
 *
 * Every surface — firm dashboard, attorney dashboard, staff login — reads it
 * from here. Each used to resolve permissions itself, and they disagreed: one
 * fell back to the platform default so a firm could never take a permission
 * away, another hard-coded which roles saw the whole firm, and staff login
 * ignored the firm's edits altogether.
 */
export type FirmAccess = {
  lawFirmId: string
  role: string
  permissions: string[]
  userId: string | null
  attorneyId: string | null
  memberId: string | null
}

/**
 * A firm admin can grant themselves anything from Firm Settings, so the role is
 * treated as holding every permission rather than trusting a stored list that
 * predates newer permissions.
 */
export const SUPERUSER_FIRM_ROLES = ['firm_admin']

export function parsePermissionList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

/** The member's permissions: the firm's setting for their role plus their own extra grants. */
export function permissionsForMember(
  role: string,
  rolePermissionsJson: string | null | undefined,
  memberExtras: unknown,
): string[] {
  if (SUPERUSER_FIRM_ROLES.includes(role)) return [...ALL_FIRM_PERMISSIONS]
  const byRole = effectiveRolePermissions(rolePermissionsJson)[role] || []
  return Array.from(new Set([...byRole, ...parsePermissionList(memberExtras)]))
}

type AccessClient = {
  attorney: { findFirst: (args: any) => Promise<any> }
  firmMember: { findFirst: (args: any) => Promise<any> }
}

type Caller = { id?: string | null; email?: string | null } | null | undefined

/** Access from an active membership alone, or `null` when the caller has none. */
export async function resolveMemberAccess(client: AccessClient, caller: Caller): Promise<FirmAccess | null> {
  const userId = caller?.id
  if (!userId) return null
  const member = await client.firmMember
    .findFirst({ where: { userId, status: 'active' }, include: { lawFirm: { select: { rolePermissions: true } } } })
    .catch(() => null)
  if (!member?.lawFirmId) return null
  const role = member.role || 'intake_specialist'
  return {
    lawFirmId: member.lawFirmId,
    role,
    permissions: permissionsForMember(role, member.lawFirm?.rolePermissions, member.permissions),
    userId,
    attorneyId: member.attorneyId ?? null,
    memberId: member.id,
  }
}

/**
 * Whether an attorney linked to this firm, with no active membership, is its
 * admin. Only for firms that predate membership rows and have none at all.
 *
 * Once a firm has members, `Attorney.lawFirmId` alone proves nothing: it is set
 * the moment an attorney is invited and survives suspension, so treating it as
 * admin would hand the firm to invitees who never accepted and to members who
 * were suspended or removed.
 */
export async function isMemberlessFirm(client: AccessClient, lawFirmId: string): Promise<boolean> {
  const anyMember = await client.firmMember
    .findFirst({ where: { lawFirmId }, select: { id: true } })
    .catch(() => null)
  return !anyMember
}

/**
 * Resolve the caller's firm access, or `null` when they belong to no firm (a
 * solo attorney, a claimant). Only an active membership counts, except for the
 * founding attorney of a firm with no membership rows; see `isMemberlessFirm`.
 */
export async function resolveFirmAccess(client: AccessClient, caller: Caller): Promise<FirmAccess | null> {
  const fromMember = await resolveMemberAccess(client, caller)
  if (fromMember) return fromMember

  const email = String(caller?.email || '').trim()
  if (!email) return null
  const attorney = await client.attorney.findFirst({ where: { email } }).catch(() => null)
  if (attorney?.lawFirmId && (await isMemberlessFirm(client, attorney.lawFirmId))) {
    return {
      lawFirmId: attorney.lawFirmId,
      role: 'firm_admin',
      permissions: [...ALL_FIRM_PERMISSIONS],
      userId: caller?.id ?? null,
      attorneyId: attorney.id,
      memberId: null,
    }
  }

  return null
}

/** Whether the caller holds any of `anyOf`. Callers outside a firm are not limited by firm roles. */
export function firmAllows(access: FirmAccess | null, anyOf: string | string[]): boolean {
  if (!access) return true
  const wanted = Array.isArray(anyOf) ? anyOf : [anyOf]
  return wanted.some((p) => access.permissions.includes(p))
}
