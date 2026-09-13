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
import { ensureCaseOwnerUserId, guestCaseUserEmail } from './case-owner'
import { normalizePhone, PHONE_ERROR_MESSAGE } from './phone'

/** The mailing address fields, which live only on the user row. */
export const ADDRESS_FIELDS = ['addressLine1', 'addressLine2', 'city', 'state', 'postalCode'] as const
export type AddressField = (typeof ADDRESS_FIELDS)[number]

export type ClaimantContactPatch = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
} & Partial<Record<AddressField, string>>

export type ClaimantContact = {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
} & Record<AddressField, string | null>

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

  // Address fields take an empty string to mean "clear this", which the trimming
  // helper above cannot express — a claimant who moves out of an apartment needs
  // to be able to drop the unit number.
  const addressPatch: Record<string, string | null> = {}
  for (const field of ADDRESS_FIELDS) {
    const value = patch[field]
    if (typeof value !== 'string') continue
    addressPatch[field] = value.trim() || null
  }
  const hasAddressEdit = Object.keys(addressPatch).length > 0

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      facts: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          passwordHash: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
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

  let user = assessment.user
  // The address has nowhere to live but the user row, so a case still on a guest
  // has to get its owner minted first. Only for an actual address edit: nothing
  // else here is worth creating a row for.
  if (!user && hasAddressEdit) {
    const ownerId = await ensureCaseOwnerUserId(assessmentId)
    if (ownerId) {
      user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          passwordHash: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      })
    }
  }

  let loginEmailUnchanged = false
  const userData: Record<string, string | null> = { ...addressPatch }
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
      addressLine1: addressPatch.addressLine1 ?? user?.addressLine1 ?? null,
      addressLine2: addressPatch.addressLine2 ?? user?.addressLine2 ?? null,
      city: addressPatch.city ?? user?.city ?? null,
      state: addressPatch.state ?? user?.state ?? null,
      postalCode: addressPatch.postalCode ?? user?.postalCode ?? null,
    },
  }
}

function isGuestEmail(email: string, assessmentId: string): boolean {
  return email === guestCaseUserEmail(assessmentId)
}

/** The contact fields a claimant can correct about themselves. */
const SELF_EDITABLE = ['firstName', 'lastName', 'email', 'phone'] as const

/**
 * Carry an account holder's own edit into the case copy of their details.
 *
 * The claimant's profile screen wrote only the user row. Every reader here
 * prefers `plaintiffContext`, and the SMS layer resolves the texting number the
 * same way, so someone who corrected their phone number was shown a success
 * message while the firm went on calling and texting the old one. That is the
 * staff-side bug of CP-848 from the other direction, so it gets the same
 * treatment: one edit, both copies.
 *
 * Applies to every case the user owns, because the correction is about the
 * person rather than any one matter. Returns how many were touched.
 */
export async function syncClaimantContactForUser(
  userId: string,
  patch: Partial<Record<(typeof SELF_EDITABLE)[number], string | null>>,
): Promise<number> {
  const fields = SELF_EDITABLE.filter((field) => patch[field] !== undefined)
  if (fields.length === 0) return 0

  const assessments = await prisma.assessment.findMany({
    where: { userId },
    select: { id: true, facts: true },
  })

  let updated = 0
  for (const assessment of assessments) {
    let facts: Record<string, any> = {}
    if (assessment.facts) {
      try {
        facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : (assessment.facts as any)
      } catch {
        // Leave a blob we cannot read alone rather than replacing it: unlike the
        // staff path, nobody is waiting on this write, and the intake answers in
        // there are worth more than one contact field.
        continue
      }
    }

    const context = { ...((facts.plaintiffContext || {}) as Record<string, any>) }
    let changed = false
    for (const field of fields) {
      const value = patch[field]
      if (value === null || value === '') {
        // Dropping the key rather than storing a blank falls resolution through
        // to the user row, which the same edit just cleared.
        if (field in context) {
          delete context[field]
          changed = true
        }
      } else if (context[field] !== value) {
        context[field] = value
        changed = true
      }
    }
    if (!changed) continue

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { facts: JSON.stringify({ ...facts, plaintiffContext: context }) },
    })
    updated += 1
  }

  return updated
}

/** True for the synthetic owner row, whose address nobody can receive mail at. */
export function isShadowEmail(email: string | null | undefined): boolean {
  return /^guest\+.*@caseiq\.local$/i.test(email || '')
}

/**
 * The one definition of "the claimant's contact details".
 *
 * The case copy wins over the account for name, email, and phone. That is not
 * arbitrary: `lib/case-phone-binding.ts` resolves the texting number the same
 * way, and staff edits land in the case copy, so any screen that ranked the two
 * differently displayed a number we would never actually dial. Callers that
 * need a different answer — `routes/case-assistance.ts` decides between a login
 * link and an invite, so it must ask the account, not the case — should say so
 * where they diverge rather than quietly reordering these.
 */
export function resolveClaimantContact(source: {
  user?: {
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  } | null
  facts?: unknown
}): ClaimantContact {
  let context: Record<string, any> = {}
  if (source.facts) {
    try {
      const facts = typeof source.facts === 'string' ? JSON.parse(source.facts) : (source.facts as any)
      context = (facts?.plaintiffContext || {}) as Record<string, any>
    } catch {
      context = {}
    }
  }

  const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)
  const user = source.user
  return {
    firstName: str(context.firstName) || user?.firstName || null,
    lastName: str(context.lastName) || user?.lastName || null,
    email: str(context.email) || (user && !isShadowEmail(user.email) ? user.email || null : null),
    phone: str(context.phone) || user?.phone || null,
    addressLine1: user?.addressLine1 || null,
    addressLine2: user?.addressLine2 || null,
    city: user?.city || null,
    state: user?.state || null,
    postalCode: user?.postalCode || null,
  }
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
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
    },
  })
  if (!assessment) return null

  return resolveClaimantContact(assessment)
}
