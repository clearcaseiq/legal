import { describe, expect, it, vi } from 'vitest'
import {
  MEMBER_OVERRIDES_VERSION,
  activateAcceptedInvites,
  currentMemberOverrides,
  parseMemberOverrides,
  permissionsForMember,
  resolveFirmAccess,
} from './firm-access'
import { ALL_FIRM_PERMISSIONS, FIRM_ROLE_PERMISSIONS, canonicalPermission, effectiveRolePermissions } from './firm-roles'

describe('permissionsForMember', () => {
  it('adds grants and takes away revokes from the role defaults', () => {
    const perms = permissionsForMember(
      'case_manager',
      null,
      JSON.stringify({ grant: ['generate_demands'], revoke: ['manage_assigned_cases'] }),
    )
    expect(perms).toContain('generate_demands')
    expect(perms).not.toContain('manage_assigned_cases')
    expect(perms).toContain('message_plaintiffs')
  })

  it('reads the older bare-array format as grants', () => {
    const perms = permissionsForMember('intake_specialist', null, JSON.stringify(['message_plaintiffs']))
    expect(perms).toEqual(expect.arrayContaining([...FIRM_ROLE_PERMISSIONS.intake_specialist, 'message_plaintiffs']))
  })

  it('never takes permissions away from a firm admin', () => {
    const perms = permissionsForMember('firm_admin', null, JSON.stringify({ revoke: ['manage_users'] }))
    expect(perms).toEqual([...ALL_FIRM_PERMISSIONS])
  })

  it('treats malformed overrides as none', () => {
    expect(parseMemberOverrides('{not json')).toEqual({ grant: [], revoke: [] })
    expect(parseMemberOverrides(null)).toEqual({ grant: [], revoke: [] })
  })
})

describe('retired permissions', () => {
  it('reads an old grant as the permission that now covers it', () => {
    const perms = permissionsForMember('billing_admin', null, JSON.stringify({ grant: ['request_records'] }))
    expect(perms).toContain('manage_documents')
    expect(perms).not.toContain('request_records')
  })

  it('keeps access when an old revoke takes away only part of a merged group', () => {
    // Attorneys held upload_documents, manage_documents, request_evidence and
    // request_records; revoking one still left them document access.
    const perms = permissionsForMember('attorney', null, JSON.stringify({ revoke: ['request_records'] }))
    expect(perms).toContain('manage_documents')
  })

  it('takes the merged permission away when an old revoke covered everything the role held in it', () => {
    const perms = permissionsForMember('paralegal', null, JSON.stringify({ revoke: ['upload_documents'] }))
    expect(perms).not.toContain('manage_documents')
    expect(perms).toEqual(expect.arrayContaining(['view_all_cases', 'manage_assigned_cases']))
  })

  it('maps a firm role setting saved in old terms', () => {
    const rolePermissions = JSON.stringify({ paralegal: ['view_assigned_cases', 'upload_records'] })
    expect(effectiveRolePermissions(rolePermissions).paralegal.sort()).toEqual(['manage_documents', 'view_all_cases'])
    expect(permissionsForMember('paralegal', rolePermissions, null).sort()).toEqual(['manage_documents', 'view_all_cases'])
  })

  it('applies adjustments saved in new terms against the current defaults', () => {
    const perms = permissionsForMember(
      'attorney',
      null,
      JSON.stringify({ v: MEMBER_OVERRIDES_VERSION, grant: ['view_analytics'], revoke: ['manage_documents'] }),
    )
    expect(perms).toContain('view_analytics')
    expect(perms).not.toContain('manage_documents')
  })

  it('does not hand billing admins routing through View subscriptions', () => {
    expect(permissionsForMember('billing_admin', null, null)).not.toContain('manage_routing')
    expect(canonicalPermission('view_subscriptions')).toBe('manage_billing')
  })

  it('restates old adjustments in new terms for the permissions window', () => {
    expect(currentMemberOverrides('paralegal', null, JSON.stringify({ revoke: ['upload_documents'], grant: ['decline_cases'] })))
      .toEqual({ v: MEMBER_OVERRIDES_VERSION, grant: ['accept_cases'], revoke: ['manage_documents'] })
  })

  it('has 13 permissions', () => {
    expect(ALL_FIRM_PERMISSIONS).toHaveLength(13)
  })
})

/** A client where the caller is an attorney linked to firm_1 with no active membership. */
function linkedAttorneyClient(firmHasMembers: boolean) {
  return {
    attorney: { findFirst: vi.fn().mockResolvedValue({ id: 'att_1', email: 'a@x.test', lawFirmId: 'firm_1' }) },
    firmMember: {
      findFirst: vi.fn().mockImplementation(({ where }: any) =>
        // The caller's own active-membership lookup finds nothing; the
        // any-member probe finds one only when the firm has members.
        Promise.resolve(where.userId ? null : firmHasMembers ? { id: 'mem_other' } : null),
      ),
    },
  }
}

describe('resolveFirmAccess', () => {
  it('treats the attorney of a firm with no membership rows as its admin', async () => {
    const access = await resolveFirmAccess(linkedAttorneyClient(false), { id: 'user_1', email: 'a@x.test' })
    expect(access).toMatchObject({ lawFirmId: 'firm_1', role: 'firm_admin' })
  })

  it('gives no access to a linked attorney without an active membership once the firm has members', async () => {
    // Invited but not accepted, suspended, or removed: Attorney.lawFirmId is still set.
    const access = await resolveFirmAccess(linkedAttorneyClient(true), { id: 'user_1', email: 'a@x.test' })
    expect(access).toBeNull()
  })
})

describe('activateAcceptedInvites', () => {
  it('activates only invited rows whose account has a password', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const count = await activateAcceptedInvites({ firmMember: { updateMany } }, { lawFirmId: 'firm_1' })
    expect(count).toBe(1)
    expect(updateMany).toHaveBeenCalledWith({
      where: { lawFirmId: 'firm_1', status: 'invited', user: { passwordHash: { not: null } } },
      data: { status: 'active', joinedAt: expect.any(Date) },
    })
  })

  it('never throws, so a sign-in or roster load is not blocked by it', async () => {
    const updateMany = vi.fn().mockRejectedValue(new Error('db down'))
    await expect(activateAcceptedInvites({ firmMember: { updateMany } }, { userId: 'user_1' })).resolves.toBe(0)
  })
})
