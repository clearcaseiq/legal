import { prisma } from './prisma'
import { logger } from './logger'

export interface IntakeContact {
  email?: string | null
  phone?: string | null
}

/**
 * Find or create a provisional (passwordless) account from intake contact info.
 *
 * Intake captures an email/phone long before the claimant registers, so we
 * persist that as a real `User` immediately. The account is created with no
 * password (`passwordHash: null`) and empty name fields — both are filled in
 * later when the user completes registration (see auth `/register`, which
 * upgrades a provisional account instead of rejecting the duplicate email).
 *
 * Email is the unique key, so a phone-only lead cannot become an account yet
 * and returns null. Never throws — provisioning is best-effort.
 */
export async function findOrCreateIntakeUser(contact: IntakeContact) {
  const email = contact.email?.trim().toLowerCase()
  if (!email) return null

  const phone = contact.phone?.trim() || null

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Backfill phone if intake now has one and the account didn't.
      if (phone && !existing.phone) {
        await prisma.user.update({ where: { id: existing.id }, data: { phone } })
      }
      return existing
    }

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: null, // provisional: no password until registration
        firstName: '',
        lastName: '',
        emailVerified: false,
        role: 'client',
        provider: 'intake',
      },
    })
    logger.info('Provisional intake account created', { userId: user.id })
    return user
  } catch (error) {
    logger.warn('Failed to provision intake account', { error })
    return null
  }
}

/**
 * Provision the account for a captured lead and link it back to the lead row.
 * Best-effort and safe to call fire-and-forget after responding to the client.
 */
export async function provisionAndLinkIntakeAccount(lead: {
  id: string
  email: string | null
  phone: string | null
}): Promise<void> {
  const user = await findOrCreateIntakeUser({ email: lead.email, phone: lead.phone })
  if (!user) return
  try {
    await prisma.intakeLead.update({ where: { id: lead.id }, data: { userId: user.id } })
  } catch (error) {
    logger.warn('Failed to link intake lead to account', { leadId: lead.id, error })
  }
}
