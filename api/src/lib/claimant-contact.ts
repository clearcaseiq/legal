/**
 * Editing a claimant's contact details, in both of the places we keep them.
 *
 * A case carries two copies: the `User` row, and `plaintiffContext` inside the
 * `Assessment.facts` JSON blob that intake writes. They are read in different
 * orders by different callers — notably `lib/case-phone-binding.ts` prefers the
 * facts copy — so updating one and not the other means texts keep going to the
 * number the claimant just told us was wrong. Every write here touches both.
 *
 * Login email is deliberately not treated as a contact field. See
 * `canRepointLoginEmail` for why.
 */
import { prisma } from './prisma'
import { guestCaseUserEmail } from './case-owner'
import { normalizePhone, PHONE_ERROR_MESSAGE } from './phone'

export interface ClaimantContactPatch {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export interface ClaimantContact {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

export type UpdateClaimantContactResult =
  | {
      ok: true
      contact: ClaimantContact
      /** True when the account's sign-in address was left alone on purpose. */
      loginEmailUnchanged: boolean
    }
  | { ok: false; status: number; message: string }

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Whether staff may move the address this account signs in with.
 *
 * Allowed only while the address is not yet a real credential: a synthetic
 * guest owner, or an account provisioned by intake or import that has never had
 * a password set. Repointing a live account would let a firm redirect password
 * resets for an inbox full of the claimant's own medical records, and would
 * silently change the username the claimant has been typing.
 */
function canRepointLoginEmail(user: { email: string; passwordHash: string | null }, assessmentId: string): boolean {
  return user.email === guestCaseUserEmail(assessmentId) || !user.passwordHash
}

export async function updateClaimantContact(params: {
  assessmentId: string
  patch: ClaimantContactPatch
}): Promise<UpdateClaimantContactResult> {
  const { assessmentId, patch } = params

  const firstName = clean(patch.firstName)
  const lastName = clean(patch.lastName)
  const email = clean(patch.email)?.toLowerCase()
  const rawPhone = clean(patch.phone)

  let phone: string | undefined
  if (rawPhone !== undefined) {
    phone = normalizePhone(rawPhone)
    if (!phone) return { ok: false, status: 400, message: PHONE_ERROR_MESSAGE }
  }

  if (email !== undefined && !EMAIL_SHAPE.test(email)) {
    return { ok: false, status: 400, message: 'Enter a valid email address' }
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      facts: true,
      userId: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, passwordHash: true } },
    },
  })
  if (!assessment) return { ok: false, status: 404, message: 'Case not found' }

  let facts: Record<string, any> = {}
  if (assessment.facts) {
    try {
      facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : (assessment.facts as any)
    } catch {
      // A malformed blob should not cost the claimant a working phone number;
      // start a fresh context rather than refusing the edit.
      facts = {}
    }
  }
  const context = { ...((facts.plaintiffContext || {}) as Record<string, any>) }

  if (firstName !== undefined) context.firstName = firstName
  if (lastName !== undefined) context.lastName = lastName
  if (email !== undefined) context.email = email
  if (phone !== undefined) context.phone = phone

  const user = assessment.user
  let loginEmailUnchanged = false
  const userData: Record<string, string> = {}
  if (user) {
    if (firstName !== undefined) userData.firstName = firstName
    if (lastName !== undefined) userData.lastName = lastName
    if (phone !== undefined) userData.phone = phone
    if (email !== undefined && email !== user.email) {
      if (canRepointLoginEmail(user, assessmentId)) {
        const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
        if (taken && taken.id !== user.id) {
          return { ok: false, status: 409, message: 'Another account already uses that email address.' }
        }
        userData.email = email
      } else {
        loginEmailUnchanged = true
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({
      where: { id: assessmentId },
      data: { facts: JSON.stringify({ ...facts, plaintiffContext: context }) },
    })
    if (user && Object.keys(userData).length) {
      await tx.user.update({ where: { id: user.id }, data: userData })
    }
  })

  return {
    ok: true,
    loginEmailUnchanged,
    contact: {
      firstName: context.firstName ?? user?.firstName ?? null,
      lastName: context.lastName ?? user?.lastName ?? null,
      email: context.email ?? (user && !isGuestEmail(user.email, assessmentId) ? user.email : null) ?? null,
      phone: context.phone ?? user?.phone ?? null,
    },
  }
}

function isGuestEmail(email: string, assessmentId: string): boolean {
  return email === guestCaseUserEmail(assessmentId)
}

/**
 * The contact details as the rest of the platform will read them, in the same
 * priority order the SMS layer uses, so the screen cannot show one number while
 * we text another.
 */
export async function readClaimantContact(assessmentId: string): Promise<ClaimantContact | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      facts: true,
      user: { select: { email: true, firstName: true, lastName: true, phone: true } },
    },
  })
  if (!assessment) return null

  let context: Record<string, any> = {}
  if (assessment.facts) {
    try {
      const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : (assessment.facts as any)
      context = (facts?.plaintiffContext || {}) as Record<string, any>
    } catch {
      context = {}
    }
  }

  const user = assessment.user
  const email = typeof context.email === 'string' ? context.email : null
  return {
    firstName: (typeof context.firstName === 'string' ? context.firstName : null) || user?.firstName || null,
    lastName: (typeof context.lastName === 'string' ? context.lastName : null) || user?.lastName || null,
    email: email || (user && !user.email.endsWith('@caseiq.local') ? user.email : null),
    phone: (typeof context.phone === 'string' ? context.phone : null) || user?.phone || null,
  }
}
