import { describe, expect, it, vi } from 'vitest'
import { resolveFirmAccess } from './firm-access'

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
