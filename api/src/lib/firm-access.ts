import {
  ALL_FIRM_PERMISSIONS,
  LOCKED_ROLE_PERMISSIONS,
  canonicalPermissions,
  effectiveRolePermissions,
  storedRolePermissions,
  v2Permission,
} from './firm-roles'

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

/**
 * `v: 3` marks adjustments made in terms of the current 8-permission catalog.
 * `v: 2` ones were made against the 13-permission catalog, and unversioned ones
 * predate consolidation altogether; both name permissions since merged.
 */
export const MEMBER_OVERRIDES_VERSION = 3
const V2_MEMBER_OVERRIDES = 2

export type MemberPermissionOverrides = { grant: string[]; revoke: string[]; v?: number }

/**
 * A member's own adjustments to their role, from `FirmMember.permissions`.
 *
 * Stored as `{ grant, revoke }`. A bare array is the older format, which could
 * only add permissions, and is read as grants.
 */
export function parseMemberOverrides(value: unknown): MemberPermissionOverrides {
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = value.trim() ? JSON.parse(value) : null
    } catch {
      parsed = null
    }
  }
  if (Array.isArray(parsed)) return { grant: parsed.map(String), revoke: [] }
  if (parsed && typeof parsed === 'object') {
    const { grant, revoke, v } = parsed as { grant?: unknown; revoke?: unknown; v?: unknown }
    return {
      grant: parsePermissionList(grant),
      revoke: parsePermissionList(revoke),
      ...(typeof v === 'number' ? { v } : {}),
    }
  }
  return { grant: [], revoke: [] }
}

/** The member's permissions: the firm's setting for their role, plus their grants, minus their revokes. */
export function permissionsForMember(
  role: string,
  rolePermissionsJson: string | null | undefined,
  memberOverrides: unknown,
): string[] {
  if (SUPERUSER_FIRM_ROLES.includes(role)) return [...ALL_FIRM_PERMISSIONS]
  const overrides = parseMemberOverrides(memberOverrides)
  if (overrides.v === MEMBER_OVERRIDES_VERSION) {
    const byRole = effectiveRolePermissions(rolePermissionsJson)[role] || []
    const revoked = new Set(canonicalPermissions(overrides.revoke))
    return Array.from(new Set([...byRole, ...canonicalPermissions(overrides.grant)])).filter((p) => !revoked.has(p))
  }
  // Older adjustments: apply them to the role's list in the terms they were
  // made in, then map. Taking away one of several permissions that now share
  // a name keeps that name, as it kept access.
  const inSavedTerms = overrides.v === V2_MEMBER_OVERRIDES ? v2Permission : (p: string) => p
  const revoked = new Set(overrides.revoke.map(inSavedTerms))
  const held = [...storedRolePermissions(rolePermissionsJson, role), ...overrides.grant]
    .map(inSavedTerms)
    .filter((p) => !revoked.has(p))
  const locked = LOCKED_ROLE_PERMISSIONS[role] || []
  return canonicalPermissions([...held, ...locked]).filter((p) => ALL_FIRM_PERMISSIONS.includes(p))
}

/**
 * A member's adjustments restated against their role's current defaults, in
 * consolidated terms: what the Assign permissions window shows and saves.
 */
export function currentMemberOverrides(
  role: string,
  rolePermissionsJson: string | null | undefined,
  memberOverrides: unknown,
): MemberPermissionOverrides {
  const byRole = effectiveRolePermissions(rolePermissionsJson)[role] || []
  const held = permissionsForMember(role, rolePermissionsJson, memberOverrides)
  return {
    v: MEMBER_OVERRIDES_VERSION,
    grant: held.filter((p) => !byRole.includes(p)),
    revoke: byRole.filter((p) => !held.includes(p)),
  }
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

/**
 * Flip pending firm invites to active for accounts that have set a password.
 *
 * An invite is accepted by setting a password, and the password-set request is
 * meant to activate the membership — but that step is best-effort, so a member
 * could end up signed in while their membership still read "invited". Only
 * active memberships carry firm permissions, so such an attorney was treated as
 * solo and refused a colleague's match. Pass `userId` to repair one account, or
 * `lawFirmId` to repair a firm's roster. Returns the number of rows activated.
 */
export async function activateAcceptedInvites(
  client: { firmMember: { updateMany: (args: any) => Promise<{ count: number }> } },
  scope: { userId: string } | { lawFirmId: string },
): Promise<number> {
  try {
    const result = await client.firmMember.updateMany({
      where: { ...scope, status: 'invited', user: { passwordHash: { not: null } } },
      data: { status: 'active', joinedAt: new Date() },
    })
    return result?.count ?? 0
  } catch {
    return 0
  }
}

/** Firm permission that lets staff run the attorneys' calendars and booking links (client communication). */
export const SCHEDULE_PERMISSION = 'message_plaintiffs'

/**
 * Prisma filter for the firm attorneys whose consults a scheduler may manage.
 * `Attorney.lawFirmId` outlives an unaccepted invite or a suspension, so an
 * attorney with a non-active membership in the firm is left out.
 */
export function schedulableFirmAttorneysWhere(lawFirmId: string) {
  return {
    lawFirmId,
    firmMemberships: { none: { lawFirmId, status: { not: 'active' } } },
  }
}

/** Whether the caller holds any of `anyOf`. Callers outside a firm are not limited by firm roles. */
export function firmAllows(access: FirmAccess | null, anyOf: string | string[]): boolean {
  if (!access) return true
  const wanted = canonicalPermissions(Array.isArray(anyOf) ? anyOf : [anyOf])
  return wanted.some((p) => access.permissions.includes(p))
}
