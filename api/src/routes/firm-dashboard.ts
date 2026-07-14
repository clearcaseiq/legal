import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { sendTransactionalEmail } from '../lib/claims'
import { computeMarketplacePerformance, computeMarketplacePerformanceByAttorney } from '../lib/marketplace-performance'
import { createNotificationEvent } from '../lib/platform-notifications'
import { slugify } from '../lib/booking-slots'
import { createEnvelopeForLead } from '../lib/esign/esign-service'
import { listESignatureProviders } from '../lib/esign'
import { resolveTemplateTokens, fillTemplateTokens, renderTemplateBodyPdf } from '../lib/esign/firm-template-doc'
import { applyFirmWorkflowToCase } from '../lib/case-workflow'
import {
  TIME_ROLES,
  TIME_ROLE_VALUES,
  ACTIVITY_TYPES,
  serializeTimeEntry,
} from '../lib/time-tracking'

const router: Router = Router()

// Firm invites are single-use, expiring "set password" links. We reuse the
// password-reset token model (only a SHA-256 hash is stored) but give invites a
// longer, 7-day window since a new hire may not act immediately.
const FIRM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashInviteToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// Best-effort invite email for a firm member. Never throws so it can't fail the
// member-creation request (#226).
//   - needsPassword (new / passwordless account): mint a set-password token and
//     email a tokenized link. Clicking it verifies the email AND sets a password
//     in one step (handled by POST /auth/reset-password), then activates the
//     pending membership.
//   - otherwise (existing account with a password): just a notice + sign-in link.
async function sendFirmMemberInvite(params: {
  userId: string
  to: string
  firstName?: string | null
  firmName?: string | null
  role: string
  needsPassword: boolean
}): Promise<boolean> {
  try {
    if (!params.to) return false
    const base = (process.env.WEB_URL || 'https://www.clearcaseiq.com').replace(/\/$/, '')
    const roleLabel = params.role.replace(/_/g, ' ')
    const firm = params.firmName || 'your law firm'

    if (params.needsPassword) {
      // Invalidate any outstanding tokens, then mint a fresh single-use one.
      await prisma.passwordResetToken.deleteMany({ where: { userId: params.userId, usedAt: null } })
      const rawToken = crypto.randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({
        data: {
          userId: params.userId,
          tokenHash: hashInviteToken(rawToken),
          expiresAt: new Date(Date.now() + FIRM_INVITE_TTL_MS),
        },
      })
      const link = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`
      const body = [
        `Hi ${params.firstName || 'there'},`,
        '',
        `You've been invited to join ${firm} on ClearCaseIQ as a ${roleLabel}.`,
        '',
        'Click the link below to verify your email and set your password. This link expires in 7 days and can be used once.',
        '',
        link,
        '',
        'If you were not expecting this, you can safely ignore this email.',
        '',
        '— The ClearCaseIQ team',
      ].join('\n')
      return await sendTransactionalEmail({ to: params.to, subject: `You're invited to join ${firm} on ClearCaseIQ`, body })
    }

    const body = [
      `Hi ${params.firstName || 'there'},`,
      '',
      `You've been added to ${firm} on ClearCaseIQ as a ${roleLabel}.`,
      '',
      'Sign in to get started:',
      `${base}/login`,
      '',
      'If you were not expecting this, you can ignore this email.',
      '',
      '— The ClearCaseIQ team',
    ].join('\n')
    return await sendTransactionalEmail({ to: params.to, subject: `You've been added to ${firm} on ClearCaseIQ`, body })
  } catch (error) {
    logger.error('Failed to send firm member invite email', { error: error instanceof Error ? error.message : error })
    return false
  }
}

const FIRM_ROLE_PERMISSIONS: Record<string, string[]> = {
  firm_admin: [
    'manage_users',
    'manage_routing',
    'manage_billing',
    'view_all_cases',
    'view_analytics',
    'assign_cases',
    'manage_subscriptions'
  ],
  attorney: [
    'review_cases',
    'accept_cases',
    'decline_cases',
    'message_plaintiffs',
    'generate_demands',
    'manage_assigned_cases',
    'assign_cases'
  ],
  case_manager: [
    'upload_records',
    'manage_documents',
    'message_plaintiffs',
    'request_evidence',
    'manage_assigned_cases'
  ],
  intake_specialist: [
    'review_new_leads',
    'schedule_consultations',
    'request_records'
  ],
  paralegal: [
    'view_assigned_cases',
    'manage_chronology',
    'upload_documents'
  ],
  billing_admin: [
    'manage_invoices',
    'view_subscriptions',
    'process_payments'
  ],
  legal_assistant: [
    'view_assigned_cases',
    'manage_documents',
    'schedule_consultations'
  ],
  demand_writer: [
    'view_assigned_cases',
    'generate_demands',
    'manage_documents'
  ],
  medical_records: [
    'view_assigned_cases',
    'upload_records',
    'request_records'
  ]
}

const CASE_ASSIGNMENT_ROLES = [
  'lead_attorney',
  'secondary_attorney',
  'case_manager',
  'paralegal',
  'intake_owner',
  'billing_owner',
  'demand_writer',
  'medical_records'
]

const roleHasPermission = (role: string, permission: string) =>
  (FIRM_ROLE_PERMISSIONS[role] || []).includes(permission)

function slugifyFirmName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'law-firm'
}

async function ensureUniqueFirmSlug(base: string) {
  let candidate = base
  let counter = 2

  while (await (prisma as any).lawFirm.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${counter}`
    counter += 1
  }

  return candidate
}

async function ensureAttorneyFirmContext(user: any, attorney: any) {
  if (!attorney?.id) return null

  const attorneyProfile = await prisma.attorneyProfile.findUnique({
    where: { attorneyId: attorney.id }
  }).catch(() => null)
  const firmName = String(attorneyProfile?.firmName || attorney.name || '').trim()
  if (!firmName) return null

  let firm = await (prisma as any).lawFirm.findFirst({
    where: { name: firmName }
  })

  if (!firm) {
    const slug = await ensureUniqueFirmSlug(slugifyFirmName(firmName))
    firm = await (prisma as any).lawFirm.create({
      data: {
        name: firmName,
        slug,
        primaryEmail: attorney.email || user?.email || null,
        phone: attorney.phone || user?.phone || null,
        website: attorneyProfile?.firmWebsite || null
      }
    })
  }

  await prisma.attorney.update({
    where: { id: attorney.id },
    data: { lawFirmId: firm.id }
  })

  let member = null
  if (user?.id) {
    member = await (prisma as any).firmMember.upsert({
      where: {
        lawFirmId_userId: {
          lawFirmId: firm.id,
          userId: user.id
        }
      },
      update: {
        attorneyId: attorney.id,
        role: 'firm_admin',
        status: 'active',
        joinedAt: new Date()
      },
      create: {
        lawFirmId: firm.id,
        userId: user.id,
        attorneyId: attorney.id,
        role: 'firm_admin',
        title: 'Firm Admin',
        status: 'active',
        joinedAt: new Date()
      },
      include: { lawFirm: true, user: true, office: true }
    })
  }

  return {
    user,
    attorney: { ...attorney, lawFirmId: firm.id },
    firm,
    lawFirmId: firm.id,
    role: 'firm_admin',
    member,
    permissions: FIRM_ROLE_PERMISSIONS.firm_admin
  }
}

async function getFirmContext(req: any) {
  if (!req.user?.email) {
    return null
  }

  const email = String(req.user.email).toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  const attorney: any = await prisma.attorney.findFirst({ where: { email } })
  const firmMember = user
    ? await (prisma as any).firmMember.findFirst({
        where: { userId: user.id, status: 'active' },
        include: { lawFirm: true, user: true, office: true }
      }).catch(() => null)
    : null

  if (firmMember?.lawFirmId) {
    return {
      user,
      attorney,
      firm: firmMember.lawFirm,
      lawFirmId: firmMember.lawFirmId,
      role: firmMember.role || 'intake_specialist',
      member: firmMember,
      permissions: [
        ...(FIRM_ROLE_PERMISSIONS[firmMember.role] || []),
        ...parseJsonArray(firmMember.permissions)
      ]
    }
  }

  if (attorney?.lawFirmId) {
    const firm = await (prisma as any).lawFirm.findUnique({
      where: { id: attorney.lawFirmId }
    })
    return {
      user,
      attorney,
      firm,
      lawFirmId: attorney.lawFirmId,
      role: 'firm_admin',
      member: null,
      permissions: FIRM_ROLE_PERMISSIONS.firm_admin
    }
  }

  const createdContext = await ensureAttorneyFirmContext(user, attorney)
  if (createdContext) {
    return createdContext
  }

  return null
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function requireFirmPermission(context: Awaited<ReturnType<typeof getFirmContext>>, permission: string) {
  return Boolean(context && (context.permissions.includes(permission) || roleHasPermission(context.role, permission)))
}

router.post('/offices', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_routing')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm offices' })
    }

    const { name, city, state, address, phone, countiesServed, languages, practiceAreas, capacity } = req.body || {}
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Office name is required' })
    }

    const office = await (prisma as any).firmOffice.create({
      data: {
        lawFirmId: context.lawFirmId,
        name: name.trim().slice(0, 120),
        city: typeof city === 'string' ? city.trim().slice(0, 120) : null,
        state: typeof state === 'string' ? state.trim().slice(0, 120) : null,
        address: typeof address === 'string' ? address.trim().slice(0, 255) : null,
        phone: typeof phone === 'string' ? phone.trim().slice(0, 40) : null,
        countiesServed: Array.isArray(countiesServed) ? JSON.stringify(countiesServed) : null,
        languages: Array.isArray(languages) ? JSON.stringify(languages) : null,
        practiceAreas: Array.isArray(practiceAreas) ? JSON.stringify(practiceAreas) : null,
        capacity: Number.isFinite(Number(capacity)) ? Math.max(0, Math.floor(Number(capacity))) : null
      }
    })

    res.status(201).json({ office })
  } catch (error: any) {
    logger.error('Failed to create firm office', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to create firm office' })
  }
})

router.post('/teams', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm teams' })
    }

    const { name, teamType = 'case_team', description, officeId } = req.body || {}
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Team name is required' })
    }

    const team = await (prisma as any).firmTeam.create({
      data: {
        lawFirmId: context.lawFirmId,
        officeId: typeof officeId === 'string' && officeId ? officeId : null,
        name: name.trim().slice(0, 120),
        teamType,
        description: typeof description === 'string' ? description.trim().slice(0, 500) : null
      }
    })

    res.status(201).json({ team })
  } catch (error: any) {
    logger.error('Failed to create firm team', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to create firm team' })
  }
})

// Add (or update the role of) a firm member on a team. Pass role 'lead' | 'member'.
router.post('/teams/:teamId/members', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm teams' })
    }

    const { teamId } = req.params
    const { firmMemberId, role = 'member' } = req.body || {}
    if (!firmMemberId || typeof firmMemberId !== 'string') {
      return res.status(400).json({ error: 'firmMemberId is required' })
    }
    const teamRole = role === 'lead' ? 'lead' : 'member'

    const team = await (prisma as any).firmTeam.findFirst({
      where: { id: teamId, lawFirmId: context.lawFirmId },
      select: { id: true }
    })
    if (!team) {
      return res.status(404).json({ error: 'Team not found in this firm' })
    }

    const firmMember = await (prisma as any).firmMember.findFirst({
      where: { id: firmMemberId, lawFirmId: context.lawFirmId },
      select: { id: true, userId: true }
    })
    if (!firmMember) {
      return res.status(400).json({ error: 'Member not found in this firm' })
    }

    const link = await (prisma as any).firmTeamMember.upsert({
      where: { teamId_firmMemberId: { teamId, firmMemberId } },
      update: { role: teamRole },
      create: { teamId, firmMemberId, userId: firmMember.userId, role: teamRole }
    })

    res.status(201).json({ member: link })
  } catch (error: any) {
    logger.error('Failed to add team member', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to add team member' })
  }
})

// Remove a firm member from a team.
router.delete('/teams/:teamId/members/:firmMemberId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm teams' })
    }

    const { teamId, firmMemberId } = req.params
    const team = await (prisma as any).firmTeam.findFirst({
      where: { id: teamId, lawFirmId: context.lawFirmId },
      select: { id: true }
    })
    if (!team) {
      return res.status(404).json({ error: 'Team not found in this firm' })
    }

    await (prisma as any).firmTeamMember.deleteMany({ where: { teamId, firmMemberId } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to remove team member', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to remove team member' })
  }
})

router.post('/members', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm users' })
    }

    const {
      email,
      firstName,
      lastName,
      role = 'intake_specialist',
      title,
      officeId,
      specialties = [],
      venues = [],
      jurisdictions = []
    } = req.body || {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'User email is required' })
    }
    if (!FIRM_ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ error: 'Unsupported firm role' })
    }

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        firstName: typeof firstName === 'string' && firstName.trim() ? firstName.trim() : undefined,
        lastName: typeof lastName === 'string' && lastName.trim() ? lastName.trim() : undefined,
        role: role === 'attorney' ? 'attorney' : 'staff'
      },
      create: {
        email: normalizedEmail,
        firstName: typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Team',
        lastName: typeof lastName === 'string' && lastName.trim() ? lastName.trim() : 'Member',
        role: role === 'attorney' ? 'attorney' : 'staff'
      }
    })

    let attorney: any = null
    if (role === 'attorney') {
      const parsedSpecialties = Array.isArray(specialties) ? specialties.filter(Boolean) : []
      const parsedVenues = Array.isArray(venues) ? venues.filter(Boolean) : []
      attorney = await prisma.attorney.findUnique({ where: { email: normalizedEmail } })
      if (attorney?.lawFirmId && attorney.lawFirmId !== context.lawFirmId) {
        return res.status(409).json({ error: 'Attorney already belongs to another law firm' })
      }
      attorney = attorney
        ? await prisma.attorney.update({
            where: { id: attorney.id },
            data: {
              lawFirmId: context.lawFirmId,
              specialties: JSON.stringify(parsedSpecialties),
              venues: JSON.stringify(parsedVenues)
            }
          })
        : await prisma.attorney.create({
            data: {
              name: `${user.firstName} ${user.lastName}`.trim(),
              email: normalizedEmail,
              lawFirmId: context.lawFirmId,
              specialties: JSON.stringify(parsedSpecialties),
              venues: JSON.stringify(parsedVenues)
            }
          })

      await prisma.attorneyProfile.upsert({
        where: { attorneyId: attorney.id },
        update: {
          specialties: JSON.stringify(parsedSpecialties),
          jurisdictions: JSON.stringify(Array.isArray(jurisdictions) ? jurisdictions : [])
        },
        create: {
          attorneyId: attorney.id,
          bio: '',
          specialties: JSON.stringify(parsedSpecialties),
          languages: JSON.stringify(['English']),
          yearsExperience: 0,
          totalCases: 0,
          totalSettlements: 0,
          averageSettlement: 0,
          successRate: 0,
          verifiedVerdicts: JSON.stringify([]),
          totalReviews: 0,
          averageRating: 0,
          jurisdictions: JSON.stringify(Array.isArray(jurisdictions) ? jurisdictions : [])
        }
      })
    }

    // A member with no password hasn't accepted yet: keep them "invited"
    // (pending) until they set a password via the emailed link. Members who
    // already have an account go straight to "active".
    const needsPassword = !user.passwordHash
    const memberStatus = needsPassword ? 'invited' : 'active'

    const member = await (prisma as any).firmMember.upsert({
      where: {
        lawFirmId_userId: {
          lawFirmId: context.lawFirmId,
          userId: user.id
        }
      },
      update: {
        role,
        title: typeof title === 'string' ? title.trim() : null,
        officeId: typeof officeId === 'string' && officeId ? officeId : null,
        attorneyId: attorney?.id || null,
        status: memberStatus,
        invitedAt: needsPassword ? new Date() : undefined,
        joinedAt: needsPassword ? undefined : new Date()
      },
      create: {
        lawFirmId: context.lawFirmId,
        userId: user.id,
        attorneyId: attorney?.id || null,
        officeId: typeof officeId === 'string' && officeId ? officeId : null,
        role,
        title: typeof title === 'string' ? title.trim() : null,
        status: memberStatus,
        invitedAt: new Date(),
        joinedAt: needsPassword ? null : new Date()
      }
    })

    // Look up the firm name for a friendlier invite, then send best-effort.
    let firmName: string | null = null
    try {
      const firm = await prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { name: true } })
      firmName = firm?.name ?? null
    } catch { /* non-fatal */ }
    void sendFirmMemberInvite({ userId: user.id, to: normalizedEmail, firstName: user.firstName, firmName, role, needsPassword })

    res.status(201).json({ member, user, attorney })
  } catch (error: any) {
    logger.error('Failed to add firm member', { error: error?.message || String(error), stack: error?.stack })
    res.status(500).json({
      error: 'Failed to add firm member',
      // Surface the real reason outside production so QA/staging sees the actual
      // failure (e.g. a missing table) instead of an opaque 500 (#226).
      ...(process.env.NODE_ENV !== 'production'
        ? { detail: error?.message || String(error) }
        : {}),
    })
  }
})

// Update an existing firm member — currently used to move an attorney or staff
// member to a particular office (officeId). Pass officeId: null to unassign.
router.patch('/members/:memberId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm users' })
    }

    const { memberId } = req.params
    const member = await (prisma as any).firmMember.findFirst({
      where: { id: memberId, lawFirmId: context.lawFirmId },
      select: { id: true }
    })
    if (!member) {
      return res.status(404).json({ error: 'Member not found in this firm' })
    }

    const data: Record<string, any> = {}
    if ('officeId' in (req.body || {})) {
      const { officeId } = req.body
      if (officeId === null || officeId === '') {
        data.officeId = null
      } else if (typeof officeId === 'string') {
        // Only allow offices that belong to this firm.
        const office = await (prisma as any).firmOffice.findFirst({
          where: { id: officeId, lawFirmId: context.lawFirmId },
          select: { id: true }
        })
        if (!office) {
          return res.status(400).json({ error: 'Office not found in this firm' })
        }
        data.officeId = office.id
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No supported fields to update' })
    }

    const updated = await (prisma as any).firmMember.update({
      where: { id: memberId },
      data,
      select: { id: true, officeId: true, office: { select: { id: true, name: true } } }
    })

    res.json({ member: updated })
  } catch (error: any) {
    logger.error('Failed to update firm member', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to update firm member' })
  }
})

// Resend a pending member's invitation: re-mint a set-password token and email
// a fresh link. Only valid while the member hasn't set a password yet.
router.post('/members/:memberId/resend-invite', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm users' })
    }

    const { memberId } = req.params
    const member = await (prisma as any).firmMember.findFirst({
      where: { id: memberId, lawFirmId: context.lawFirmId },
      include: { user: true }
    })
    if (!member) {
      return res.status(404).json({ error: 'Member not found in this firm' })
    }
    if (!member.user?.email) {
      return res.status(400).json({ error: 'This member has no email on file' })
    }
    if (member.user.passwordHash) {
      return res.status(400).json({ error: 'This member has already activated their account.' })
    }

    let firmName: string | null = null
    try {
      const firm = await prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { name: true } })
      firmName = firm?.name ?? null
    } catch { /* non-fatal */ }

    const emailSent = await sendFirmMemberInvite({
      userId: member.userId,
      to: member.user.email,
      firstName: member.user.firstName,
      firmName,
      role: member.role,
      needsPassword: true
    })

    // Keep the member pending and refresh invitedAt so the UI reflects the resend.
    await (prisma as any).firmMember.update({
      where: { id: member.id },
      data: { status: 'invited', invitedAt: new Date() }
    })

    res.json({ ok: true, emailSent })
  } catch (error: any) {
    logger.error('Failed to resend firm member invite', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to resend invitation' })
  }
})

router.post('/cases/:assessmentId/assignments', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'assign_cases')) {
      return res.status(403).json({ error: 'You do not have permission to assign cases' })
    }

    const { assessmentId } = req.params
    const { role, assignedUserId, assignedAttorneyId, notes, dueDate } = req.body || {}
    if (!CASE_ASSIGNMENT_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Unsupported case assignment role' })
    }
    if (!assignedUserId && !assignedAttorneyId) {
      return res.status(400).json({ error: 'Select a firm user or attorney to assign' })
    }

    const assessment: any = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        leadSubmission: {
          include: { assignedAttorney: true }
        },
        introductions: {
          include: { attorney: true }
        }
      }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    const belongsToFirm =
      assessment.lawFirmId === context.lawFirmId ||
      assessment.leadSubmission?.assignedAttorney?.lawFirmId === context.lawFirmId ||
      assessment.introductions?.some((intro: any) => intro.attorney?.lawFirmId === context.lawFirmId)

    if (!belongsToFirm) {
      return res.status(403).json({ error: 'This case does not belong to your firm' })
    }

    if (assignedUserId) {
      const member = await (prisma as any).firmMember.findFirst({
        where: { lawFirmId: context.lawFirmId, userId: assignedUserId, status: 'active' }
      })
      if (!member) {
        return res.status(400).json({ error: 'Assigned user is not an active member of your firm' })
      }
    }
    if (assignedAttorneyId) {
      const attorney = await prisma.attorney.findFirst({
        where: { id: assignedAttorneyId, lawFirmId: context.lawFirmId }
      })
      if (!attorney) {
        return res.status(400).json({ error: 'Assigned attorney is not in your firm' })
      }
    }

    await (prisma as any).assessment.update({
      where: { id: assessmentId },
      data: { lawFirmId: context.lawFirmId }
    })

    // Auto-apply the firm's standard workflow when a case first joins the firm.
    // Idempotent + best-effort (no-op if no applied workflow or already applied).
    try {
      await applyFirmWorkflowToCase({
        assessmentId,
        lawFirmId: context.lawFirmId,
        appliedById: context.user?.id || null,
      })
    } catch (wfErr: any) {
      logger.warn('Auto-apply firm workflow on assignment failed', { error: wfErr?.message })
    }

    // A role has a single active owner. Deactivate any prior active assignee for
    // this (case, role) that isn't the person we're assigning now, so downstream
    // team-caseload aggregation doesn't double-count superseded assignments.
    await (prisma as any).firmCaseAssignment.updateMany({
      where: {
        assessmentId,
        role,
        status: 'active',
        NOT: {
          assignedUserId: assignedUserId || null,
          assignedAttorneyId: assignedAttorneyId || null
        }
      },
      data: { status: 'inactive' }
    })

    const existing = await (prisma as any).firmCaseAssignment.findFirst({
      where: {
        assessmentId,
        role,
        assignedUserId: assignedUserId || null,
        assignedAttorneyId: assignedAttorneyId || null
      }
    })
    const assignment = existing
      ? await (prisma as any).firmCaseAssignment.update({
          where: { id: existing.id },
          data: {
            lawFirmId: context.lawFirmId,
            status: 'active',
            notes: typeof notes === 'string' ? notes.trim() : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedById: context.user?.id || null
          }
        })
      : await (prisma as any).firmCaseAssignment.create({
          data: {
            lawFirmId: context.lawFirmId,
            assessmentId,
            role,
            assignedUserId: assignedUserId || null,
            assignedAttorneyId: assignedAttorneyId || null,
            status: 'active',
            notes: typeof notes === 'string' ? notes.trim() : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedById: context.user?.id || null
          }
        })

    res.status(201).json({ assignment })
  } catch (error: any) {
    logger.error('Failed to assign firm case', { error: error?.message || String(error), stack: error?.stack })
    res.status(500).json({ error: 'Failed to assign firm case' })
  }
})

// Reassign a case to a different office (or unassign with officeId: null). Only
// offices that belong to the firm are accepted. Drives office capacity balancing.
router.patch('/cases/:assessmentId/office', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'assign_cases')) {
      return res.status(403).json({ error: 'You do not have permission to reassign cases' })
    }

    const { assessmentId } = req.params
    const { officeId } = req.body || {}

    const assessment: any = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { leadSubmission: { include: { assignedAttorney: true } }, introductions: { include: { attorney: true } } },
    })
    if (!assessment) return res.status(404).json({ error: 'Case not found' })

    const belongsToFirm =
      assessment.lawFirmId === context.lawFirmId ||
      assessment.leadSubmission?.assignedAttorney?.lawFirmId === context.lawFirmId ||
      assessment.introductions?.some((intro: any) => intro.attorney?.lawFirmId === context.lawFirmId)
    if (!belongsToFirm) return res.status(403).json({ error: 'This case does not belong to your firm' })

    let resolvedOfficeId: string | null = null
    if (typeof officeId === 'string' && officeId) {
      const office = await (prisma as any).firmOffice.findFirst({
        where: { id: officeId, lawFirmId: context.lawFirmId },
        select: { id: true },
      })
      if (!office) return res.status(400).json({ error: 'Office not found in this firm' })
      resolvedOfficeId = office.id
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { lawFirmId: context.lawFirmId, officeId: resolvedOfficeId },
    })

    res.json({ assessmentId, officeId: resolvedOfficeId })
  } catch (error: any) {
    logger.error('Failed to reassign case office', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to reassign case office' })
  }
})

// Firm-wide contacts directory — every case contact across all attorneys in the
// firm (the single-attorney version lives at attorney-dashboard/case-contacts).
router.get('/case-contacts', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'view_all_cases')) {
      return res.status(403).json({ error: 'You do not have permission to view firm-wide contacts' })
    }

    const firmAttorneys = await prisma.attorney.findMany({
      where: { lawFirmId: context.lawFirmId },
      select: { id: true }
    })
    const attorneyIds = firmAttorneys.map((a) => a.id)
    if (attorneyIds.length === 0) {
      return res.json([])
    }

    const manual = await prisma.caseContact.findMany({
      where: { attorneyId: { in: attorneyIds } },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        attorney: { select: { id: true, name: true } },
        lead: {
          select: {
            id: true,
            assessment: { select: { claimType: true, venueCounty: true, venueState: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const contacts: any[] = manual.map((c) => ({ ...c, source: 'manual' }))

    // Auto-derive clients (from the case's user) and adjusters (from recorded
    // insurance details) across every attorney in the firm, mirroring the
    // single-attorney directory so the firm view isn't empty by default.
    const REVEALED = new Set(['contacted', 'consulted', 'retained'])
    const leads = await prisma.leadSubmission.findMany({
      where: { assignedAttorneyId: { in: attorneyIds } },
      select: {
        id: true,
        status: true,
        assignedAttorneyId: true,
        assignedAttorney: { select: { id: true, name: true } },
        assessment: {
          select: {
            claimType: true,
            venueCounty: true,
            venueState: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            insuranceDetails: {
              select: {
                id: true,
                carrierName: true,
                adjusterName: true,
                adjusterEmail: true,
                adjusterPhone: true,
                insuredParty: true,
              },
            },
          },
        },
      },
    })

    const manualKeys = new Set(
      manual.map((c) => `${c.leadId}:${(c.contactType || '').toLowerCase()}:${(c.email || '').toLowerCase()}`)
    )

    for (const lead of leads) {
      const a = lead.assessment
      if (!a) continue
      const leadMeta = { id: lead.id, assessment: { claimType: a.claimType, venueCounty: a.venueCounty, venueState: a.venueState } }
      const attorney = lead.assignedAttorney ? { id: lead.assignedAttorney.id, name: lead.assignedAttorney.name } : null

      const u = a.user
      if (u && REVEALED.has((lead.status || '').toLowerCase())) {
        const key = `${lead.id}:client:${(u.email || '').toLowerCase()}`
        if (!manualKeys.has(key)) {
          contacts.push({
            id: `client_${lead.id}`,
            leadId: lead.id,
            attorneyId: lead.assignedAttorneyId,
            firstName: u.firstName || null,
            lastName: u.lastName || null,
            email: u.email || null,
            phone: u.phone || null,
            companyName: null,
            companyUrl: null,
            title: 'Client',
            contactType: 'client',
            notes: null,
            createdAt: null,
            updatedAt: null,
            attorney,
            lead: leadMeta,
            source: 'derived',
          })
        }
      }

      for (const ins of a.insuranceDetails || []) {
        if (!ins.adjusterName && !ins.adjusterEmail) continue
        const key = `${lead.id}:adjuster:${(ins.adjusterEmail || '').toLowerCase()}`
        if (manualKeys.has(key)) continue
        const [first, ...rest] = (ins.adjusterName || 'Adjuster').split(' ')
        contacts.push({
          id: `adjuster_${ins.id}`,
          leadId: lead.id,
          attorneyId: lead.assignedAttorneyId,
          firstName: first || null,
          lastName: rest.join(' ') || null,
          email: ins.adjusterEmail || null,
          phone: ins.adjusterPhone || null,
          companyName: ins.carrierName || null,
          companyUrl: null,
          title: ins.insuredParty === 'client' ? 'Adjuster (client policy)' : 'Adjuster',
          contactType: 'adjuster',
          notes: null,
          createdAt: null,
          updatedAt: null,
          attorney,
          lead: leadMeta,
          source: 'derived',
        })
      }
    }

    res.json(contacts)
  } catch (error: any) {
    logger.error('Failed to get firm case contacts', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to get firm case contacts' })
  }
})

// Per-team caseload aggregation: distinct active cases owned by each team's
// members, plus per-office capacity utilization.
router.get('/teams/caseload', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'view_all_cases') && !requireFirmPermission(context, 'view_analytics')) {
      return res.status(403).json({ error: 'You do not have permission to view firm caseload' })
    }

    const [teams, assignments, offices] = await Promise.all([
      (prisma as any).firmTeam.findMany({
        where: { lawFirmId: context.lawFirmId },
        include: {
          members: { include: { firmMember: { select: { userId: true, attorneyId: true } } } }
        }
      }),
      (prisma as any).firmCaseAssignment.findMany({
        where: { lawFirmId: context.lawFirmId, status: 'active' },
        select: { assessmentId: true, assignedUserId: true, assignedAttorneyId: true }
      }),
      (prisma as any).firmOffice.findMany({
        where: { lawFirmId: context.lawFirmId },
        select: {
          id: true,
          name: true,
          capacity: true,
          cases: { select: { id: true, leadSubmission: { select: { status: true } } } }
        }
      })
    ])

    const teamCaseload = (teams as any[]).map((team) => {
      const memberUserIds = new Set<string>()
      const memberAttorneyIds = new Set<string>()
      for (const link of team.members || []) {
        if (link.firmMember?.userId) memberUserIds.add(link.firmMember.userId)
        if (link.firmMember?.attorneyId) memberAttorneyIds.add(link.firmMember.attorneyId)
      }
      const caseIds = new Set<string>()
      for (const a of assignments as any[]) {
        if (
          (a.assignedUserId && memberUserIds.has(a.assignedUserId)) ||
          (a.assignedAttorneyId && memberAttorneyIds.has(a.assignedAttorneyId))
        ) {
          caseIds.add(a.assessmentId)
        }
      }
      return {
        teamId: team.id,
        name: team.name,
        teamType: team.teamType,
        memberCount: (team.members || []).length,
        activeCaseCount: caseIds.size
      }
    })

    // Only count active cases (an attorney has taken them on) toward office
    // utilization — marketplace leads merely routed to the firm ('submitted')
    // or declined/expired ('rejected') are not real caseload.
    const OFFICE_ACTIVE_STATUSES = ['contacted', 'consulted', 'retained']
    const officeUtilization = (offices as any[]).map((office) => {
      const assigned = (office.cases || []).filter((c: any) =>
        OFFICE_ACTIVE_STATUSES.includes(c.leadSubmission?.status)
      ).length
      const capacity = office.capacity ?? null
      return {
        officeId: office.id,
        name: office.name,
        capacity,
        assignedCases: assigned,
        utilization: capacity && capacity > 0 ? Math.round((assigned / capacity) * 100) : null
      }
    })

    res.json({ teams: teamCaseload, offices: officeUtilization })
  } catch (error: any) {
    logger.error('Failed to get firm team caseload', { error: error?.message || String(error) })
    res.status(500).json({ error: 'Failed to get firm team caseload' })
  }
})

// Add an attorney to the current attorney's firm
router.post('/attorneys', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const {
      email,
      name,
      firstName,
      middleName,
      lastName,
      specialties,
      venues,
      jurisdictions,
      officeId
    } = req.body || {}
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Attorney email is required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    const currentAttorney: any = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!currentAttorney) {
      return res.status(404).json({ error: 'Attorney account not found for this user' })
    }

    if (!currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    let attorney = await prisma.attorney.findUnique({
      where: { email: normalizedEmail }
    })

    const parsedSpecialties = Array.isArray(specialties)
      ? specialties.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedVenues = Array.isArray(venues)
      ? venues.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedJurisdictions = Array.isArray(jurisdictions)
      ? jurisdictions.filter((item: any) => item && typeof item.state === 'string' && item.state.trim())
      : parsedVenues.map((state: string) => ({ state }))

    if (parsedSpecialties.length === 0) {
      return res.status(400).json({ error: 'At least one specialty is required' })
    }
    if (parsedVenues.length === 0 && parsedJurisdictions.length === 0) {
      return res.status(400).json({ error: 'At least one jurisdiction is required' })
    }

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof middleName === 'string' ? middleName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : ''
    ].filter(Boolean).join(' ')

    const fallbackName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : derivedName || normalizedEmail

    if (attorney) {
      if (attorney.lawFirmId && attorney.lawFirmId !== currentAttorney.lawFirmId) {
        return res.status(409).json({
          error: 'Attorney already belongs to another law firm'
        })
      }
      attorney = await prisma.attorney.update({
        where: { id: attorney.id },
        data: {
          lawFirmId: currentAttorney.lawFirmId,
          specialties: JSON.stringify(parsedSpecialties),
          venues: JSON.stringify(parsedVenues)
        }
      })
    } else {
      attorney = await prisma.attorney.create({
        data: {
          name: fallbackName,
          email: normalizedEmail,
          specialties: JSON.stringify(parsedSpecialties),
          venues: JSON.stringify(parsedVenues)
        }
      })
      attorney = await prisma.attorney.update({
        where: { id: attorney.id },
        data: { lawFirmId: currentAttorney.lawFirmId }
      })
    }

    await prisma.attorneyProfile.upsert({
      where: { attorneyId: attorney.id },
      update: {
        specialties: JSON.stringify(parsedSpecialties),
        jurisdictions: JSON.stringify(parsedJurisdictions)
      },
      create: {
        attorneyId: attorney.id,
        bio: '',
        specialties: JSON.stringify(parsedSpecialties),
        languages: JSON.stringify(['English']),
        yearsExperience: 0,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        jurisdictions: JSON.stringify(parsedJurisdictions)
      }
    })

    // Only accept an office that actually belongs to this firm; otherwise ignore.
    let resolvedOfficeId: string | null = null
    if (typeof officeId === 'string' && officeId) {
      const office = await (prisma as any).firmOffice.findFirst({
        where: { id: officeId, lawFirmId: currentAttorney.lawFirmId },
        select: { id: true }
      })
      resolvedOfficeId = office?.id || null
    }

    const memberUser = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { role: 'attorney' },
      create: {
        email: normalizedEmail,
        firstName: typeof firstName === 'string' && firstName.trim() ? firstName.trim() : fallbackName.split(' ')[0] || 'Attorney',
        lastName: typeof lastName === 'string' && lastName.trim() ? lastName.trim() : fallbackName.split(' ').slice(1).join(' ') || 'User',
        role: 'attorney'
      }
    })

    // An attorney with no password hasn't accepted yet: keep them "invited"
    // (pending) and email a set-password link. Existing accounts go active.
    const attorneyNeedsPassword = !memberUser.passwordHash
    const attorneyMemberStatus = attorneyNeedsPassword ? 'invited' : 'active'

    await (prisma as any).firmMember.upsert({
      where: {
        lawFirmId_userId: {
          lawFirmId: currentAttorney.lawFirmId,
          userId: memberUser.id
        }
      },
      update: {
        attorneyId: attorney.id,
        role: 'attorney',
        officeId: resolvedOfficeId,
        status: attorneyMemberStatus,
        invitedAt: attorneyNeedsPassword ? new Date() : undefined,
        joinedAt: attorneyNeedsPassword ? undefined : new Date()
      },
      create: {
        lawFirmId: currentAttorney.lawFirmId,
        userId: memberUser.id,
        attorneyId: attorney.id,
        role: 'attorney',
        officeId: resolvedOfficeId,
        status: attorneyMemberStatus,
        invitedAt: new Date(),
        joinedAt: attorneyNeedsPassword ? null : new Date()
      }
    }).catch((memberError: any) => {
      logger.warn('Failed to create firm member for attorney', {
        error: memberError?.message,
        attorneyId: attorney.id,
        lawFirmId: currentAttorney.lawFirmId
      })
    })

    // Best-effort invite email (tokenized set-password link for new accounts).
    let attorneyFirmName: string | null = null
    try {
      const firm = await prisma.lawFirm.findUnique({ where: { id: currentAttorney.lawFirmId }, select: { name: true } })
      attorneyFirmName = firm?.name ?? null
    } catch { /* non-fatal */ }
    void sendFirmMemberInvite({
      userId: memberUser.id,
      to: normalizedEmail,
      firstName: memberUser.firstName,
      firmName: attorneyFirmName,
      role: 'attorney',
      needsPassword: attorneyNeedsPassword
    })

    res.json({ attorney })
  } catch (error: any) {
    logger.error('Failed to add attorney to firm', {
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ error: 'Failed to add attorney to firm' })
  }
})

// Update an attorney in the current attorney's firm
router.put('/attorneys/:attorneyId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { attorneyId } = req.params
    const { firstName, middleName, lastName, specialties, venues, jurisdictions } = req.body || {}

    const currentAttorney: any = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!currentAttorney) {
      return res.status(404).json({ error: 'Attorney account not found for this user' })
    }

    if (!currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    const targetAttorney = await prisma.attorney.findUnique({
      where: { id: attorneyId }
    })

    if (!targetAttorney || targetAttorney.lawFirmId !== currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'Attorney not found in your firm' })
    }

    const parsedSpecialties = Array.isArray(specialties)
      ? specialties.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedVenues = Array.isArray(venues)
      ? venues.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedJurisdictions = Array.isArray(jurisdictions)
      ? jurisdictions.filter((item: any) => item && typeof item.state === 'string' && item.state.trim())
      : parsedVenues.map((state: string) => ({ state }))

    if (parsedSpecialties.length === 0) {
      return res.status(400).json({ error: 'At least one specialty is required' })
    }
    if (parsedVenues.length === 0 && parsedJurisdictions.length === 0) {
      return res.status(400).json({ error: 'At least one jurisdiction is required' })
    }

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof middleName === 'string' ? middleName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : ''
    ].filter(Boolean).join(' ')

    const updatedAttorney = await prisma.attorney.update({
      where: { id: attorneyId },
      data: {
        name: derivedName || targetAttorney.name,
        specialties: JSON.stringify(parsedSpecialties),
        venues: JSON.stringify(parsedVenues)
      }
    })

    await prisma.attorneyProfile.upsert({
      where: { attorneyId },
      update: {
        specialties: JSON.stringify(parsedSpecialties),
        jurisdictions: JSON.stringify(parsedJurisdictions)
      },
      create: {
        attorneyId,
        bio: '',
        specialties: JSON.stringify(parsedSpecialties),
        languages: JSON.stringify(['English']),
        yearsExperience: 0,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        jurisdictions: JSON.stringify(parsedJurisdictions)
      }
    })

    res.json({ attorney: updatedAttorney })
  } catch (error: any) {
    logger.error('Failed to update attorney in firm', {
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ error: 'Failed to update attorney in firm' })
  }
})

// Update the current user's firm profile/settings (firm-admin only)
router.put('/', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage firm settings' })
    }

    const { name, primaryEmail, phone, website, address, city, state, zip } = req.body || {}

    // Name, when provided, must be a non-empty string.
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Firm name is required' })
    }

    // Validate the email format only when a non-empty value is supplied.
    if (typeof primaryEmail === 'string' && primaryEmail.trim()) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail.trim())
      if (!emailValid) {
        return res.status(400).json({ error: 'Please enter a valid email address' })
      }
    }

    const toNullable = (value: unknown) => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      return trimmed ? trimmed : null
    }

    const data: Record<string, any> = {}
    if (name !== undefined) data.name = name.trim()
    if (primaryEmail !== undefined) data.primaryEmail = toNullable(primaryEmail)
    if (phone !== undefined) data.phone = toNullable(phone)
    if (website !== undefined) data.website = toNullable(website)
    if (address !== undefined) data.address = toNullable(address)
    if (city !== undefined) data.city = toNullable(city)
    if (state !== undefined) data.state = toNullable(state)
    if (zip !== undefined) data.zip = toNullable(zip)

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No firm settings provided to update' })
    }

    const updatedFirm = await (prisma as any).lawFirm.update({
      where: { id: context.lawFirmId },
      data
    })

    res.json({ firm: updatedFirm })
  } catch (error: any) {
    logger.error('Failed to update firm settings', {
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ error: 'Failed to update firm settings' })
  }
})

// Get firm-level dashboard for the current attorney's firm
router.get('/', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const context = await getFirmContext(req)
    if (!context) {
      return res.status(404).json({ error: 'No law firm associated with this user' })
    }

    // Get firm with all attorneys
    const firm = await (prisma as any).lawFirm.findUnique({
      where: { id: context.lawFirmId },
      include: {
        attorneys: {
          include: {
            attorneyProfile: true,
            dashboard: true
          }
        }
      }
    })

    if (!firm) {
      return res.status(404).json({ error: 'Law firm not found' })
    }

    const [members, offices, teams, firmCases] = await Promise.all([
      (prisma as any).firmMember.findMany({
        where: { lawFirmId: firm.id, status: 'active' },
        include: {
          user: true,
          attorney: true,
          office: true
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
      }).catch(() => []),
      (prisma as any).firmOffice.findMany({
        where: { lawFirmId: firm.id, isActive: true },
        orderBy: { name: 'asc' }
      }).catch(() => []),
      (prisma as any).firmTeam.findMany({
        where: { lawFirmId: firm.id, isActive: true },
        include: {
          office: true,
          members: {
            include: {
              firmMember: {
                include: {
                  user: true,
                  attorney: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      }).catch(() => []),
      (prisma as any).assessment.findMany({
        where: {
          OR: [
            { lawFirmId: firm.id },
            {
              leadSubmission: {
                assignedAttorney: {
                  lawFirmId: firm.id
                }
              }
            },
            {
              introductions: {
                some: {
                  attorney: {
                    lawFirmId: firm.id
                  }
                }
              }
            }
          ]
        },
        include: {
          leadSubmission: true,
          user: { select: { firstName: true, lastName: true } },
          caseTasks: {
            where: {
              status: { not: 'done' }
            },
            orderBy: [
              { priority: 'desc' },
              { dueDate: 'asc' }
            ],
            take: 20
          },
          firmCaseAssignments: {
            where: { status: 'active' },
            include: {
              assignedUser: true,
              assignedAttorney: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 100
      }).catch(() => [])
    ])

    const attorneys: any[] = (firm as any).attorneys || []
    const attorneyIds = attorneys.map((a: any) => a.id).filter(Boolean)
    const verifiedReviewCounts = attorneyIds.length > 0
      ? await prisma.attorneyReview.groupBy({
          by: ['attorneyId'],
          where: {
            attorneyId: { in: attorneyIds },
            isVerified: true,
          },
          _count: {
            _all: true,
          },
        })
      : []
    const verifiedReviewCountMap = new Map(
      verifiedReviewCounts.map((entry) => [entry.attorneyId, entry._count._all])
    )

    // Aggregate metrics from attorney dashboards
    let totalLeadsReceived = 0
    let totalLeadsAccepted = 0
    let feesCollectedFromPayments = 0
    let totalPlatformSpend = 0
    const totalFeesByAttorneyId = new Map<string, number>()

    if (attorneyIds.length > 0) {
      try {
        const payments = await prisma.billingPayment.findMany({
          where: {
            assessment: {
              OR: [
                { leadSubmission: { assignedAttorneyId: { in: attorneyIds } } },
                { introductions: { some: { attorneyId: { in: attorneyIds } } } }
              ]
            }
          },
          select: {
            amount: true,
            assessment: {
              select: {
                leadSubmission: {
                  select: {
                    assignedAttorneyId: true
                  }
                },
                introductions: {
                  select: {
                    attorneyId: true
                  }
                }
              }
            }
          }
        })

        payments.forEach((payment: any) => {
          const amount = Number(payment.amount ?? 0)
          feesCollectedFromPayments += amount

          const relatedAttorneyIds = new Set<string>()
          const assignedAttorneyId = payment.assessment?.leadSubmission?.assignedAttorneyId
          if (assignedAttorneyId && attorneyIds.includes(assignedAttorneyId)) {
            relatedAttorneyIds.add(assignedAttorneyId)
          }
          for (const intro of payment.assessment?.introductions || []) {
            if (intro?.attorneyId && attorneyIds.includes(intro.attorneyId)) {
              relatedAttorneyIds.add(intro.attorneyId)
            }
          }

          relatedAttorneyIds.forEach((id) => {
            totalFeesByAttorneyId.set(id, (totalFeesByAttorneyId.get(id) || 0) + amount)
          })
        })
      } catch (billingError: any) {
        logger.warn('Failed to aggregate firm billing payments', {
          error: billingError?.message,
          lawFirmId: firm.id
        })
      }
    }

    // Platform spend = routing fees / subscriptions / lead credits the firm's
    // attorneys actually paid ClearCaseIQ. Computed live from platform_payments;
    // the stored dashboard.totalPlatformSpend is never updated by the accept flow
    // (which is why the firm KPIs read $0). Skip "skipped_*" records (fee bypassed).
    if (attorneyIds.length > 0) {
      try {
        const platformPayments = await prisma.platformPayment.findMany({
          where: { attorneyId: { in: attorneyIds } },
          select: { amount: true, status: true }
        })
        totalPlatformSpend = platformPayments
          .filter((p: any) => !String(p.status || '').startsWith('skipped'))
          .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
      } catch (spendError: any) {
        logger.warn('Failed to aggregate firm platform spend', {
          error: spendError?.message,
          lawFirmId: firm.id
        })
      }
    }

    // Leads received = all leads routed to the firm (live count).
    try {
      totalLeadsReceived = await prisma.leadSubmission.count({
        where: { assessment: { lawFirmId: firm.id } }
      })
    } catch (leadsError: any) {
      logger.warn('Failed to count firm leads received', {
        error: leadsError?.message,
        lawFirmId: firm.id
      })
    }

    const attorneyCount = attorneys.length

    // Aggregate ratings
    let totalRating = 0
    let totalReviews = 0
    let verifiedReviewCount = 0

    attorneys.forEach((a: any) => {
      if (a.attorneyProfile) {
        totalRating += a.attorneyProfile.averageRating || 0
        totalReviews += a.attorneyProfile.totalReviews || 0
      }
      verifiedReviewCount += verifiedReviewCountMap.get(a.id) || 0
    })

    const avgAttorneyRating = attorneyCount > 0 ? totalRating / attorneyCount : 0
    // A firm "case" is one an attorney has actually taken on. Marketplace leads
    // merely routed to the firm (status 'submitted') and declined/expired ones
    // ('rejected') are NOT the firm's cases — they must not count toward active
    // caseload or the "no owner assigned yet" queue.
    const ACTIVE_CASE_STATUSES = ['contacted', 'consulted', 'retained']
    const isActiveCase = (assessment: any) => ACTIVE_CASE_STATUSES.includes(assessment.leadSubmission?.status)
    const acceptedCases = firmCases.filter(isActiveCase).length
    const retainedCases = firmCases.filter((assessment: any) => assessment.leadSubmission?.status === 'retained').length
    // Accepted = live accepted caseload (contacted/consulted/retained), not the
    // stale stored dashboard counter.
    totalLeadsAccepted = acceptedCases
    const operationsQueue = firmCases.flatMap((assessment: any) =>
      (assessment.caseTasks || []).map((task: any) => ({
        id: task.id,
        assessmentId: assessment.id,
        title: task.title,
        taskType: task.taskType,
        assignedRole: task.assignedRole,
        assignedTo: task.assignedTo,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        caseType: assessment.claimType,
        venueCounty: assessment.venueCounty,
        leadStatus: assessment.leadSubmission?.status || assessment.status
      }))
    ).slice(0, 20)

    // Case-level roster so the firm can see ownership at a glance and assign
    // work. Primary owner comes from the routed lead's attorney; additional
    // firm-role owners come from active FirmCaseAssignment rows.
    const attorneyNameById = new Map<string, string>(
      attorneys.map((a: any) => [a.id, a.name])
    )
    const firmCasesList = firmCases.filter(isActiveCase).map((assessment: any) => {
      const lead = assessment.leadSubmission
      const primaryAttorneyId: string | null = lead?.assignedAttorneyId || null
      const assignments = (assessment.firmCaseAssignments || []).map((x: any) => ({
        role: x.role,
        name:
          x.assignedAttorney?.name ||
          `${x.assignedUser?.firstName || ''} ${x.assignedUser?.lastName || ''}`.trim() ||
          null,
      }))
      const clientName =
        `${assessment.user?.firstName || ''} ${assessment.user?.lastName || ''}`.trim() || null
      return {
        assessmentId: assessment.id,
        leadId: lead?.id || null,
        clientName,
        claimType: assessment.claimType,
        venueCounty: assessment.venueCounty,
        venueState: assessment.venueState,
        leadStatus: lead?.status || assessment.status,
        updatedAt: assessment.updatedAt,
        primaryAttorney: primaryAttorneyId
          ? { id: primaryAttorneyId, name: attorneyNameById.get(primaryAttorneyId) || 'Attorney' }
          : null,
        assignments,
        openTaskCount: (assessment.caseTasks || []).length,
        unassigned: !primaryAttorneyId && assignments.length === 0,
        officeId: assessment.officeId ?? null,
      }
    })

    // Marketplace Performance (firm scope): KPI tiles, acquisition funnel, and
    // spend-vs-return monthly series across every attorney in the firm.
    let marketplace: any = null
    try {
      marketplace = await computeMarketplacePerformance(prisma, {
        attorneyIds,
        leadWhere: { assessment: { lawFirmId: firm.id } },
      })
      // Per-attorney breakdown so a managing partner can see who drives (or drags)
      // the firm's acquisition ROI.
      marketplace.byAttorney = await computeMarketplacePerformanceByAttorney(
        prisma,
        attorneys.map((a: any) => ({ id: a.id, name: a.name })),
      )
    } catch (mpError: any) {
      logger.warn('Failed to compute firm marketplace performance', { error: mpError?.message, lawFirmId: firm.id })
    }

    // Live per-attorney lead stats for the Match Quality firm view. The stored
    // AttorneyDashboard counters (totalLeadsReceived/Accepted/PlatformSpend) are
    // not kept up to date by the accept flow, so we recompute them from the same
    // universe each attorney sees on their own dashboard (assigned OR introduced).
    const ACCEPTED_LEAD_STATUSES = ['contacted', 'consulted', 'retained']
    const attorneyLeadStats = new Map<string, { routed: number; accepted: number; retained: number }>()
    // Per-attorney lead events routed in the last 90 days, so the Match Quality
    // firm view can recompute routed/accepted for any custom day window (slider).
    const attorneyLeadEvents = new Map<string, Array<{ submittedAt: string; status: string }>>()
    const matchWindowCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    try {
      await Promise.all(
        attorneys.map(async (a: any) => {
          const universe = {
            OR: [
              { assignedAttorneyId: a.id },
              { assessment: { introductions: { some: { attorneyId: a.id } } } },
            ],
          }
          const [routed, accepted, retained, events90] = await Promise.all([
            prisma.leadSubmission.count({ where: universe }),
            prisma.leadSubmission.count({
              where: { AND: [universe, { status: { in: ACCEPTED_LEAD_STATUSES } }] },
            }),
            prisma.leadSubmission.count({
              where: { AND: [universe, { status: 'retained' }] },
            }),
            prisma.leadSubmission.findMany({
              where: { AND: [universe, { submittedAt: { gte: matchWindowCutoff } }] },
              select: { submittedAt: true, status: true },
            }),
          ])
          attorneyLeadStats.set(a.id, { routed, accepted, retained })
          attorneyLeadEvents.set(
            a.id,
            events90.map((e: any) => ({
              submittedAt: new Date(e.submittedAt).toISOString(),
              status: String(e.status || ''),
            })),
          )
        }),
      )
    } catch (statsErr: any) {
      logger.warn('Failed to compute per-attorney lead stats', { error: statsErr?.message, lawFirmId: firm.id })
    }
    // Live routing spend per attorney (billable platform payments), from the
    // marketplace breakdown we just computed.
    const attorneySpend = new Map<string, number>(
      Array.isArray(marketplace?.byAttorney)
        ? marketplace.byAttorney.map((r: any) => [r.attorneyId, Number(r.routingSpend || 0)])
        : [],
    )

    // Build response
    const response = {
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        primaryEmail: firm.primaryEmail,
        phone: firm.phone,
        website: firm.website,
        address: firm.address,
        city: firm.city,
        state: firm.state,
        zip: firm.zip,
        createdAt: firm.createdAt,
      },
      metrics: {
        attorneyCount,
        totalLeadsReceived,
        totalLeadsAccepted,
        feesCollectedFromPayments,
        totalPlatformSpend,
        avgAttorneyRating,
        totalReviews,
        verifiedReviewCount,
        activeCases: firmCasesList.length,
        acceptedCases,
        retainedCases,
        operationsQueueCount: operationsQueue.length,
        firmROI: totalPlatformSpend > 0 ? (feesCollectedFromPayments / totalPlatformSpend) : null
      },
      // Marketplace Performance KPIs (firm scope). Mirrors the attorney-dashboard
      // analytics shape the frontend reads for ROI / conversion / average fee.
      analytics: {
        conversionRate: acceptedCases > 0 ? Math.round((retainedCases / acceptedCases) * 100) : 0,
        roi: totalPlatformSpend > 0 ? (feesCollectedFromPayments / totalPlatformSpend) : 0,
        averageFee: acceptedCases > 0 ? (feesCollectedFromPayments / acceptedCases) : 0
      },
      marketplace,
      workspace: {
        currentRole: context?.role || 'attorney',
        permissions: context?.permissions || FIRM_ROLE_PERMISSIONS.attorney,
        roleCapabilities: FIRM_ROLE_PERMISSIONS,
        assignmentRoles: CASE_ASSIGNMENT_ROLES,
        subscription: {
          planName: 'Professional Plan',
          includedSeats: 10,
          seatMix: {
            attorneys: 3,
            caseManagers: 4,
            paralegals: 2,
            intakeSpecialists: 1
          }
        }
      },
      offices: offices.map((office: any) => ({
        id: office.id,
        name: office.name,
        city: office.city,
        state: office.state,
        address: office.address,
        phone: office.phone,
        countiesServed: parseJsonArray(office.countiesServed),
        languages: parseJsonArray(office.languages),
        practiceAreas: parseJsonArray(office.practiceAreas),
        capacity: office.capacity
      })),
      teams: teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        teamType: team.teamType,
        description: team.description,
        office: team.office ? {
          id: team.office.id,
          name: team.office.name
        } : null,
        members: (team.members || []).map((member: any) => ({
          id: member.firmMember.id,
          firmMemberId: member.firmMember.id,
          teamRole: member.role, // FirmTeamMember role: 'lead' | 'member'
          role: member.firmMember.role, // firm-wide role (attorney, case_manager, …)
          name: `${member.firmMember.user?.firstName || ''} ${member.firmMember.user?.lastName || ''}`.trim() || member.firmMember.attorney?.name,
          email: member.firmMember.user?.email || member.firmMember.attorney?.email
        }))
      })),
      members: members.map((member: any) => ({
        id: member.id,
        role: member.role,
        title: member.title,
        status: member.status,
        invitedAt: member.invitedAt,
        office: member.office ? {
          id: member.office.id,
          name: member.office.name
        } : null,
        user: {
          id: member.user?.id,
          email: member.user?.email,
          firstName: member.user?.firstName,
          lastName: member.user?.lastName,
          role: member.user?.role
        },
        attorney: member.attorney ? {
          id: member.attorney.id,
          name: member.attorney.name,
          email: member.attorney.email
        } : null
      })),
      operationsQueue,
      cases: firmCasesList,
      attorneys: attorneys.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        isVerified: a.isVerified,
        responseTimeHours: a.responseTimeHours,
        averageRating: a.attorneyProfile?.averageRating || 0,
        totalReviews: a.attorneyProfile?.totalReviews || 0,
        verifiedReviewCount: verifiedReviewCountMap.get(a.id) || 0,
        subscriptionTier: a.attorneyProfile?.subscriptionTier || null,
        specialties: a.attorneyProfile?.specialties ? JSON.parse(a.attorneyProfile.specialties) : [],
        jurisdictions: a.attorneyProfile?.jurisdictions ? JSON.parse(a.attorneyProfile.jurisdictions) : [],
        // Live-computed so the Match Quality firm view reflects real activity
        // rather than stale stored AttorneyDashboard counters.
        dashboard: {
          totalLeadsReceived: attorneyLeadStats.get(a.id)?.routed ?? a.dashboard?.totalLeadsReceived ?? 0,
          totalLeadsAccepted: attorneyLeadStats.get(a.id)?.accepted ?? a.dashboard?.totalLeadsAccepted ?? 0,
          totalLeadsRetained: attorneyLeadStats.get(a.id)?.retained ?? 0,
          feesCollectedFromPayments: totalFeesByAttorneyId.get(a.id) || 0,
          totalPlatformSpend: attorneySpend.get(a.id) ?? a.dashboard?.totalPlatformSpend ?? 0,
        },
        // Lead events (last 90d) for client-side windowing on Match Quality.
        matchWindowLeads: attorneyLeadEvents.get(a.id) || []
      }))
    }

    res.json(response)
  } catch (error: any) {
    logger.error('Failed to get firm dashboard')
    res.status(500).json({ error: 'Failed to load firm dashboard' })
  }
})

// ---------------------------------------------------------------------------
// Firm direct messages — lightweight attorney↔colleague DMs (not case-scoped).
// Threaded by the (me, colleague) User pair within a firm.
// ---------------------------------------------------------------------------

function memberDisplayName(m: any): string {
  const composed = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim()
  return composed || m.attorney?.name || m.user?.email || m.attorney?.email || 'Teammate'
}

// List the current user's firm colleagues as DM targets, enriched with the last
// message + unread count for each conversation.
router.get('/colleagues', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const meId = context.user?.id
    if (!meId) return res.status(401).json({ error: 'Authentication required' })

    const members = await (prisma as any).firmMember.findMany({
      where: { lawFirmId: context.lawFirmId, status: 'active' },
      select: {
        id: true,
        role: true,
        title: true,
        userId: true,
        attorney: { select: { name: true, email: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    const colleagues = members.filter((m: any) => m.userId && m.userId !== meId)
    const colleagueIds = colleagues.map((m: any) => m.userId)

    // Pull every DM between me and any colleague in one query, then fold into
    // per-conversation last message + unread count.
    const dms = colleagueIds.length
      ? await (prisma as any).firmDirectMessage.findMany({
          where: {
            lawFirmId: context.lawFirmId,
            OR: [
              { senderId: meId, recipientId: { in: colleagueIds } },
              { recipientId: meId, senderId: { in: colleagueIds } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: { senderId: true, recipientId: true, body: true, readAt: true, createdAt: true },
        })
      : []

    const lastByOther: Record<string, any> = {}
    const unreadByOther: Record<string, number> = {}
    for (const dm of dms) {
      const other = dm.senderId === meId ? dm.recipientId : dm.senderId
      if (!lastByOther[other]) lastByOther[other] = dm // dms are desc, first seen is latest
      if (dm.recipientId === meId && !dm.readAt) unreadByOther[other] = (unreadByOther[other] || 0) + 1
    }

    const result = colleagues
      .map((m: any) => {
        const last = lastByOther[m.userId]
        return {
          userId: m.userId,
          name: memberDisplayName(m),
          email: m.user?.email || m.attorney?.email || null,
          role: m.role,
          title: m.title || null,
          isAttorney: Boolean(m.attorney),
          lastMessage: last ? { body: last.body, at: last.createdAt, fromMe: last.senderId === meId } : null,
          lastMessageAt: last ? last.createdAt : null,
          unreadCount: unreadByOther[m.userId] || 0,
        }
      })
      .sort((a: any, b: any) => {
        // Conversations with activity first (newest), then the rest alphabetically.
        if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        if (a.lastMessageAt) return -1
        if (b.lastMessageAt) return 1
        return a.name.localeCompare(b.name)
      })

    const unreadTotal = Object.values(unreadByOther).reduce((s, n) => s + n, 0)
    res.json({ colleagues: result, unreadTotal })
  } catch (error: any) {
    logger.error('Failed to list firm colleagues', { error: error?.message })
    res.status(500).json({ error: 'Failed to load colleagues' })
  }
})

// Total unread direct messages for the current user (powers the nav badge).
router.get('/direct-messages/unread-count', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.json({ count: 0 })
    const meId = context.user?.id
    if (!meId) return res.json({ count: 0 })
    const count = await (prisma as any).firmDirectMessage.count({
      where: { lawFirmId: context.lawFirmId, recipientId: meId, readAt: null },
    })
    res.json({ count })
  } catch (error: any) {
    logger.error('Failed to load DM unread count', { error: error?.message })
    res.json({ count: 0 })
  }
})

// Fetch the conversation with one colleague (oldest→newest) and mark inbound read.
router.get('/direct-messages/:userId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const meId = context.user?.id
    if (!meId) return res.status(401).json({ error: 'Authentication required' })
    const otherId = String(req.params.userId)

    // Confirm the other party is a colleague in the same firm.
    const colleague = await (prisma as any).firmMember.findFirst({
      where: { lawFirmId: context.lawFirmId, userId: otherId, status: 'active' },
      select: { role: true, attorney: { select: { name: true, email: true } }, user: { select: { firstName: true, lastName: true, email: true } } },
    })
    if (!colleague) return res.status(404).json({ error: 'Colleague not found in this firm' })

    const messages = await (prisma as any).firmDirectMessage.findMany({
      where: {
        lawFirmId: context.lawFirmId,
        OR: [
          { senderId: meId, recipientId: otherId },
          { senderId: otherId, recipientId: meId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
    })

    // Mark inbound messages as read.
    await (prisma as any).firmDirectMessage.updateMany({
      where: { lawFirmId: context.lawFirmId, senderId: otherId, recipientId: meId, readAt: null },
      data: { readAt: new Date() },
    })

    res.json({
      colleague: {
        userId: otherId,
        name: memberDisplayName(colleague),
        email: colleague.user?.email || colleague.attorney?.email || null,
        role: colleague.role,
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        body: m.body,
        at: m.createdAt,
        fromMe: m.senderId === meId,
      })),
    })
  } catch (error: any) {
    logger.error('Failed to load DM thread', { error: error?.message })
    res.status(500).json({ error: 'Failed to load conversation' })
  }
})

// Send a direct message to a colleague and fire an in-app notification.
router.post('/direct-messages/:userId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const meId = context.user?.id
    if (!meId) return res.status(401).json({ error: 'Authentication required' })
    const otherId = String(req.params.userId)
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) return res.status(400).json({ error: 'Message body is required' })
    if (otherId === meId) return res.status(400).json({ error: 'You cannot message yourself' })

    const colleague = await (prisma as any).firmMember.findFirst({
      where: { lawFirmId: context.lawFirmId, userId: otherId, status: 'active' },
      select: { attorneyId: true, user: { select: { email: true } }, attorney: { select: { email: true } } },
    })
    if (!colleague) return res.status(404).json({ error: 'Colleague not found in this firm' })

    const created = await (prisma as any).firmDirectMessage.create({
      data: { lawFirmId: context.lawFirmId, senderId: meId, recipientId: otherId, body: body.slice(0, 5000) },
      select: { id: true, body: true, createdAt: true },
    })

    // Notify the recipient in-app (shows in the attorney notification bell).
    const senderName = `${context.user?.firstName || ''} ${context.user?.lastName || ''}`.trim()
      || context.attorney?.name || 'A colleague'
    const recipientEmail = colleague.user?.email || colleague.attorney?.email || undefined
    void createNotificationEvent({
      userId: otherId,
      attorneyId: colleague.attorneyId || undefined,
      role: 'attorney',
      channel: 'in_app',
      eventType: 'attorney.direct_message',
      subject: `New message from ${senderName}`,
      body: body.slice(0, 140),
      recipient: recipientEmail,
      payload: { link: `/attorney-dashboard/cases/team?dm=${meId}`, fromUserId: meId, fromName: senderName },
    }).catch(() => {})

    res.status(201).json({ message: { id: created.id, body: created.body, at: created.createdAt, fromMe: true } })
  } catch (error: any) {
    logger.error('Failed to send DM', { error: error?.message })
    res.status(500).json({ error: 'Failed to send message' })
  }
})

/* -------------------------------------------------------------------------- */
/* Team ("round-robin") booking links                                         */
/* -------------------------------------------------------------------------- */

function bookingWebBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.WEB_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

async function uniqueFirmLinkSlug(lawFirmId: string, name: string, ignoreId?: string) {
  const base = slugify(name) || 'team'
  let candidate = base
  let n = 1
  while (
    await (prisma as any).firmBookingLink.findFirst({
      where: { lawFirmId, slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    })
  ) {
    n += 1
    candidate = `${base}-${n}`
  }
  return candidate
}

function serializeBookingLink(link: any, firmSlug: string) {
  return {
    id: link.id,
    slug: link.slug,
    name: link.name,
    description: link.description,
    durationMinutes: link.durationMinutes,
    locationType: link.locationType,
    location: link.location,
    bufferBeforeMinutes: link.bufferBeforeMinutes,
    bufferAfterMinutes: link.bufferAfterMinutes,
    minNoticeMinutes: link.minNoticeMinutes,
    assignmentStrategy: link.assignmentStrategy,
    isActive: link.isActive,
    members: (link.members || []).map((m: any) => ({
      attorneyId: m.attorneyId,
      name: m.attorney?.name || 'Attorney',
      sortOrder: m.sortOrder,
    })),
    publicUrl: `${bookingWebBaseUrl()}/book/team/${firmSlug}/${link.slug}`,
  }
}

// GET /v1/firm-dashboard/booking-links — team links + selectable attorneys.
router.get('/booking-links', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })

    const [links, attorneys, firm] = await Promise.all([
      (prisma as any).firmBookingLink.findMany({
        where: { lawFirmId: context.lawFirmId },
        include: { members: { include: { attorney: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attorney.findMany({
        where: { lawFirmId: context.lawFirmId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { slug: true } }),
    ])

    const firmSlug = firm?.slug || ''
    res.json({
      canManage: requireFirmPermission(context, 'manage_users'),
      firmAttorneys: attorneys,
      links: links.map((l: any) => serializeBookingLink(l, firmSlug)),
    })
  } catch (error) {
    logger.error('Failed to list firm booking links', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const BookingLinkInput = {
  parse(body: any) {
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const durationMinutes = Number(body?.durationMinutes)
    const locationType = ['video', 'phone', 'in_person'].includes(body?.locationType) ? body.locationType : 'video'
    const assignmentStrategy = ['round_robin', 'first_available'].includes(body?.assignmentStrategy)
      ? body.assignmentStrategy
      : 'round_robin'
    const memberAttorneyIds: string[] = Array.isArray(body?.memberAttorneyIds)
      ? body.memberAttorneyIds.filter((x: any) => typeof x === 'string')
      : []
    return {
      name,
      description: typeof body?.description === 'string' ? body.description : null,
      durationMinutes: Number.isFinite(durationMinutes) ? Math.min(240, Math.max(10, durationMinutes)) : 30,
      locationType,
      location: typeof body?.location === 'string' ? body.location : null,
      bufferBeforeMinutes: Number(body?.bufferBeforeMinutes) || 0,
      bufferAfterMinutes: Number(body?.bufferAfterMinutes) || 0,
      minNoticeMinutes: Number.isFinite(Number(body?.minNoticeMinutes)) ? Number(body.minNoticeMinutes) : 120,
      assignmentStrategy,
      isActive: body?.isActive !== false,
      memberAttorneyIds,
    }
  },
}

async function assertFirmAttorneys(lawFirmId: string, attorneyIds: string[]) {
  if (attorneyIds.length === 0) return []
  const rows = await prisma.attorney.findMany({
    where: { id: { in: attorneyIds }, lawFirmId },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

// POST /v1/firm-dashboard/booking-links — create a team link.
router.post('/booking-links', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage booking links' })
    }

    const data = BookingLinkInput.parse(req.body)
    if (!data.name) return res.status(400).json({ error: 'A name is required' })

    const validMemberIds = await assertFirmAttorneys(context.lawFirmId, data.memberAttorneyIds)
    if (validMemberIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one attorney for the rotation' })
    }

    const slug = await uniqueFirmLinkSlug(context.lawFirmId, data.name)
    const created = await (prisma as any).firmBookingLink.create({
      data: {
        lawFirmId: context.lawFirmId,
        slug,
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        locationType: data.locationType,
        location: data.location,
        bufferBeforeMinutes: data.bufferBeforeMinutes,
        bufferAfterMinutes: data.bufferAfterMinutes,
        minNoticeMinutes: data.minNoticeMinutes,
        assignmentStrategy: data.assignmentStrategy,
        isActive: data.isActive,
        members: {
          create: validMemberIds.map((attorneyId, index) => ({ attorneyId, sortOrder: index })),
        },
      },
      include: { members: { include: { attorney: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } } },
    })

    const firm = await prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { slug: true } })
    res.status(201).json(serializeBookingLink(created, firm?.slug || ''))
  } catch (error) {
    logger.error('Failed to create firm booking link', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/firm-dashboard/booking-links/:id — update a team link (+ members).
router.patch('/booking-links/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage booking links' })
    }

    const existing = await (prisma as any).firmBookingLink.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { id: true, name: true },
    })
    if (!existing) return res.status(404).json({ error: 'Booking link not found' })

    const data = BookingLinkInput.parse(req.body)
    const validMemberIds = await assertFirmAttorneys(context.lawFirmId, data.memberAttorneyIds)
    if (validMemberIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one attorney for the rotation' })
    }

    const update: any = {
      name: data.name || existing.name,
      description: data.description,
      durationMinutes: data.durationMinutes,
      locationType: data.locationType,
      location: data.location,
      bufferBeforeMinutes: data.bufferBeforeMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      minNoticeMinutes: data.minNoticeMinutes,
      assignmentStrategy: data.assignmentStrategy,
      isActive: data.isActive,
    }
    if (data.name && data.name !== existing.name) {
      update.slug = await uniqueFirmLinkSlug(context.lawFirmId, data.name, existing.id)
    }

    // Replace the membership set to match the submitted list.
    await (prisma as any).firmBookingLinkMember.deleteMany({ where: { linkId: existing.id } })
    const updated = await (prisma as any).firmBookingLink.update({
      where: { id: existing.id },
      data: {
        ...update,
        members: { create: validMemberIds.map((attorneyId, index) => ({ attorneyId, sortOrder: index })) },
      },
      include: { members: { include: { attorney: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } } },
    })

    const firm = await prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { slug: true } })
    res.json(serializeBookingLink(updated, firm?.slug || ''))
  } catch (error) {
    logger.error('Failed to update firm booking link', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/firm-dashboard/booking-links/:id
router.delete('/booking-links/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage booking links' })
    }
    const existing = await (prisma as any).firmBookingLink.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { id: true },
    })
    if (!existing) return res.status(404).json({ error: 'Booking link not found' })
    await (prisma as any).firmBookingLink.delete({ where: { id: existing.id } })
    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete firm booking link', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/* ------------------------------------------------------------------ */
/* FIRM TEMPLATES — reusable document library (retainer, HIPAA, etc.)  */
/* ------------------------------------------------------------------ */

export const TEMPLATE_CATEGORIES = [
  { key: 'onboarding', label: 'Client onboarding' },
  { key: 'medical', label: 'Medical' },
  { key: 'insurance', label: 'Insurance & liability' },
  { key: 'disclosure', label: 'Disclosures & compliance' },
  { key: 'closing', label: 'Case closing' },
  { key: 'other', label: 'Other' },
] as const

const TEMPLATE_CATEGORY_KEYS = TEMPLATE_CATEGORIES.map((c) => c.key)

// Uploaded source documents for firm templates (PDF/DOCX).
const templateUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'firm-templates')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => cb(null, `tpl-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.mimetype)
    if (ok) cb(null, true)
    else cb(new Error('Only PDF or Word (.doc/.docx) files are allowed'))
  },
})

// Starter library seeded on demand. Bodies use {{merge_tokens}} the firm can
// tweak; PDFs can be attached later for anything that must be signed as-is.
const RECOMMENDED_TEMPLATES: Array<{ name: string; category: string; description: string; body: string }> = [
  {
    name: 'Contingency Fee / Retainer Agreement',
    category: 'onboarding',
    description: 'Core engagement contract setting the contingency fee and scope of representation.',
    body: `RETAINER & CONTINGENCY FEE AGREEMENT\n\nThis Agreement is between {{firm_name}} ("the Firm") and {{client_name}} ("the Client"), dated {{date}}.\n\n1. SCOPE. The Firm will represent the Client in connection with: {{matter_description}}.\n2. FEE. The Firm's fee is {{fee_percentage}}% of the gross recovery, contingent on recovery. If there is no recovery, the Client owes no attorney's fee.\n3. COSTS. Case costs and expenses are advanced by the Firm and reimbursed from the recovery.\n4. NO GUARANTEE. No specific outcome has been promised.\n\nClient signature: ____________________   Date: __________\nAttorney: {{attorney_name}}`,
  },
  {
    name: 'New-Client Intake Package / Questionnaire',
    category: 'onboarding',
    description: 'Structured questionnaire capturing incident, injury, insurance, and contact details.',
    body: `NEW CLIENT INTAKE QUESTIONNAIRE\n\nClient: {{client_name}}    DOB: {{client_dob}}\nDate of incident: __________    Location: __________\n\nA. INCIDENT\n- Describe what happened:\n- Police report number (if any):\n\nB. INJURIES & TREATMENT\n- Injuries sustained:\n- Treating providers:\n\nC. INSURANCE\n- Your auto/health carrier:\n- At-fault party's carrier / claim #:\n\nD. EMPLOYMENT & LOST WAGES\n- Employer / missed work:\n\nE. CONTACT\n- Best phone / email:`,
  },
  {
    name: 'Engagement / Welcome Letter',
    category: 'onboarding',
    description: 'Friendly confirmation of representation, next steps, and how to reach the team.',
    body: `Dear {{client_name}},\n\nThank you for trusting {{firm_name}} with your case. This letter confirms we are representing you regarding {{matter_description}}.\n\nWhat happens next:\n1. We gather your records and notify the insurance company.\n2. Please route all calls from insurers/adjusters to us.\n3. Keep receipts and a symptom journal.\n\nYour primary contact is {{attorney_name}}. We're here to help.\n\nSincerely,\n{{firm_name}}`,
  },
  {
    name: "Statement of Client's Rights & Responsibilities",
    category: 'onboarding',
    description: 'Plain-language summary of what the client can expect and what we ask of them.',
    body: `YOUR RIGHTS & RESPONSIBILITIES\n\nYou have the right to:\n- Be treated with courtesy and respect.\n- Receive timely updates on your case.\n- Ask questions about fees and strategy at any time.\n\nWe ask that you:\n- Keep us informed of changes to your contact info, treatment, or address.\n- Attend medical appointments and follow provider advice.\n- Refrain from discussing the case on social media.`,
  },
  {
    name: 'HIPAA Authorization (Medical Records Release)',
    category: 'medical',
    description: 'Client authorization allowing providers to release protected health information.',
    body: `AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION (HIPAA)\n\nPatient: {{client_name}}    DOB: {{client_dob}}\n\nI authorize the release of my medical records, billing records, and related information to {{firm_name}} for the purpose of my legal claim ({{case_ref}}).\n\nThis authorization covers records from all treating providers relating to injuries from the incident dated __________. It expires one year from signing unless revoked in writing.\n\nSignature: ____________________   Date: __________`,
  },
  {
    name: 'Medical Records Request Letter',
    category: 'medical',
    description: 'Cover letter to a provider requesting complete records and bills for the client.',
    body: `RE: Records request for {{client_name}}, DOB {{client_dob}}\n\nTo the Custodian of Records:\n\nOur office represents {{client_name}}. Enclosed is a signed HIPAA authorization. Please provide a complete copy of all medical records and itemized billing for treatment related to the incident of __________.\n\nPlease send records to {{firm_name}}. Invoice reasonable copying costs to our office.\n\nThank you,\n{{attorney_name}}`,
  },
  {
    name: 'Letter of Protection / Medical Lien',
    category: 'medical',
    description: 'Assures a provider of payment from settlement so treatment can continue.',
    body: `LETTER OF PROTECTION\n\nRE: {{client_name}} — {{case_ref}}\n\n{{firm_name}} represents the above patient. We request that you continue treatment and withhold collection activity. We agree to protect your reasonable and necessary charges and to pay them from any settlement or judgment, subject to the client's authorization.\n\nThis is not a personal guarantee by the Firm.\n\n{{attorney_name}}`,
  },
  {
    name: 'Letter of Representation (to at-fault carrier)',
    category: 'insurance',
    description: 'Notifies the adverse insurer of representation and directs all contact to the firm.',
    body: `RE: Claim involving {{client_name}} — date of loss __________\n\nTo the Claims Department:\n\nPlease be advised that {{firm_name}} represents {{client_name}} for injuries and damages arising from the above incident. Direct all communications to our office and do not contact our client directly.\n\nPlease confirm coverage and policy limits, and preserve all evidence.\n\n{{attorney_name}}`,
  },
  {
    name: 'Evidence Preservation / Spoliation Letter',
    category: 'insurance',
    description: 'Demands preservation of physical, electronic, and video evidence.',
    body: `NOTICE TO PRESERVE EVIDENCE\n\nRE: {{matter_description}}\n\nYou are hereby notified to preserve all evidence relating to the incident of __________, including but not limited to: vehicles, physical objects, surveillance/dashcam video, ELD/telematics data, maintenance and inspection records, and all electronically stored information.\n\nFailure to preserve this evidence may result in claims of spoliation.\n\n{{attorney_name}}, {{firm_name}}`,
  },
  {
    name: 'Privacy Notice',
    category: 'disclosure',
    description: 'Explains how the firm collects, uses, and safeguards client information.',
    body: `PRIVACY NOTICE\n\n{{firm_name}} respects your privacy. We collect information you provide and records related to your matter solely to represent you. We do not sell your information. We share information only as needed to advance your claim or as required by law, and we use reasonable safeguards to protect it.`,
  },
  {
    name: 'Communication Consent (SMS / Email)',
    category: 'disclosure',
    description: 'Client consent to be contacted by text and email about their case (TCPA).',
    body: `COMMUNICATION CONSENT\n\nI, {{client_name}}, authorize {{firm_name}} to contact me by phone call, text message (SMS), and email regarding my case at the number and address I provided. Message and data rates may apply. I understand I can revoke this consent at any time by replying STOP or notifying the office in writing.\n\nSignature: ____________________   Date: __________`,
  },
  {
    name: 'Settlement Disbursement / Closing Statement',
    category: 'closing',
    description: 'Itemized breakdown of the settlement, fees, liens, costs, and net to client.',
    body: `SETTLEMENT DISBURSEMENT STATEMENT\n\nClient: {{client_name}}    {{case_ref}}\n\nGross settlement:                 $____________\nLess attorney's fee ({{fee_percentage}}%):  $____________\nLess case costs:                  $____________\nLess medical liens:               $____________\n------------------------------------------------\nNet to client:                    $____________\n\nI have reviewed and approve this disbursement.\nClient signature: ____________________   Date: __________`,
  },
  {
    name: 'Disengagement / Case Closing Letter',
    category: 'closing',
    description: 'Confirms the matter is concluded and the file is being closed.',
    body: `Dear {{client_name}},\n\nThis letter confirms that your matter ({{case_ref}}) has concluded and we are closing our file. Please retain your copy of the settlement documents for your records.\n\nIt has been a privilege to represent you. Should you need anything further, please contact us.\n\nSincerely,\n{{attorney_name}}\n{{firm_name}}`,
  },
]

function serializeTemplate(t: any) {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    body: t.body,
    hasFile: Boolean(t.filePath),
    fileName: t.fileName || null,
    fileMime: t.fileMime || null,
    fileSize: t.fileSize || null,
    isPdf: t.fileMime === 'application/pdf',
    isActive: t.isActive,
    sortOrder: t.sortOrder,
    updatedAt: t.updatedAt,
    createdAt: t.createdAt,
  }
}

function parseTemplateBody(body: any) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const category = TEMPLATE_CATEGORY_KEYS.includes(body?.category) ? body.category : 'other'
  return {
    name,
    category,
    description: typeof body?.description === 'string' ? body.description.trim() || null : null,
    body: typeof body?.body === 'string' ? body.body : null,
    isActive: body?.isActive !== false,
  }
}

// GET /v1/firm-dashboard/templates — the firm's template library + metadata
// the create/send UI needs (categories, e-sign providers, signable clients).
router.get('/templates', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })

    const canManage = requireFirmPermission(context, 'manage_users')
    const canViewCases = requireFirmPermission(context, 'view_all_cases')

    const templates = await (prisma as any).firmTemplate.findMany({
      where: { lawFirmId: context.lawFirmId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    // Signable recipients: clients on revealed cases in this firm.
    let recipients: any[] = []
    if (canViewCases) {
      const attorneys = await prisma.attorney.findMany({
        where: { lawFirmId: context.lawFirmId },
        select: { id: true },
      })
      const attorneyIds = attorneys.map((a) => a.id)
      if (attorneyIds.length) {
        const leads = await prisma.leadSubmission.findMany({
          where: {
            assignedAttorneyId: { in: attorneyIds },
            status: { in: ['contacted', 'consulted', 'retained'] },
          },
          select: {
            id: true,
            assignedAttorneyId: true,
            assessment: {
              select: {
                claimType: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        })
        recipients = leads
          .filter((l) => l.assessment?.user?.email)
          .map((l) => {
            const u = l.assessment!.user!
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email!.split('@')[0]
            return {
              leadId: l.id,
              name,
              email: u.email,
              claimType: l.assessment?.claimType || null,
              attorneyId: l.assignedAttorneyId,
            }
          })
      }
    }

    res.json({
      canManage,
      categories: TEMPLATE_CATEGORIES,
      providers: listESignatureProviders(),
      recipients,
      templates: templates.map(serializeTemplate),
    })
  } catch (error) {
    logger.error('Failed to list firm templates', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/templates — create a template.
router.post('/templates', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage templates' })
    }
    const data = parseTemplateBody(req.body)
    if (!data.name) return res.status(400).json({ error: 'A template name is required' })

    const created = await (prisma as any).firmTemplate.create({
      data: { ...data, lawFirmId: context.lawFirmId, createdById: context.user?.id || null },
    })
    res.status(201).json(serializeTemplate(created))
  } catch (error) {
    logger.error('Failed to create firm template', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/templates/seed-recommended — add the starter set,
// skipping any whose name already exists so it's safe to run twice.
router.post('/templates/seed-recommended', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage templates' })
    }

    const existing = await (prisma as any).firmTemplate.findMany({
      where: { lawFirmId: context.lawFirmId },
      select: { name: true },
    })
    const existingNames = new Set(existing.map((t: any) => t.name.toLowerCase()))
    const toCreate = RECOMMENDED_TEMPLATES.filter((t) => !existingNames.has(t.name.toLowerCase()))

    if (toCreate.length) {
      await (prisma as any).firmTemplate.createMany({
        data: toCreate.map((t, i) => ({
          lawFirmId: context.lawFirmId,
          name: t.name,
          category: t.category,
          description: t.description,
          body: t.body,
          sortOrder: i,
          createdById: context.user?.id || null,
        })),
      })
    }

    const templates = await (prisma as any).firmTemplate.findMany({
      where: { lawFirmId: context.lawFirmId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    res.json({ added: toCreate.length, templates: templates.map(serializeTemplate) })
  } catch (error) {
    logger.error('Failed to seed recommended templates', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/firm-dashboard/templates/:id — update fields.
router.patch('/templates/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage templates' })
    }
    const existing = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { id: true },
    })
    if (!existing) return res.status(404).json({ error: 'Template not found' })

    const data = parseTemplateBody(req.body)
    const updated = await (prisma as any).firmTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name || undefined,
        category: data.category,
        description: data.description,
        body: data.body,
        isActive: data.isActive,
      },
    })
    res.json(serializeTemplate(updated))
  } catch (error) {
    logger.error('Failed to update firm template', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/firm-dashboard/templates/:id
router.delete('/templates/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage templates' })
    }
    const existing = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { id: true, filePath: true },
    })
    if (!existing) return res.status(404).json({ error: 'Template not found' })
    if (existing.filePath) {
      try { fs.unlinkSync(existing.filePath) } catch { /* best effort */ }
    }
    await (prisma as any).firmTemplate.delete({ where: { id: existing.id } })
    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete firm template', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/templates/:id/file — attach/replace a source file.
router.post(
  '/templates/:id/file',
  authMiddleware as any,
  templateUpload.single('file'),
  async (req: any, res: Response) => {
    try {
      const context = await getFirmContext(req)
      if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
      if (!requireFirmPermission(context, 'manage_users')) {
        return res.status(403).json({ error: 'You do not have permission to manage templates' })
      }
      const file = req.file
      if (!file) return res.status(400).json({ error: 'A file is required' })

      const existing = await (prisma as any).firmTemplate.findFirst({
        where: { id: req.params.id, lawFirmId: context.lawFirmId },
        select: { id: true, filePath: true },
      })
      if (!existing) return res.status(404).json({ error: 'Template not found' })
      if (existing.filePath) {
        try { fs.unlinkSync(existing.filePath) } catch { /* best effort */ }
      }

      const updated = await (prisma as any).firmTemplate.update({
        where: { id: existing.id },
        data: {
          fileName: file.originalname,
          filePath: file.path,
          fileMime: file.mimetype,
          fileSize: file.size,
        },
      })
      res.json(serializeTemplate(updated))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to attach template file', { message })
      res.status(400).json({ error: message })
    }
  }
)

// DELETE /v1/firm-dashboard/templates/:id/file — remove the attachment.
router.delete('/templates/:id/file', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage templates' })
    }
    const existing = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { id: true, filePath: true },
    })
    if (!existing) return res.status(404).json({ error: 'Template not found' })
    if (existing.filePath) {
      try { fs.unlinkSync(existing.filePath) } catch { /* best effort */ }
    }
    const updated = await (prisma as any).firmTemplate.update({
      where: { id: existing.id },
      data: { fileName: null, filePath: null, fileMime: null, fileSize: null },
    })
    res.json(serializeTemplate(updated))
  } catch (error) {
    logger.error('Failed to remove template file', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/firm-dashboard/templates/:id/file — stream the attachment for view/download.
router.get('/templates/:id/file', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const t = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { filePath: true, fileName: true, fileMime: true },
    })
    if (!t?.filePath || !fs.existsSync(t.filePath)) return res.status(404).json({ error: 'No file attached' })
    res.setHeader('Content-Type', t.fileMime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${t.fileName || 'template'}"`)
    fs.createReadStream(t.filePath).pipe(res)
  } catch (error) {
    logger.error('Failed to stream template file', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/firm-dashboard/templates/:id/preview?leadId= — the template body with
// merge tokens filled from a specific case, for a pre-send preview.
router.get('/templates/:id/preview', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })

    const template = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
      select: { body: true },
    })
    if (!template) return res.status(404).json({ error: 'Template not found' })

    const leadId = String(req.query?.leadId || '').trim()
    const body = typeof template.body === 'string' ? template.body : ''
    if (!leadId) return res.json({ body })

    const tokens = await resolveTemplateTokens(leadId)
    res.json({ body: fillTemplateTokens(body, tokens) })
  } catch (error) {
    logger.error('Failed to preview template', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/templates/:id/send — send a template for signature
// against a case/client: an attached PDF as-is, or the token-filled body → PDF.
router.post('/templates/:id/send', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to send templates for signature' })
    }

    const template = await (prisma as any).firmTemplate.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
    })
    if (!template) return res.status(404).json({ error: 'Template not found' })

    const hasPdf = Boolean(template.filePath) && template.fileMime === 'application/pdf' && fs.existsSync(template.filePath)
    const hasBody = typeof template.body === 'string' && template.body.trim().length > 0
    if (!hasPdf && !hasBody) {
      return res.status(400).json({ error: 'Attach a PDF or add body text before sending for signature' })
    }

    const leadId = String(req.body?.leadId || '').trim()
    const signerName = String(req.body?.signerName || '').trim()
    const signerEmail = String(req.body?.signerEmail || '').trim()
    const provider = req.body?.provider ? String(req.body.provider) : undefined
    const title = String(req.body?.title || '').trim() || template.name
    if (!leadId || !signerName || !signerEmail) {
      return res.status(400).json({ error: 'leadId, signerName and signerEmail are required' })
    }

    // The lead must belong to this firm; pick an attorney to own the envelope.
    const lead = await prisma.leadSubmission.findUnique({
      where: { id: leadId },
      select: { id: true, assignedAttorneyId: true, assignedAttorney: { select: { lawFirmId: true } } },
    })
    if (!lead) return res.status(404).json({ error: 'Case not found' })
    if (lead.assignedAttorney && lead.assignedAttorney.lawFirmId !== context.lawFirmId) {
      return res.status(403).json({ error: 'Case belongs to another firm' })
    }
    const attorneyId = lead.assignedAttorneyId || context.attorney?.id
    if (!attorneyId) {
      return res.status(400).json({ error: 'No attorney available to own this signature request' })
    }

    // Prefer a firm-uploaded PDF as-is; otherwise render the (token-filled) body.
    let filePath: string = template.filePath
    if (!hasPdf && hasBody) {
      const tokens = await resolveTemplateTokens(leadId)
      const filled = fillTemplateTokens(template.body, tokens)
      const rendered = await renderTemplateBodyPdf({ leadId, title, body: filled })
      filePath = rendered.filePath
    }

    const envelope = await createEnvelopeForLead({
      leadId,
      attorneyId,
      providerId: provider,
      documentType: 'other',
      title,
      signerName,
      signerEmail,
      filePath,
    })
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to send template for signature', { message })
    res.status(502).json({ error: 'E-signature provider error', detail: message })
  }
})

// ---------------------------------------------------------------------------
// Firm Workflows — customizable case-lifecycle pipelines (stages + steps).
// This pass defines/customizes workflow templates only.
// ---------------------------------------------------------------------------

const WORKFLOW_ROLES = [
  { value: 'attorney', label: 'Attorney' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'case_manager', label: 'Case manager' },
  { value: 'intake_specialist', label: 'Intake specialist' },
  { value: 'legal_assistant', label: 'Legal assistant' },
  { value: 'demand_writer', label: 'Demand writer' },
  { value: 'billing_admin', label: 'Billing' },
  { value: 'firm_admin', label: 'Firm admin' },
]
const WORKFLOW_ROLE_VALUES = WORKFLOW_ROLES.map((r) => r.value)

type DefaultStep = {
  title: string
  description?: string
  assigneeRole?: string
  dueOffsetDays?: number
  required?: boolean
}
type DefaultStage = { name: string; description?: string; steps: DefaultStep[] }

// A recommended personal-injury case lifecycle. Firms can duplicate/edit freely.
const DEFAULT_WORKFLOW: {
  name: string
  description: string
  practiceArea: string
  stages: DefaultStage[]
} = {
  name: 'Personal Injury — Standard',
  description:
    'Recommended end-to-end lifecycle for a personal injury matter, from intake through closeout. Customize the stages and steps to match how your firm works.',
  practiceArea: 'Personal Injury',
  stages: [
    {
      name: 'Intake & Sign-up',
      description: 'Qualify the lead, run conflicts, and get the client signed.',
      steps: [
        { title: 'Run conflict check', assigneeRole: 'intake_specialist', dueOffsetDays: 0, required: true },
        { title: 'Send retainer for signature', assigneeRole: 'attorney', dueOffsetDays: 1, required: true },
        { title: 'Collect signed HIPAA authorization', assigneeRole: 'paralegal', dueOffsetDays: 2, required: true },
        { title: 'Open matter / create case file', assigneeRole: 'case_manager', dueOffsetDays: 2, required: true },
      ],
    },
    {
      name: 'Investigation & Treatment',
      description: 'Gather evidence and monitor the client’s medical treatment.',
      steps: [
        { title: 'Request police / incident report', assigneeRole: 'paralegal', dueOffsetDays: 5 },
        { title: 'Set up medical treatment tracking', assigneeRole: 'case_manager', dueOffsetDays: 7, required: true },
        { title: 'Collect insurance information', assigneeRole: 'paralegal', dueOffsetDays: 7, required: true },
        { title: 'Monthly treatment status check', assigneeRole: 'case_manager', dueOffsetDays: 30 },
      ],
    },
    {
      name: 'Records & Demand Prep',
      description: 'Collect records and bills, then build the demand.',
      steps: [
        { title: 'Request medical records & bills', assigneeRole: 'paralegal', dueOffsetDays: 60, required: true },
        { title: 'Verify records are complete', assigneeRole: 'case_manager', dueOffsetDays: 90 },
        { title: 'Draft demand letter', assigneeRole: 'demand_writer', dueOffsetDays: 100, required: true },
      ],
    },
    {
      name: 'Demand & Negotiation',
      description: 'Send the demand and negotiate with the adjuster.',
      steps: [
        { title: 'Send demand package', assigneeRole: 'attorney', dueOffsetDays: 105, required: true },
        { title: 'Follow up with adjuster', assigneeRole: 'paralegal', dueOffsetDays: 120 },
        { title: 'Present offers to client', assigneeRole: 'attorney', dueOffsetDays: 130, required: true },
      ],
    },
    {
      name: 'Settlement & Resolution',
      description: 'Finalize the settlement, clear liens, and disburse funds.',
      steps: [
        { title: 'Execute settlement release', assigneeRole: 'attorney', dueOffsetDays: 150, required: true },
        { title: 'Resolve medical liens', assigneeRole: 'paralegal', dueOffsetDays: 160, required: true },
        { title: 'Disburse settlement funds', assigneeRole: 'billing_admin', dueOffsetDays: 170, required: true },
      ],
    },
    {
      name: 'Closeout',
      description: 'Wrap up and archive the matter.',
      steps: [
        { title: 'Send closing letter', assigneeRole: 'case_manager', dueOffsetDays: 175, required: true },
        { title: 'Archive case file', assigneeRole: 'case_manager', dueOffsetDays: 180, required: true },
      ],
    },
  ],
}

function serializeWorkflow(w: any, templateNames: Map<string, string>) {
  const stages = [...(w.stages || [])]
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      steps: [...(s.steps || [])]
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((st: any) => ({
          id: st.id,
          title: st.title,
          description: st.description,
          assigneeRole: st.assigneeRole,
          dueOffsetDays: st.dueOffsetDays,
          required: st.required,
          templateId: st.templateId,
          templateName: st.templateId ? templateNames.get(st.templateId) || null : null,
        })),
    }))
  const stepCount = stages.reduce((n: number, s: any) => n + s.steps.length, 0)
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    practiceArea: w.practiceArea,
    isDefault: w.isDefault,
    isActive: w.isActive,
    sortOrder: w.sortOrder,
    stageCount: stages.length,
    stepCount,
    stages,
    updatedAt: w.updatedAt,
    createdAt: w.createdAt,
  }
}

function parseWorkflowStructure(body: any) {
  const rawStages = Array.isArray(body?.stages) ? body.stages : []
  return rawStages
    .map((s: any) => ({
      name: typeof s?.name === 'string' ? s.name.trim() : '',
      description: typeof s?.description === 'string' ? s.description.trim() || null : null,
      steps: (Array.isArray(s?.steps) ? s.steps : [])
        .map((st: any) => {
          const rawDue = st?.dueOffsetDays
          const dueOffsetDays =
            rawDue === null || rawDue === undefined || rawDue === '' || !Number.isFinite(Number(rawDue))
              ? null
              : Math.max(0, Math.round(Number(rawDue)))
          return {
            title: typeof st?.title === 'string' ? st.title.trim() : '',
            description: typeof st?.description === 'string' ? st.description.trim() || null : null,
            assigneeRole: WORKFLOW_ROLE_VALUES.includes(st?.assigneeRole) ? st.assigneeRole : null,
            dueOffsetDays,
            required: Boolean(st?.required),
            templateId: typeof st?.templateId === 'string' && st.templateId ? st.templateId : null,
          }
        })
        .filter((st: any) => st.title),
    }))
    .filter((s: any) => s.name)
}

async function firmTemplateNameMap(lawFirmId: string): Promise<Map<string, string>> {
  const templates = await (prisma as any).firmTemplate.findMany({
    where: { lawFirmId },
    select: { id: true, name: true },
  })
  return new Map(templates.map((t: any) => [t.id, t.name]))
}

const WORKFLOW_INCLUDE = { stages: { include: { steps: true } } }

// GET /v1/firm-dashboard/workflows — list workflows + editor metadata.
router.get('/workflows', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })

    const canManage = requireFirmPermission(context, 'manage_users')

    const workflows = await (prisma as any).firmWorkflow.findMany({
      where: { lawFirmId: context.lawFirmId },
      include: WORKFLOW_INCLUDE,
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    const templates = await (prisma as any).firmTemplate.findMany({
      where: { lawFirmId: context.lawFirmId, isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: [{ name: 'asc' }],
    })
    const nameMap = new Map<string, string>(templates.map((t: any) => [t.id, t.name] as [string, string]))

    res.json({
      canManage,
      roles: WORKFLOW_ROLES,
      templates: templates.map((t: any) => ({ id: t.id, name: t.name, category: t.category })),
      workflows: workflows.map((w: any) => serializeWorkflow(w, nameMap)),
    })
  } catch (error) {
    logger.error('Failed to list firm workflows', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/workflows — create an (empty) workflow.
router.post('/workflows', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage workflows' })
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) return res.status(400).json({ error: 'A workflow name is required' })

    const count = await (prisma as any).firmWorkflow.count({ where: { lawFirmId: context.lawFirmId } })
    const created = await (prisma as any).firmWorkflow.create({
      data: {
        lawFirmId: context.lawFirmId,
        name,
        description: typeof req.body?.description === 'string' ? req.body.description.trim() || null : null,
        practiceArea: typeof req.body?.practiceArea === 'string' ? req.body.practiceArea.trim() || null : null,
        isDefault: count === 0,
        sortOrder: count,
        createdById: context.user?.id || null,
      },
      include: WORKFLOW_INCLUDE,
    })
    res.status(201).json(serializeWorkflow(created, new Map()))
  } catch (error) {
    logger.error('Failed to create firm workflow', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/firm-dashboard/workflows/seed-default — create the recommended default.
router.post('/workflows/seed-default', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage workflows' })
    }
    const count = await (prisma as any).firmWorkflow.count({ where: { lawFirmId: context.lawFirmId } })
    const created = await (prisma as any).firmWorkflow.create({
      data: {
        lawFirmId: context.lawFirmId,
        name: DEFAULT_WORKFLOW.name,
        description: DEFAULT_WORKFLOW.description,
        practiceArea: DEFAULT_WORKFLOW.practiceArea,
        isDefault: count === 0,
        sortOrder: count,
        createdById: context.user?.id || null,
        stages: {
          create: DEFAULT_WORKFLOW.stages.map((s, si) => ({
            name: s.name,
            description: s.description || null,
            sortOrder: si,
            steps: {
              create: s.steps.map((st, ti) => ({
                title: st.title,
                description: st.description || null,
                assigneeRole: st.assigneeRole || null,
                dueOffsetDays: st.dueOffsetDays ?? null,
                required: Boolean(st.required),
                sortOrder: ti,
              })),
            },
          })),
        },
      },
      include: WORKFLOW_INCLUDE,
    })
    res.status(201).json(serializeWorkflow(created, new Map()))
  } catch (error) {
    logger.error('Failed to seed default workflow', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/firm-dashboard/workflows/:id — update metadata (name, default, etc.).
router.patch('/workflows/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage workflows' })
    }
    const workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
    })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

    const data: any = {}
    if (typeof req.body?.name === 'string') {
      const n = req.body.name.trim()
      if (!n) return res.status(400).json({ error: 'A workflow name is required' })
      data.name = n
    }
    if ('description' in req.body)
      data.description = typeof req.body.description === 'string' ? req.body.description.trim() || null : null
    if ('practiceArea' in req.body)
      data.practiceArea = typeof req.body.practiceArea === 'string' ? req.body.practiceArea.trim() || null : null
    if ('isActive' in req.body) data.isActive = Boolean(req.body.isActive)
    if (req.body?.isDefault === true) {
      await (prisma as any).firmWorkflow.updateMany({
        where: { lawFirmId: context.lawFirmId, id: { not: workflow.id } },
        data: { isDefault: false },
      })
      data.isDefault = true
    } else if (req.body?.isDefault === false) {
      data.isDefault = false
    }

    const updated = await (prisma as any).firmWorkflow.update({
      where: { id: workflow.id },
      data,
      include: WORKFLOW_INCLUDE,
    })
    res.json(serializeWorkflow(updated, await firmTemplateNameMap(context.lawFirmId)))
  } catch (error) {
    logger.error('Failed to update firm workflow', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /v1/firm-dashboard/workflows/:id/structure — replace stages + steps.
router.put('/workflows/:id/structure', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage workflows' })
    }
    const workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
    })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

    const stages = parseWorkflowStructure(req.body)

    // Only allow linking to templates that belong to this firm.
    const templateIds = stages.flatMap((s: any) => s.steps.map((st: any) => st.templateId).filter(Boolean))
    let validTemplateIds = new Set<string>()
    if (templateIds.length) {
      const found = await (prisma as any).firmTemplate.findMany({
        where: { lawFirmId: context.lawFirmId, id: { in: templateIds } },
        select: { id: true },
      })
      validTemplateIds = new Set(found.map((f: any) => f.id))
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.firmWorkflowStage.deleteMany({ where: { workflowId: workflow.id } })
      for (let si = 0; si < stages.length; si++) {
        const s = stages[si]
        await tx.firmWorkflowStage.create({
          data: {
            workflowId: workflow.id,
            name: s.name,
            description: s.description,
            sortOrder: si,
            steps: {
              create: s.steps.map((st: any, ti: number) => ({
                title: st.title,
                description: st.description,
                assigneeRole: st.assigneeRole,
                dueOffsetDays: st.dueOffsetDays,
                required: st.required,
                templateId: st.templateId && validTemplateIds.has(st.templateId) ? st.templateId : null,
                sortOrder: ti,
              })),
            },
          },
        })
      }
      await tx.firmWorkflow.update({ where: { id: workflow.id }, data: { updatedAt: new Date() } })
    })

    const fresh = await (prisma as any).firmWorkflow.findUnique({
      where: { id: workflow.id },
      include: WORKFLOW_INCLUDE,
    })
    res.json(serializeWorkflow(fresh, await firmTemplateNameMap(context.lawFirmId)))
  } catch (error) {
    logger.error('Failed to save workflow structure', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/firm-dashboard/workflows/:id
router.delete('/workflows/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage workflows' })
    }
    const workflow = await (prisma as any).firmWorkflow.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
    })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

    await (prisma as any).firmWorkflow.delete({ where: { id: workflow.id } })

    // If we removed the default, promote the earliest remaining workflow.
    if (workflow.isDefault) {
      const next = await (prisma as any).firmWorkflow.findFirst({
        where: { lawFirmId: context.lawFirmId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      if (next) {
        await (prisma as any).firmWorkflow.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }
    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete firm workflow', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Team time tracking & billing rates.
// ---------------------------------------------------------------------------

// Firm members with their user identity, for rate config + on-behalf entry.
async function firmMemberDirectory(lawFirmId: string) {
  const members = await (prisma as any).firmMember.findMany({
    where: { lawFirmId, status: { in: ['active', 'invited'] } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  })
  return members.map((m: any) => {
    const name =
      [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() ||
      m.user?.email ||
      'Member'
    return { firmMemberId: m.id, userId: m.userId, name, role: m.role, email: m.user?.email || null }
  })
}

// GET /v1/firm-dashboard/billing-rates — role defaults + per-person overrides.
router.get('/billing-rates', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const canManage = requireFirmPermission(context, 'manage_users')

    const rates = await (prisma as any).billingRate.findMany({ where: { lawFirmId: context.lawFirmId } })
    const roleRates: Record<string, number> = {}
    const memberRates: Record<string, number> = {}
    for (const r of rates) {
      if (r.role) roleRates[r.role] = r.hourlyRate
      else if (r.firmMemberId) memberRates[r.firmMemberId] = r.hourlyRate
    }

    res.json({
      canManage,
      roles: TIME_ROLES,
      activityTypes: ACTIVITY_TYPES,
      members: await firmMemberDirectory(context.lawFirmId),
      roleRates,
      memberRates,
    })
  } catch (error) {
    logger.error('Failed to load billing rates', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /v1/firm-dashboard/billing-rates — upsert/clear role + member rates.
router.put('/billing-rates', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to manage billing rates' })
    }

    const roleRates = Array.isArray(req.body?.roleRates) ? req.body.roleRates : []
    const memberRates = Array.isArray(req.body?.memberRates) ? req.body.memberRates : []

    for (const rr of roleRates) {
      const role = String(rr?.role || '')
      if (!TIME_ROLE_VALUES.includes(role)) continue
      const raw = rr?.hourlyRate
      if (raw === null || raw === undefined || raw === '' || Number(raw) <= 0) {
        await (prisma as any).billingRate.deleteMany({ where: { lawFirmId: context.lawFirmId, role } })
      } else {
        const hourlyRate = Math.round(Number(raw) * 100) / 100
        const existing = await (prisma as any).billingRate.findFirst({
          where: { lawFirmId: context.lawFirmId, role },
        })
        if (existing) await (prisma as any).billingRate.update({ where: { id: existing.id }, data: { hourlyRate } })
        else await (prisma as any).billingRate.create({ data: { lawFirmId: context.lawFirmId, role, hourlyRate } })
      }
    }

    for (const mr of memberRates) {
      const firmMemberId = String(mr?.firmMemberId || '')
      if (!firmMemberId) continue
      const raw = mr?.hourlyRate
      if (raw === null || raw === undefined || raw === '' || Number(raw) <= 0) {
        await (prisma as any).billingRate.deleteMany({ where: { lawFirmId: context.lawFirmId, firmMemberId } })
      } else {
        const hourlyRate = Math.round(Number(raw) * 100) / 100
        const existing = await (prisma as any).billingRate.findFirst({
          where: { lawFirmId: context.lawFirmId, firmMemberId },
        })
        if (existing) await (prisma as any).billingRate.update({ where: { id: existing.id }, data: { hourlyRate } })
        else
          await (prisma as any).billingRate.create({
            data: { lawFirmId: context.lawFirmId, firmMemberId, hourlyRate },
          })
      }
    }

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to save billing rates', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Build a where-clause + name/case maps shared by list + CSV.
async function buildTimeEntryQuery(context: any, query: any) {
  const where: any = { lawFirmId: context.lawFirmId }
  if (query.status && ['draft', 'submitted', 'approved', 'rejected', 'invoiced'].includes(String(query.status)))
    where.status = String(query.status)
  if (query.firmMemberId) where.firmMemberId = String(query.firmMemberId)
  if (query.assessmentId) where.assessmentId = String(query.assessmentId)
  if (query.from || query.to) {
    where.workDate = {}
    if (query.from) where.workDate.gte = new Date(String(query.from))
    if (query.to) where.workDate.lte = new Date(String(query.to))
  }
  const entries = await (prisma as any).timeEntry.findMany({ where, orderBy: { workDate: 'desc' }, take: 1000 })

  // Worker names via firm member directory.
  const dir = await firmMemberDirectory(context.lawFirmId)
  const nameByMember = new Map<string, string>(dir.map((m: any) => [m.firmMemberId, m.name]))

  // Case labels via assessment client names.
  const assessmentIds = [...new Set(entries.map((e: any) => e.assessmentId).filter(Boolean))] as string[]
  const caseLabelById = new Map<string, string>()
  if (assessmentIds.length) {
    const assessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
      select: { id: true, claimType: true, user: { select: { firstName: true, lastName: true } } },
    })
    for (const a of assessments) {
      const client = [a.user?.firstName, a.user?.lastName].filter(Boolean).join(' ').trim()
      caseLabelById.set(a.id, client || a.claimType || 'Case')
    }
  }
  return { entries, nameByMember, caseLabelById }
}

// GET /v1/firm-dashboard/time-entries — firm-wide review + totals.
router.get('/time-entries', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    const canManage = requireFirmPermission(context, 'manage_users')

    const { entries, nameByMember, caseLabelById } = await buildTimeEntryQuery(context, req.query)
    const serialized = entries.map((e: any) =>
      serializeTimeEntry(
        e,
        e.firmMemberId ? nameByMember.get(e.firmMemberId) || null : null,
        e.assessmentId ? caseLabelById.get(e.assessmentId) || null : null
      )
    )

    const totalMinutes = entries.reduce((n: number, e: any) => n + e.minutes, 0)
    const billableMinutes = entries.filter((e: any) => e.billable).reduce((n: number, e: any) => n + e.minutes, 0)
    const billableAmount = entries.reduce((n: number, e: any) => n + (e.amount || 0), 0)
    const unbilledAmount = entries
      .filter((e: any) => e.status !== 'invoiced')
      .reduce((n: number, e: any) => n + (e.amount || 0), 0)
    const pendingApproval = entries.filter((e: any) => e.status === 'submitted').length

    res.json({
      canManage,
      members: await firmMemberDirectory(context.lawFirmId),
      entries: serialized,
      totals: {
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        billableHours: Math.round((billableMinutes / 60) * 100) / 100,
        billableAmount: Math.round(billableAmount * 100) / 100,
        unbilledAmount: Math.round(unbilledAmount * 100) / 100,
        pendingApproval,
        entryCount: entries.length,
      },
    })
  } catch (error) {
    logger.error('Failed to load time entries', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/firm-dashboard/time-entries/:id — approve / reject / mark invoiced.
router.patch('/time-entries/:id', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to review time' })
    }
    const entry = await (prisma as any).timeEntry.findFirst({
      where: { id: req.params.id, lawFirmId: context.lawFirmId },
    })
    if (!entry) return res.status(404).json({ error: 'Time entry not found' })

    const status = String(req.body?.status || '')
    if (!['submitted', 'approved', 'rejected', 'invoiced'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const updated = await (prisma as any).timeEntry.update({
      where: { id: entry.id },
      data: {
        status,
        approvedById: status === 'approved' ? context.user?.id || null : entry.approvedById,
        approvedAt: status === 'approved' ? new Date() : status === 'rejected' ? null : entry.approvedAt,
      },
    })
    res.json(serializeTimeEntry(updated))
  } catch (error) {
    logger.error('Failed to update time entry', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/firm-dashboard/time-entries/export.csv — export current filter to CSV.
router.get('/time-entries/export.csv', authMiddleware as any, async (req: any, res: Response) => {
  try {
    const context = await getFirmContext(req)
    if (!context) return res.status(404).json({ error: 'No law firm associated with this user' })
    if (!requireFirmPermission(context, 'manage_users')) {
      return res.status(403).json({ error: 'You do not have permission to export time' })
    }
    const { entries, nameByMember, caseLabelById } = await buildTimeEntryQuery(context, req.query)

    const esc = (v: any) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['Date', 'Worker', 'Role', 'Case', 'Activity', 'Hours', 'Billable', 'Rate', 'Amount', 'Status', 'Description']
    const rows = entries.map((e: any) => [
      new Date(e.workDate).toISOString().slice(0, 10),
      e.firmMemberId ? nameByMember.get(e.firmMemberId) || '' : '',
      e.role || '',
      e.assessmentId ? caseLabelById.get(e.assessmentId) || '' : '',
      e.activityType,
      (e.minutes / 60).toFixed(2),
      e.billable ? 'yes' : 'no',
      e.hourlyRate ?? '',
      e.amount ?? '',
      e.status,
      e.description || '',
    ])
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="time-entries.csv"')
    res.send(csv)
  } catch (error) {
    logger.error('Failed to export time entries', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

