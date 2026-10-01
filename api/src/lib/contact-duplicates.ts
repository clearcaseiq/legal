/**
 * Whether an email or phone typed during intake already belongs to a claimant.
 *
 * Answers only "is it on file, and is that account signed-up" — never which
 * cases or whose name — because the caller is anonymous. Sign-up already
 * reveals whether an address is registered, so this exposes nothing new, and it
 * lets the claimant decide to keep their cases under one account.
 *
 * An account only counts if it is signed up or already holds a case. Intake
 * provisions a passwordless account the moment an email is typed, so without
 * that rule every new claimant would be warned about the account their own
 * keystrokes just created.
 */
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type ContactDuplicateResult = {
  email: { exists: boolean; registered: boolean } | null
  phone: { exists: boolean; sameAccountAsEmail: boolean } | null
}

export function contactPhoneDigits(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

type AccountRow = {
  id: string
  passwordHash: string | null
  provider: string | null
  isActive: boolean
  _count: { assessments: number }
}

const ACCOUNT_SELECT = {
  id: true,
  passwordHash: true,
  provider: true,
  isActive: true,
  _count: { select: { assessments: true } },
} as const

function isRegistered(user: AccountRow): boolean {
  return Boolean(user.passwordHash || (user.provider && user.provider !== 'intake'))
}

function counts(user: AccountRow): boolean {
  return user.isActive && (isRegistered(user) || user._count.assessments > 0)
}

/** Claimant accounts holding this number, matched on digits since stored formats vary. */
async function findClaimantIdsByPhone(digits: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "users"
    WHERE "role" = 'client'
      AND "phone" IS NOT NULL
      AND right(regexp_replace("phone", '\\D', '', 'g'), 10) = ${digits}
    LIMIT 10
  `)
  return rows.map((r) => r.id)
}

export async function checkContactDuplicates(params: {
  email?: string | null
  phone?: string | null
  excludeUserId?: string | null
}): Promise<ContactDuplicateResult> {
  const email = (params.email || '').trim().toLowerCase()
  let emailUserId: string | null = null
  let emailResult: ContactDuplicateResult['email'] = null
  if (email) {
    const user = (await prisma.user.findUnique({ where: { email }, select: ACCOUNT_SELECT })) as AccountRow | null
    const match = user && user.id !== params.excludeUserId && counts(user) ? user : null
    emailUserId = match?.id ?? null
    emailResult = { exists: Boolean(match), registered: Boolean(match && isRegistered(match)) }
  }

  let phoneResult: ContactDuplicateResult['phone'] = null
  const digits = contactPhoneDigits(params.phone)
  if (digits.length === 10) {
    const ids = (await findClaimantIdsByPhone(digits)).filter((id) => id !== params.excludeUserId)
    const accounts = ids.length
      ? ((await prisma.user.findMany({ where: { id: { in: ids } }, select: ACCOUNT_SELECT })) as AccountRow[]).filter(counts)
      : []
    phoneResult = {
      exists: accounts.length > 0,
      sameAccountAsEmail: Boolean(emailUserId && accounts.length > 0 && accounts.every((a) => a.id === emailUserId)),
    }
  }

  return { email: emailResult, phone: phoneResult }
}
