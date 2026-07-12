import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { sendTransactionalEmail } from '../lib/claims'
import { computeMarketplacePerformance, computeMarketplacePerformanceByAttorney } from '../lib/marketplace-performance'

const router: Router = Router()

// Best-effort invite email for a newly added firm member. Never throws so it
// can't fail the member-creation request (#226).
async function sendFirmMemberInvite(params: {
  to: string
  firstName?: string | null
  firmName?: string | null
  role: string
}): Promise<boolean> {
  try {
    if (!params.to) return false
    const base = (process.env.WEB_URL || 'https://www.clearcaseiq.com').replace(/\/$/, '')
    const roleLabel = params.role.replace(/_/g, ' ')
    const body = [
      `Hi ${params.firstName || 'there'},`,
      '',
      `You've been added to ${params.firmName || 'your law firm'} on ClearCaseIQ as a ${roleLabel}.`,
      '',
      `Sign in (or create your password if this is your first time) to get started:`,
      `${base}/login`,
      '',
      'If you were not expecting this, you can ignore this email.',
      '',
      '— The ClearCaseIQ team',
    ].join('\n')
    return await sendTransactionalEmail({ to: params.to, subject: `You've been added to ${params.firmName || 'a law firm'} on ClearCaseIQ`, body })
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
        status: 'active',
        joinedAt: new Date()
      },
      create: {
        lawFirmId: context.lawFirmId,
        userId: user.id,
        attorneyId: attorney?.id || null,
        officeId: typeof officeId === 'string' && officeId ? officeId : null,
        role,
        title: typeof title === 'string' ? title.trim() : null,
        status: 'active',
        invitedAt: new Date(),
        joinedAt: new Date()
      }
    })

    // Look up the firm name for a friendlier invite, then send best-effort.
    let firmName: string | null = null
    try {
      const firm = await prisma.lawFirm.findUnique({ where: { id: context.lawFirmId }, select: { name: true } })
      firmName = firm?.name ?? null
    } catch { /* non-fatal */ }
    void sendFirmMemberInvite({ to: normalizedEmail, firstName: user.firstName, firmName, role })

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
        status: 'active',
        joinedAt: new Date()
      },
      create: {
        lawFirmId: currentAttorney.lawFirmId,
        userId: memberUser.id,
        attorneyId: attorney.id,
        role: 'attorney',
        officeId: resolvedOfficeId,
        status: 'active',
        invitedAt: new Date(),
        joinedAt: new Date()
      }
    }).catch((memberError: any) => {
      logger.warn('Failed to create firm member for attorney', {
        error: memberError?.message,
        attorneyId: attorney.id,
        lawFirmId: currentAttorney.lawFirmId
      })
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
    const attorneyLeadStats = new Map<string, { routed: number; accepted: number }>()
    try {
      await Promise.all(
        attorneys.map(async (a: any) => {
          const universe = {
            OR: [
              { assignedAttorneyId: a.id },
              { assessment: { introductions: { some: { attorneyId: a.id } } } },
            ],
          }
          const [routed, accepted] = await Promise.all([
            prisma.leadSubmission.count({ where: universe }),
            prisma.leadSubmission.count({
              where: { AND: [universe, { status: { in: ACCEPTED_LEAD_STATUSES } }] },
            }),
          ])
          attorneyLeadStats.set(a.id, { routed, accepted })
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
          feesCollectedFromPayments: totalFeesByAttorneyId.get(a.id) || 0,
          totalPlatformSpend: attorneySpend.get(a.id) ?? a.dashboard?.totalPlatformSpend ?? 0,
        }
      }))
    }

    res.json(response)
  } catch (error: any) {
    logger.error('Failed to get firm dashboard')
    res.status(500).json({ error: 'Failed to load firm dashboard' })
  }
})

export default router

