import { describe, expect, it, vi } from 'vitest'
import { parseMemberOverrides, permissionsForMember, resolveFirmAccess } from './firm-access'
import { ALL_FIRM_PERMISSIONS, FIRM_ROLE_PERMISSIONS } from './firm-roles'

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
