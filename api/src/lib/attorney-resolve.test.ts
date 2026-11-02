import { describe, expect, it } from 'vitest'
import { resolveExistingAttorney } from './attorney-resolve'

function fakePrisma(attorneys: { id: string; name: string; email?: string; barNumber?: string; phone?: string }[]) {
  const find = (key: 'email' | 'barNumber' | 'id', value: string) => attorneys.find((a) => a[key] === value) ?? null
  return {
    attorney: {
      findUnique: async ({ where }: any) => find(Object.keys(where)[0] as any, Object.values(where)[0] as string),
      findMany: async ({ where }: any) =>
        attorneys.filter((a) => (where.phone ? a.phone === where.phone : (a as any).lawFirmId === where.lawFirmId)),
    },
  } as any
}

describe('resolveExistingAttorney', () => {
  it('does not merge a colleague who lists the same firm inbox', async () => {
    const prisma = fakePrisma([{ id: 'a1', name: 'Pat Lee', email: 'intake@firm.com', barNumber: '111111' }])

    const match = await resolveExistingAttorney(prisma, { barNumber: '222222', email: 'intake@firm.com', name: 'Sam Roe' })

    expect(match).toBeNull()
  })

  it('still matches the same person by email', async () => {
    const prisma = fakePrisma([{ id: 'a1', name: 'Pat Lee', email: 'pat@firm.com', barNumber: '111111' }])

    expect(await resolveExistingAttorney(prisma, { barNumber: '111111', email: 'pat@firm.com' })).toEqual({ id: 'a1', via: 'barNumber' })
    expect(await resolveExistingAttorney(prisma, { email: 'pat@firm.com', name: 'Pat Lee' })).toEqual({ id: 'a1', via: 'email' })
  })
})
