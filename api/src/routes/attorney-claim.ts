/**
 * Yelp-style attorney profile claiming.
 *
 * Public flow (token = the secret, no auth required):
 *   POST /v1/attorney-claim/start      { token }                       -> masked profile + methods
 *   POST /v1/attorney-claim/send-code  { token, method }               -> emails/texts an OTP
 *   POST /v1/attorney-claim/verify     { token, code } | { token, method:'bar_number', barNumber }
 *   POST /v1/attorney-claim/complete   { token, password, firstName, lastName, email? }
 *
 * Admin:
 *   POST /v1/attorney-claim/invite     { attorneyId }                  -> create claim + send invite
 *
 * New Prisma model (ProfileClaim) and Attorney claim columns require a
 * `prisma db push` + `prisma generate`; until then they are accessed via
 * `(prisma as any)`, matching the existing codebase pattern.
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, requireRole, generateToken } from '../lib/auth'
import { sendSms } from '../lib/sms'
import {
  CLAIM_CODE_TTL_MINUTES,
  CLAIM_INVITE_TTL_DAYS,
  CLAIM_MAX_CODE_ATTEMPTS,
  claimUrl,
  generateClaimToken,
  generateOtpCode,
  hashCode,
  maskEmail,
  maskPhone,
  normalizeBarNumber,
  sendClaimEmail,
  verifyCode,
} from '../lib/claims'

const router = Router()
const db = prisma as any

type ClaimRecord = {
  id: string
  attorneyId: string
  token: string
  email: string | null
  phone: string | null
  method: string | null
  codeHash: string | null
  codeExpiresAt: Date | null
  attempts: number
  status: string
  expiresAt: Date
  meta: string | null
}

async function loadClaim(token: string): Promise<{ claim: ClaimRecord; attorney: any } | null> {
  const claim = (await db.profileClaim.findUnique({ where: { token } })) as ClaimRecord | null
  if (!claim) return null
  const attorney = await prisma.attorney.findUnique({ where: { id: claim.attorneyId } })
  if (!attorney) return null
  return { claim, attorney }
}

function isExpired(date: Date | null | undefined): boolean {
  return !date || date.getTime() < Date.now()
}

// ---------------------------------------------------------------------------
// Admin: create a claim invite and email it to the attorney on file.
// ---------------------------------------------------------------------------
const InviteSchema = z.object({ attorneyId: z.string().min(1) })

router.post('/invite', authMiddleware, requireRole(['admin']), async (req, res) => {
  const parsed = InviteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
  }

  const attorney = await prisma.attorney.findUnique({ where: { id: parsed.data.attorneyId } })
  if (!attorney) return res.status(404).json({ error: 'Attorney not found' })
  if ((attorney as any).claimStatus === 'claimed') {
    return res.status(409).json({ error: 'This profile has already been claimed' })
  }
  if (!attorney.email) {
    return res.status(422).json({ error: 'Attorney has no email on file to send an invite to' })
  }

  const token = generateClaimToken()
  const expiresAt = new Date(Date.now() + CLAIM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.profileClaim.create({
    data: {
      attorneyId: attorney.id,
      token,
      email: attorney.email,
      phone: attorney.phone,
      status: 'sent',
      expiresAt,
    },
  })

  const url = claimUrl(token)
  const sent = await sendClaimEmail({
    to: attorney.email,
    subject: 'Claim your CaseIQ attorney profile',
    body: [
      `Hi ${attorney.name},`,
      '',
      'Your firm already has a profile on CaseIQ. Claim it to manage your details, receive matched cases, and respond to clients.',
      '',
      `Claim your profile: ${url}`,
      '',
      `This link expires in ${CLAIM_INVITE_TTL_DAYS} days. If this isn't you, you can ignore this email.`,
    ].join('\n'),
  })

  logger.info('Claim invite created', { attorneyId: attorney.id, emailSent: sent })
  return res.json({
    ok: true,
    emailSent: sent,
    // Surface the URL in non-production so it can be tested without a mail provider.
    claimUrl: process.env.NODE_ENV === 'production' ? undefined : url,
  })
})

// ---------------------------------------------------------------------------
// Start: validate token, return a masked preview + available methods.
// ---------------------------------------------------------------------------
const StartSchema = z.object({ token: z.string().min(1) })

router.post('/start', async (req, res) => {
  const parsed = StartSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' })

  const found = await loadClaim(parsed.data.token)
  if (!found) return res.status(404).json({ error: 'Invalid or expired claim link' })
  const { claim, attorney } = found

  if (claim.status === 'completed' || (attorney as any).claimStatus === 'claimed') {
    return res.status(409).json({ error: 'This profile has already been claimed' })
  }
  if (isExpired(claim.expiresAt)) {
    await db.profileClaim.update({ where: { id: claim.id }, data: { status: 'expired' } })
    return res.status(410).json({ error: 'This claim link has expired' })
  }

  const methods: string[] = []
  if (attorney.email) methods.push('email')
  if (attorney.phone) methods.push('sms')
  methods.push('bar_number')

  const firm = attorney.lawFirmId
    ? await prisma.lawFirm.findUnique({
        where: { id: attorney.lawFirmId },
        select: { name: true, city: true, state: true },
      })
    : null

  return res.json({
    profile: {
      name: attorney.name,
      firmName: firm?.name ?? null,
      city: firm?.city ?? null,
      state: firm?.state ?? null,
      maskedEmail: maskEmail(attorney.email),
      maskedPhone: maskPhone(attorney.phone),
    },
    methods,
    verified: claim.status === 'verified',
  })
})

// ---------------------------------------------------------------------------
// Send code: generate an OTP and deliver it via email or SMS.
// ---------------------------------------------------------------------------
const SendCodeSchema = z.object({
  token: z.string().min(1),
  method: z.enum(['email', 'sms']),
})

router.post('/send-code', async (req, res) => {
  const parsed = SendCodeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' })

  const found = await loadClaim(parsed.data.token)
  if (!found) return res.status(404).json({ error: 'Invalid or expired claim link' })
  const { claim, attorney } = found

  if (claim.status === 'completed') return res.status(409).json({ error: 'Already claimed' })
  if (isExpired(claim.expiresAt)) return res.status(410).json({ error: 'Claim link expired' })

  const destination = parsed.data.method === 'email' ? attorney.email : attorney.phone
  if (!destination) {
    return res.status(422).json({ error: `No ${parsed.data.method} on file for this profile` })
  }

  const code = generateOtpCode()
  const codeHash = await hashCode(code)
  const codeExpiresAt = new Date(Date.now() + CLAIM_CODE_TTL_MINUTES * 60 * 1000)
  await db.profileClaim.update({
    where: { id: claim.id },
    data: { method: parsed.data.method, codeHash, codeExpiresAt, attempts: 0 },
  })

  let delivered = false
  const message = `Your CaseIQ profile claim code is ${code}. It expires in ${CLAIM_CODE_TTL_MINUTES} minutes.`
  if (parsed.data.method === 'email') {
    delivered = await sendClaimEmail({
      to: destination,
      subject: 'Your CaseIQ verification code',
      body: message,
    })
  } else {
    delivered = await sendSms(destination, message)
  }

  return res.json({
    ok: true,
    delivered,
    sentTo: parsed.data.method === 'email' ? maskEmail(destination) : maskPhone(destination),
    // Dev convenience only — never expose the code in production.
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  })
})

// ---------------------------------------------------------------------------
// Verify: check OTP, or accept a matching state bar number.
// ---------------------------------------------------------------------------
const VerifySchema = z.union([
  z.object({ token: z.string().min(1), code: z.string().min(4).max(8) }),
  z.object({ token: z.string().min(1), method: z.literal('bar_number'), barNumber: z.string().min(2) }),
])

router.post('/verify', async (req, res) => {
  const parsed = VerifySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' })

  const found = await loadClaim(parsed.data.token)
  if (!found) return res.status(404).json({ error: 'Invalid or expired claim link' })
  const { claim, attorney } = found

  if (claim.status === 'completed') return res.status(409).json({ error: 'Already claimed' })
  if (isExpired(claim.expiresAt)) return res.status(410).json({ error: 'Claim link expired' })

  // Bar-number path: compare against the value we hold on the attorney profile.
  if ('barNumber' in parsed.data) {
    const profile = await prisma.attorneyProfile.findUnique({ where: { attorneyId: attorney.id } })
    const onFile = normalizeBarNumber((profile as any)?.stateBarNumber ?? (attorney as any).stateBarNumber)
    const provided = normalizeBarNumber(parsed.data.barNumber)
    if (!onFile) {
      // No bar number on file to compare → route to manual review rather than auto-approve.
      await db.profileClaim.update({
        where: { id: claim.id },
        data: { method: 'bar_number', status: 'sent', meta: JSON.stringify({ pendingManualReview: true, provided }) },
      })
      return res.status(202).json({ verified: false, manualReview: true })
    }
    if (onFile !== provided) return res.status(401).json({ error: 'Bar number does not match our records' })
    await db.profileClaim.update({
      where: { id: claim.id },
      data: { method: 'bar_number', status: 'verified', verifiedAt: new Date() },
    })
    return res.json({ verified: true })
  }

  // OTP path.
  if (claim.attempts >= CLAIM_MAX_CODE_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' })
  }
  if (isExpired(claim.codeExpiresAt)) {
    return res.status(410).json({ error: 'Code expired. Request a new one.' })
  }
  const ok = await verifyCode(parsed.data.code, claim.codeHash)
  if (!ok) {
    await db.profileClaim.update({ where: { id: claim.id }, data: { attempts: { increment: 1 } } })
    return res.status(401).json({ error: 'Incorrect code' })
  }
  await db.profileClaim.update({
    where: { id: claim.id },
    data: { status: 'verified', verifiedAt: new Date(), codeHash: null },
  })
  return res.json({ verified: true })
})

// ---------------------------------------------------------------------------
// Complete: create the login User and link it to the existing Attorney.
// ---------------------------------------------------------------------------
const CompleteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().email()
  ).optional(),
})

router.post('/complete', async (req, res) => {
  const parsed = CompleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
  }

  const found = await loadClaim(parsed.data.token)
  if (!found) return res.status(404).json({ error: 'Invalid or expired claim link' })
  const { claim, attorney } = found

  if (claim.status === 'completed' || (attorney as any).claimStatus === 'claimed') {
    return res.status(409).json({ error: 'This profile has already been claimed' })
  }
  if (claim.status !== 'verified') {
    return res.status(403).json({ error: 'Please verify your identity before finishing.' })
  }

  // Resolve the account email: prefer the attorney's on-file email, else require one.
  const email = (attorney.email || parsed.data.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(422).json({ error: 'An email address is required to create your login.', code: 'EMAIL_REQUIRED' })
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return res.status(409).json({
      error: 'An account already exists for this email. Please sign in instead.',
      code: 'ACCOUNT_EXISTS',
    })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: attorney.phone ?? null,
        emailVerified: true, // ownership proven via the claim flow
        isActive: true,
        role: 'attorney',
      },
    })

    // Ensure the attorney email matches the user email so dashboard lookups resolve.
    await (tx as any).attorney.update({
      where: { id: attorney.id },
      data: {
        email,
        isVerified: true,
        claimStatus: 'claimed',
        claimedByUserId: user.id,
        claimedAt: new Date(),
      },
    })

    const existingProfile = await tx.attorneyProfile.findUnique({ where: { attorneyId: attorney.id } })
    if (!existingProfile) {
      await tx.attorneyProfile.create({
        data: {
          attorneyId: attorney.id,
          specialties: attorney.specialties ?? null,
          firmName: null,
          averageRating: attorney.averageRating ?? 0,
          totalReviews: attorney.totalReviews ?? 0,
        },
      })
    }

    // Link the user to the firm if the attorney already belongs to one.
    if (attorney.lawFirmId) {
      await (tx as any).firmMember.upsert({
        where: { lawFirmId_userId: { lawFirmId: attorney.lawFirmId, userId: user.id } },
        update: { attorneyId: attorney.id, role: 'firm_admin', status: 'active', joinedAt: new Date() },
        create: {
          lawFirmId: attorney.lawFirmId,
          userId: user.id,
          attorneyId: attorney.id,
          role: 'firm_admin',
          title: 'Firm Admin',
          status: 'active',
          joinedAt: new Date(),
        },
      })
    }

    await (tx as any).profileClaim.update({
      where: { id: claim.id },
      data: { status: 'completed', completedAt: new Date(), claimedByUserId: user.id },
    })

    return { user }
  })

  const token = generateToken(result.user.id)
  logger.info('Attorney profile claimed', { attorneyId: attorney.id, userId: result.user.id })

  return res.status(201).json({
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
    },
    attorney: { id: attorney.id, name: attorney.name },
  })
})

export default router
