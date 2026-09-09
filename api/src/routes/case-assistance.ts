/**
 * Case Assistance API — the specialist queue and workspace.
 *
 * Keyed on `assessmentId`, not `leadId`. Specialists work cases in the window
 * between a report generating and the plaintiff submitting for attorney review,
 * and no `LeadSubmission` exists in that window.
 *
 * The AI panel is not new intelligence. It calls the same four engines the
 * attorney workspace calls — `buildCaseIntelligence`, `buildBaselineQuestions`
 * + `generateIntelligentQuestions`, `computeCasePreparation` and
 * `buildCaseCoach` — which all take an assessment id directly. Only the
 * authorization and the presentation are new.
 *
 * Still never writes `Assessment.facts` directly. A specialist who takes an
 * answer on a call *proposes* it (`POST /:id/proposals`); the claimant confirms
 * it before it becomes their answer. See `docs/case-assistance-phase-2.md`.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import {
  ADMIN_ROLE,
  CASE_ASSISTANCE_WORKER_ROLES,
  canWorkCaseAssistance,
  isCaseAssistanceManager,
  specialistMiddleware,
  SPECIALIST_ROLE,
} from '../lib/specialist-access'
import {
  ACTIVE_ASSISTANCE_STATUSES,
  ASSISTANCE_PRIORITIES,
  ASSISTANCE_STATUSES,
  UNCONTACTED_ASSISTANCE_STATUSES,
  deriveAssistancePhase,
  isAssistanceStatus,
  type AssistanceStatus,
} from '../lib/case-assistance'
import { reassignCaseAssistance } from '../lib/case-assistance-assignment'
import { parsePagination, paginated } from '../lib/pagination'
import { plaintiffNameOf, resolveCaseName } from '../lib/case-name'
import { buildCaseIntelligence, type CaseGap } from '../lib/case-intelligence'
import { factPathsForGap } from '../lib/case-gap-facts'
import { buildBaselineQuestions } from '../lib/intake-questions'
import { generateIntelligentQuestions } from '../services/intelligent-questions'
import { computeCasePreparation } from '../lib/case-insights'
import { buildCaseCoach } from '../lib/case-coach'
import { deliverDirectNotification } from '../lib/platform-notifications'
import { PLAINTIFF_EVENTS } from '../lib/notification-events'
import { webUrl } from '../lib/app-url'
import { PROPOSABLE_FACT_PATHS, isProposableFactPath, readFactPath } from '../lib/case-fact-paths'
import { createSpecialistFactProposal, factPathOf, proposalFieldLabel } from '../lib/case-reconciliation'
import { checkUplBoundary, describeUplViolations } from '../lib/upl-guard'
import { parseCaseFacts } from '../lib/case-facts'
import {
  DOCUMENT_REQUEST_LABELS,
  normalizeRequestedDocKey,
  normalizeRequestedDocKeys,
} from '../lib/document-request-status'

const router: ExpressRouter = Router()

router.use(authMiddleware, specialistMiddleware)

const INTERACTION_CHANNELS = ['call', 'sms', 'email', 'in_app', 'other'] as const
const INTERACTION_OUTCOMES = [
  'reached',
  'voicemail',
  'no_answer',
  'callback_requested',
  'wrong_number',
  'sent',
  'received',
] as const

// ---------------------------------------------------------------------------
// Shared loading
// ---------------------------------------------------------------------------

/** Everything the queue and workspace read off the case itself. */
const ASSESSMENT_SELECT = {
  id: true,
  claimType: true,
  venueState: true,
  venueCounty: true,
  status: true,
  caseName: true,
  referenceCode: true,
  facts: true,
  createdAt: true,
  manualReviewStatus: true,
  manualReviewReason: true,
  user: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferredLanguage: true },
  },
  leadSubmission: { select: { id: true, lifecycleState: true, status: true } },
} as const

function parseFacts(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  try {
    return JSON.parse(String(raw)) as Record<string, any>
  } catch {
    return {}
  }
}

/**
 * Contact details, preferring the account over the intake answers.
 *
 * Guest intake creates a shadow user whose email is `guest+<id>@caseiq.local`,
 * which is not reachable — the real address is in `facts.plaintiffContext`, so
 * a specialist calling a guest case needs the fallback rather than a bounce.
 */
function contactOf(assessment: { user?: any; facts?: unknown }) {
  const facts = parseFacts(assessment.facts)
  const context = facts.plaintiffContext || {}
  const accountEmail = assessment.user?.email || ''
  const isShadow = /^guest\+.*@caseiq\.local$/i.test(accountEmail)

  return {
    email: (isShadow ? '' : accountEmail) || context.email || null,
    phone: assessment.user?.phone || context.phone || null,
    city: context.city || facts.incident?.city || null,
    preferredLanguage: assessment.user?.preferredLanguage || context.preferredLanguage || null,
  }
}

function serializeQueueRow(assistance: any) {
  const assessment = assistance.assessment
  const contact = contactOf(assessment)
  const now = Date.now()

  return {
    id: assistance.id,
    assessmentId: assistance.assessmentId,
    caseName: resolveCaseName(assessment),
    plaintiffName: plaintiffNameOf(assessment),
    referenceCode: assessment.referenceCode,
    claimType: assessment.claimType,
    city: contact.city,
    venueCounty: assessment.venueCounty,
    email: contact.email,
    phone: contact.phone,
    preferredLanguage: contact.preferredLanguage,
    status: assistance.status,
    priority: assistance.priority,
    nextAction: assistance.nextAction,
    assignedSpecialist: assistance.assignedSpecialist
      ? {
          id: assistance.assignedSpecialist.id,
          name: [assistance.assignedSpecialist.firstName, assistance.assignedSpecialist.lastName]
            .filter(Boolean)
            .join(' '),
        }
      : null,
    assignedAt: assistance.assignedAt,
    reviewDueAt: assistance.reviewDueAt,
    // Computed here rather than in the client so the queue and any future
    // reminder job agree on what "late" means.
    isOverdue: !!assistance.reviewDueAt && new Date(assistance.reviewDueAt).getTime() < now,
    lastContactAt: assistance.lastContactAt,
    firstContactAt: assistance.firstContactAt,
    createdAt: assistance.createdAt,
    // A compliance hold, shown next to the workflow status rather than folded
    // into it — `request_info` would otherwise be indistinguishable from
    // `document_requested`, which is an ops state with no legal weight.
    manualReviewStatus: assessment.manualReviewStatus,
    manualReviewReason: assessment.manualReviewReason,
    phase: deriveAssistancePhase({
      assessmentStatus: assessment.status,
      lifecycleState: assessment.leadSubmission?.lifecycleState,
      hasLeadSubmission: !!assessment.leadSubmission,
      assistanceStatus: assistance.status,
    }),
  }
}

/**
 * Load an assistance record the caller is allowed to open.
 *
 * Specialists see their own cases plus anything unassigned; managers see the
 * whole queue. Returning 404 rather than 403 for someone else's case is
 * deliberate — the existence of a case is itself claimant information.
 */
async function loadAssistance(req: AuthRequest, id: string) {
  const assistance = await prisma.caseAssistance.findUnique({
    where: { id },
    include: {
      assignedSpecialist: { select: { id: true, firstName: true, lastName: true, email: true } },
      assessment: { select: ASSESSMENT_SELECT },
    },
  })
  if (!assistance) return null

  if (isCaseAssistanceManager(req.user)) return assistance
  const mine = assistance.assignedSpecialistId === req.user?.id
  return mine || !assistance.assignedSpecialistId ? assistance : null
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

/** Restrict the queue to what the caller may see, before any user filter. */
function visibilityWhere(req: AuthRequest): Record<string, unknown> {
  if (isCaseAssistanceManager(req.user)) return {}
  return {
    OR: [{ assignedSpecialistId: req.user?.id }, { assignedSpecialistId: null }],
  }
}

router.get('/queue', async (req: AuthRequest, res) => {
  try {
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 25,
      maxLimit: 100,
    })
    const tab = String(req.query.tab || 'mine')
    const status = String(req.query.status || '').trim()
    const priority = String(req.query.priority || '').trim()
    const search = String(req.query.search || '').trim()
    const sort = String(req.query.sort || 'due')

    const where: Record<string, unknown> = { ...visibilityWhere(req) }

    if (tab === 'mine') where.assignedSpecialistId = req.user?.id
    else if (tab === 'unassigned') where.assignedSpecialistId = null

    if (status) where.status = status
    // The default view is the working set. Without this, cases handed to
    // attorneys weeks ago sit at the top of everyone's queue forever.
    else where.status = { in: ACTIVE_ASSISTANCE_STATUSES }

    if (priority) where.priority = priority

    if (search) {
      // Assessment.facts is a text blob, so intake-only contact details are not
      // searchable here. Name, email, reference code and claim type cover how
      // a specialist actually looks for a case: from a returned call.
      where.assessment = {
        OR: [
          { referenceCode: { contains: search, mode: 'insensitive' } },
          { caseName: { contains: search, mode: 'insensitive' } },
          { claimType: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    // `due` puts the SLA first and sorts never-assigned cases last, since a null
    // reviewDueAt is "not yet claimed" rather than "no deadline".
    const orderBy =
      sort === 'oldest'
        ? [{ createdAt: 'asc' as const }]
        : sort === 'newest'
          ? [{ createdAt: 'desc' as const }]
          : sort === 'contact'
            ? [{ lastContactAt: 'asc' as const }, { createdAt: 'asc' as const }]
            : [{ reviewDueAt: 'asc' as const }, { createdAt: 'asc' as const }]

    const [rows, total] = await Promise.all([
      prisma.caseAssistance.findMany({
        where,
        include: {
          assignedSpecialist: { select: { id: true, firstName: true, lastName: true } },
          assessment: { select: ASSESSMENT_SELECT },
        },
        orderBy,
        take,
        skip,
      }),
      prisma.caseAssistance.count({ where }),
    ])

    const data = rows.map(serializeQueueRow)
    res.json({ success: true, data, ...paginated(data, total, { take, skip }) })
  } catch (error) {
    logger.error('Failed to load case assistance queue', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * The counts strip above the queue.
 *
 * Scoped the same way the queue is, so the numbers match the rows a specialist
 * can actually open. Manager totals are a separate, explicitly unscoped block.
 */
router.get('/counts', async (req: AuthRequest, res) => {
  try {
    const scope = visibilityWhere(req)

    const [mine, statusGroups] = await Promise.all([
      prisma.caseAssistance.count({
        where: { assignedSpecialistId: req.user?.id, status: { in: ACTIVE_ASSISTANCE_STATUSES } },
      }),
      // One row per status rather than a hand-picked set of derived buckets.
      // The strip used to mix assignment, SLA and workflow concepts — overdue,
      // needs contact, waiting on claimant — which left most of the workflow
      // itself uncounted and no way to see how many cases sat in any given
      // status.
      prisma.caseAssistance.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
      }),
    ])

    // Seeded with every status so a status nobody is in reports 0 rather than
    // going missing from the strip.
    const byStatus = Object.fromEntries(ASSISTANCE_STATUSES.map((status) => [status, 0])) as Record<
      AssistanceStatus,
      number
    >
    for (const row of statusGroups) {
      if (isAssistanceStatus(row.status)) byStatus[row.status] = row._count._all
    }

    res.json({
      success: true,
      counts: { mine, byStatus },
      isManager: isCaseAssistanceManager(req.user),
    })
  } catch (error) {
    logger.error('Failed to load case assistance counts', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Manager view: totals across the whole queue plus a per-specialist breakdown.
 *
 * Deliberately just counts. Time to first contact, contact success rate and
 * readiness improvement are phase 2 — they need the interaction log to have
 * accumulated real history first, and `AdminAnalytics` has no internal-staff
 * section to hang them on yet.
 */
router.get('/manager/overview', async (req: AuthRequest, res) => {
  try {
    if (!isCaseAssistanceManager(req.user)) {
      return res.status(403).json({ error: 'Manager access required' })
    }
    const now = new Date()

    const [byStatus, specialists, activeBySpecialist, needsContactBySpecialist, overdueBySpecialist] =
      await Promise.all([
        prisma.caseAssistance.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.user.findMany({
          where: { role: { in: [...CASE_ASSISTANCE_WORKER_ROLES] }, isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        prisma.caseAssistance.groupBy({
          by: ['assignedSpecialistId'],
          where: { status: { in: ACTIVE_ASSISTANCE_STATUSES } },
          _count: { _all: true },
        }),
        prisma.caseAssistance.groupBy({
          by: ['assignedSpecialistId'],
          where: { status: { in: UNCONTACTED_ASSISTANCE_STATUSES } },
          _count: { _all: true },
        }),
        prisma.caseAssistance.groupBy({
          by: ['assignedSpecialistId'],
          where: { status: { in: ACTIVE_ASSISTANCE_STATUSES }, reviewDueAt: { lt: now } },
          _count: { _all: true },
        }),
      ])

    const countBy = (rows: typeof activeBySpecialist) =>
      new Map(rows.map((row) => [row.assignedSpecialistId, row._count._all]))
    const active = countBy(activeBySpecialist)
    const needsContact = countBy(needsContactBySpecialist)
    const overdue = countBy(overdueBySpecialist)

    res.json({
      success: true,
      byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
      unassigned: active.get(null) ?? 0,
      // Admins can hold a case, so one who does has to appear here or their
      // workload is invisible to the team view. Those who hold nothing are
      // left out: this card is about who is carrying what, and listing every
      // administrator at zero buries the specialists it exists to show.
      specialists: specialists
        .map((worker) => ({
          id: worker.id,
          name: [worker.firstName, worker.lastName].filter(Boolean).join(' ') || worker.email,
          active: active.get(worker.id) ?? 0,
          needsContact: needsContact.get(worker.id) ?? 0,
          overdue: overdue.get(worker.id) ?? 0,
          isAdmin: worker.role === ADMIN_ROLE,
        }))
        .filter((worker) => !worker.isAdmin || worker.active > 0),
    })
  } catch (error) {
    logger.error('Failed to load case assistance manager overview', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Everyone a case can be assigned to, for the picker.
 *
 * Admins are included because they work the queue in their supervisory
 * capacity — `canWorkCaseAssistance` says so, and the PATCH below already
 * accepts them. Listing specialists only meant an admin could not assign a case
 * to themselves or to another admin from the screen, even though the same
 * assignment succeeded through the API.
 *
 * Specialists sort first: they are who a case normally goes to, and an admin
 * holding one is the exception.
 */
router.get('/specialists', async (req: AuthRequest, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: { in: [...CASE_ASSISTANCE_WORKER_ROLES] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    })
    const ranked = [...workers].sort(
      (a, b) => Number(a.role === ADMIN_ROLE) - Number(b.role === ADMIN_ROLE),
    )
    res.json({
      success: true,
      data: ranked.map((worker) => ({
        id: worker.id,
        name: [worker.firstName, worker.lastName].filter(Boolean).join(' ') || worker.email,
        email: worker.email,
        role: worker.role,
      })),
    })
  } catch (error) {
    logger.error('Failed to list case assistance workers', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/**
 * The workspace's left and centre panes: identity, readiness and a read-only
 * case summary. The AI panel loads separately because it can call an LLM, and
 * the case should be readable while that is in flight.
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const assessment = assistance.assessment
    const [preparation, interactions, evidenceCount, evidenceFiles] = await Promise.all([
      computeCasePreparation(assessment.id).catch(() => null),
      prisma.caseInteraction.findMany({
        where: { assistanceId: assistance.id },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      prisma.evidenceFile.count({ where: { assessmentId: assessment.id } }),
      // What is actually on the case, not just how many. A specialist chasing
      // documents has to be able to see what already arrived before asking for
      // it again.
      prisma.evidenceFile.findMany({
        where: { assessmentId: assessment.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          originalName: true,
          category: true,
          mimetype: true,
          size: true,
          fileUrl: true,
          createdAt: true,
          provenanceSource: true,
        },
      }),
    ])

    const facts = parseFacts(assessment.facts)
    const contact = contactOf(assessment)

    res.json({
      success: true,
      assistance: serializeQueueRow(assistance),
      contact,
      readiness: preparation
        ? {
            // Percentages are fine on an employee screen. They stay off
            // plaintiff surfaces on purpose: `Results.tsx` shows a band and a
            // fraction because a bare percentage was read as a win probability.
            score: preparation.readinessScore,
            factors: preparation.readinessFactors,
            strengths: preparation.strengths,
            weaknesses: preparation.weaknesses,
            missingDocs: preparation.missingDocs,
            treatmentGaps: preparation.treatmentGaps,
          }
        : null,
      summary: {
        claimType: assessment.claimType,
        venueState: assessment.venueState,
        venueCounty: assessment.venueCounty,
        submittedAt: assessment.createdAt,
        evidenceCount,
        incident: facts.incident || null,
        injuries: facts.injuries || facts.injury || null,
        treatment: facts.treatment || null,
        employment: facts.employment || null,
        insurance: facts.insurance || null,
        narrative: typeof facts.narrative === 'string' ? facts.narrative : null,
      },
      interactions: interactions.map(serializeInteraction),
      documents: evidenceFiles.map((file) => ({
        id: file.id,
        name: file.originalName,
        category: file.category,
        // The same label the request and the claimant's email use, so "Medical
        // bills" asked for reads as "Medical bills" received.
        categoryLabel: file.category
          ? DOCUMENT_REQUEST_LABELS[normalizeRequestedDocKey(file.category)] || null
          : null,
        mimetype: file.mimetype,
        size: file.size,
        fileUrl: file.fileUrl,
        uploadedAt: file.createdAt,
        // Claimant uploads are the default; anything else was added on their
        // behalf and should not read as the claimant having sent it.
        source: file.provenanceSource || 'claimant',
      })),
    })
  } catch (error) {
    logger.error('Failed to load case assistance workspace', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * The AI panel. Three engines, one request, because a specialist reads them
 * together: what is missing, what to ask, and what to do next.
 */
router.get('/:id/ai', async (req: AuthRequest, res) => {
  try {
    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const intelligence = await buildCaseIntelligence(assistance.assessmentId)
    if (!intelligence) return res.status(404).json({ error: 'Case data not available yet' })

    // The question generator calls an LLM and the coach does not, so they run in
    // parallel rather than the panel waiting on the slower one twice.
    const [questions, coach] = await Promise.all([
      generateIntelligentQuestions(intelligence, buildBaselineQuestions(intelligence), {
        // A specialist is reading a call script, not filling in a form.
        voice: 'employee',
      }).catch((error: any) => {
        logger.warn('Specialist question generation failed', { error: error?.message })
        return null
      }),
      buildCaseCoach(assistance.assessmentId).catch(() => null),
    ])

    // Which gaps a recorded answer can close, resolved here so the workbench
    // does not keep a second copy of the mapping and drift from it. A gap with
    // no paths needs a document or a structured-record change instead, and the
    // UI uses that to decide whether offering "record an answer" is honest.
    const withFactPaths = (gap: CaseGap) => ({ ...gap, factPaths: factPathsForGap(gap.key) })
    const openGaps = intelligence.gaps.filter((gap) => !gap.resolved).map(withFactPaths)

    res.json({
      success: true,
      generatedAt: intelligence.generatedAt,
      summary: intelligence.summary,
      known: intelligence.known,
      // Split so the panel can lead with what actually costs the case value,
      // instead of a flat list a specialist has to triage on the phone.
      gaps: {
        highPriority: openGaps.filter((gap) => gap.severity >= 4),
        recommended: openGaps.filter((gap) => gap.severity < 4),
        resolved: intelligence.gaps.filter((gap) => gap.resolved).map(withFactPaths),
      },
      questions: questions?.questions ?? [],
      questionSource: questions?.source ?? 'unavailable',
      coach: coach ? { headline: coach.headline, insights: coach.insights } : null,
    })
  } catch (error) {
    logger.error('Failed to load case assistance AI panel', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Mutations — assistance workflow only, never case answers
// ---------------------------------------------------------------------------

const UpdateSchema = z.object({
  status: z.enum(ASSISTANCE_STATUSES).optional(),
  priority: z.enum(ASSISTANCE_PRIORITIES).optional(),
  nextAction: z.string().trim().max(200).nullable().optional(),
  /** Null hands the case back to the unassigned queue. */
  assignedSpecialistId: z.string().nullable().optional(),
})

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const { status, priority, nextAction, assignedSpecialistId } = parsed.data

    // Reassigning someone else's case is a manager action. Claiming an
    // unassigned case for yourself is not, which is the whole point of the
    // Unassigned tab.
    if (assignedSpecialistId !== undefined) {
      const claimingForSelf = assignedSpecialistId === req.user?.id && !assistance.assignedSpecialistId
      if (!claimingForSelf && !isCaseAssistanceManager(req.user)) {
        return res.status(403).json({ error: 'Only a manager can reassign a case' })
      }
      if (assignedSpecialistId) {
        const target = await prisma.user.findFirst({
          where: { id: assignedSpecialistId, isActive: true },
          select: { id: true, role: true, email: true },
        })
        if (!target || !canWorkCaseAssistance(target)) {
          return res.status(400).json({ error: 'That user is not an active Case Specialist' })
        }
      }
      await reassignCaseAssistance(assistance.id, assignedSpecialistId)
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (priority !== undefined) data.priority = priority
    if (nextAction !== undefined) data.nextAction = nextAction || null
    // There are two ways out of this queue and both finish the case: handover to
    // attorneys, and the plaintiff declining to go on. Moving a case back into
    // the working set clears the stamp, so one reopened after a denial does not
    // keep reporting a closing date it no longer has.
    if (status !== undefined) {
      data.closedAt = ACTIVE_ASSISTANCE_STATUSES.includes(status) ? null : new Date()
    }

    const updated = Object.keys(data).length
      ? await prisma.caseAssistance.update({
          where: { id: assistance.id },
          data,
          include: {
            assignedSpecialist: { select: { id: true, firstName: true, lastName: true } },
            assessment: { select: ASSESSMENT_SELECT },
          },
        })
      : await loadAssistance(req, req.params.id)

    res.json({ success: true, assistance: updated ? serializeQueueRow(updated) : null })
  } catch (error) {
    logger.error('Failed to update case assistance', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Contact log
// ---------------------------------------------------------------------------

function serializeInteraction(interaction: any) {
  return {
    id: interaction.id,
    channel: interaction.channel,
    direction: interaction.direction,
    outcome: interaction.outcome,
    notes: interaction.notes,
    specialistName: interaction.specialistName,
    occurredAt: interaction.occurredAt,
  }
}

function specialistNameOf(user: any): string | null {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return name || user?.email || null
}

/**
 * Render a proposed fact for a claimant-facing email. Booleans are stored as
 * "true"/"false", which means nothing to a claimant reading it in mail, and
 * large numbers are unreadable without separators.
 */
function displayProposedValue(path: string, value: string | null): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const type = PROPOSABLE_FACT_PATHS[path]?.type
  if (type === 'boolean') return raw === 'true' ? 'Yes' : 'No'
  if (type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n.toLocaleString('en-US') : raw
  }
  return raw
}

/**
 * Record a contact and move the case's clocks.
 *
 * `firstContactAt` is only ever set once, so time-to-first-contact survives the
 * second and third call overwriting `lastContactAt`.
 */
async function recordInteraction(params: {
  assistance: { id: string; assessmentId: string; firstContactAt: Date | null }
  user: any
  channel: string
  direction?: string
  outcome?: string | null
  notes?: string | null
  documentRequestId?: string | null
  occurredAt?: Date
}) {
  const occurredAt = params.occurredAt ?? new Date()

  const interaction = await prisma.caseInteraction.create({
    data: {
      assistanceId: params.assistance.id,
      assessmentId: params.assistance.assessmentId,
      specialistId: params.user?.id ?? null,
      specialistName: specialistNameOf(params.user),
      channel: params.channel,
      direction: params.direction || 'outbound',
      outcome: params.outcome || null,
      notes: params.notes || null,
      documentRequestId: params.documentRequestId || null,
      occurredAt,
    },
  })

  await prisma.caseAssistance.update({
    where: { id: params.assistance.id },
    data: {
      lastContactAt: occurredAt,
      ...(params.assistance.firstContactAt ? {} : { firstContactAt: occurredAt }),
    },
  })

  return interaction
}

const InteractionSchema = z.object({
  channel: z.enum(INTERACTION_CHANNELS),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  outcome: z.enum(INTERACTION_OUTCOMES).optional(),
  notes: z.string().trim().max(4000).optional(),
  /** ISO timestamp, for logging a call after the fact. */
  occurredAt: z.string().datetime().optional(),
  /** Move the case in the same request, so logging a call is one action. */
  status: z.enum(ASSISTANCE_STATUSES).optional(),
  nextAction: z.string().trim().max(200).optional(),
})

router.post('/:id/interactions', async (req: AuthRequest, res) => {
  try {
    const parsed = InteractionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const { channel, direction, outcome, notes, occurredAt, status, nextAction } = parsed.data

    const interaction = await recordInteraction({
      assistance,
      user: req.user,
      channel,
      direction,
      outcome,
      notes,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    })

    if (status || nextAction !== undefined) {
      await prisma.caseAssistance.update({
        where: { id: assistance.id },
        data: {
          ...(status ? { status } : {}),
          ...(nextAction !== undefined ? { nextAction: nextAction || null } : {}),
        },
      })
    }

    logger.info('Case interaction logged', {
      assistanceId: assistance.id,
      channel,
      outcome: outcome || null,
    })

    res.status(201).json({ success: true, interaction: serializeInteraction(interaction) })
  } catch (error) {
    logger.error('Failed to log case interaction', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// On-behalf answers
//
// A specialist hears an answer on a call and records it here. It does not touch
// the case: it becomes a pending proposal the claimant confirms or corrects, so
// the claimant's own account of their injury is never overwritten by someone
// paraphrasing it. See `lib/case-reconciliation.ts`.
// ---------------------------------------------------------------------------

const ProposalSchema = z.object({
  path: z.string().min(1).max(120),
  // Null clears the field: "no, I never missed work" is an answer.
  value: z.string().max(5000).nullable(),
})

/** The fields a specialist may propose, with what the claimant has on file. */
router.get('/:id/proposals', async (req: AuthRequest, res) => {
  try {
    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const [assessment, pending] = await Promise.all([
      prisma.assessment.findUnique({
        where: { id: assistance.assessmentId },
        select: { facts: true },
      }),
      prisma.externalWriteProposal.findMany({
        where: { assessmentId: assistance.assessmentId, status: 'pending', source: 'specialist' },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const facts = parseCaseFacts(assessment?.facts ?? null)
    const fields = Object.entries(PROPOSABLE_FACT_PATHS).map(([path, spec]) => ({
      path,
      label: spec.label,
      type: spec.type,
      currentValue: readFactPath(facts, path),
    }))

    res.json({
      fields,
      pending: pending.map((proposal: (typeof pending)[number]) => ({
        id: proposal.id,
        path: factPathOf(proposal.field),
        label: proposalFieldLabel(proposal.field),
        currentValue: proposal.currentValue,
        proposedValue: proposal.proposedValue,
        createdAt: proposal.createdAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to load case proposals', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/proposals', async (req: AuthRequest, res) => {
  try {
    const parsed = ProposalSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    if (!isProposableFactPath(parsed.data.path)) {
      return res.status(400).json({ error: 'That field cannot be set on the claimant\u2019s behalf' })
    }

    const result = await createSpecialistFactProposal({
      assessmentId: assistance.assessmentId,
      path: parsed.data.path,
      proposedValue: parsed.data.value,
      specialist: {
        userId: req.user!.id,
        label: specialistNameOf(req.user) || req.user?.email || 'Case specialist',
      },
    })
    if (!result.ok) return res.status(400).json({ error: result.reason })

    // The claimant has to know something is waiting, or the value sits pending
    // forever and the call was wasted. Best-effort: a mail failure must not lose
    // the answer the specialist just took down.
    const contact = contactOf(assistance.assessment)
    if (contact.email) {
      const label = proposalFieldLabel(result.proposal.field)
      const shown = displayProposedValue(parsed.data.path, result.proposal.proposedValue)
      await deliverDirectNotification({
        type: 'email',
        recipient: contact.email,
        subject: 'Please confirm a detail from your call',
        // Name the value, not just the field. "We noted the lost wages you
        // mentioned" gave the claimant no way to tell whether what we wrote
        // down matches what they said without clicking through.
        message: [
          shown
            ? `On your call we recorded the following. Before it goes on your case, we need you to confirm it is right.`
            : `We noted the ${label.toLowerCase()} you mentioned on your call. Before it goes on your case, we need you to confirm it is right.`,
          ...(shown ? ['', `• ${label}: ${shown}`] : []),
          '',
          'You can confirm it, or correct it, from your case page.',
        ].join('\n'),
        cta: { label: 'Review and confirm', url: webUrl(`/results?assessment=${assistance.assessmentId}`) },
        userId: assistance.assessment.user?.id || null,
        assessmentId: assistance.assessmentId,
        role: 'plaintiff',
        replyTo: req.user?.email || null,
        fromName: specialistNameOf(req.user) || 'Your ClearCaseIQ case specialist',
        metadata: {
          eventType: PLAINTIFF_EVENTS.more_info_requested,
          proposalId: result.proposal.id,
          proposedBy: req.user?.id,
        },
      }).catch((error: unknown) => {
        logger.warn('Could not notify claimant of a pending confirmation', {
          assessmentId: assistance.assessmentId,
          error,
        })
      })
    }

    logger.info('Specialist proposed a case value', {
      assessmentId: assistance.assessmentId,
      path: parsed.data.path,
      specialistId: req.user?.id,
    })
    res.status(201).json({ success: true, proposal: result.proposal })
  } catch (error) {
    logger.error('Failed to propose a case value', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/timeline', async (req: AuthRequest, res) => {
  try {
    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    // Two sources, one timeline: contacts a specialist logged, and the platform
    // events already recorded against the case. Neither alone tells the story of
    // what the claimant has actually experienced.
    const [interactions, notifications] = await Promise.all([
      prisma.caseInteraction.findMany({
        where: { assistanceId: assistance.id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      prisma.platformNotificationEvent.findMany({
        where: { assessmentId: assistance.assessmentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, channel: true, eventType: true, subject: true, status: true, createdAt: true },
      }),
    ])

    const entries = [
      ...interactions.map((interaction) => ({
        kind: 'interaction' as const,
        at: interaction.occurredAt,
        ...serializeInteraction(interaction),
      })),
      ...notifications.map((event) => ({
        kind: 'notification' as const,
        at: event.createdAt,
        id: event.id,
        channel: event.channel,
        eventType: event.eventType,
        subject: event.subject,
        status: event.status,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    res.json({ success: true, data: entries })
  } catch (error) {
    logger.error('Failed to load case assistance timeline', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ---------------------------------------------------------------------------
// Outreach
// ---------------------------------------------------------------------------

const DocumentRequestSchema = z.object({
  docs: z.array(z.string().trim().min(1)).min(1).max(12),
  message: z.string().trim().max(2000).optional(),
})

/**
 * Ask the plaintiff for documents.
 *
 * This does NOT use the tokenized `DocumentRequest` pipeline the attorney
 * workspace uses, because it cannot: that row requires both a `LeadSubmission`
 * and an `Attorney`, and a case in the assistance queue has neither — the
 * plaintiff has not submitted for attorney review yet. Twenty-six queries
 * across fourteen files join document requests through `leadId`, so making it
 * nullable is a phase-2 refactor, not a detour.
 *
 * What the plaintiff gets instead is their own authenticated upload page, which
 * is the same destination and needs no token because they are signed in.
 */
router.post('/:id/document-request', async (req: AuthRequest, res) => {
  try {
    const parsed = DocumentRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const contact = contactOf(assistance.assessment)
    if (!contact.email) {
      return res.status(409).json({
        error: 'No email address on file for this claimant. Log a call instead.',
        code: 'NO_CONTACT_EMAIL',
      })
    }

    const uploadLink = webUrl(`/evidence-upload/${assistance.assessmentId}`)
    // Canonical keys, so the names the claimant reads are the same ones their
    // upload page and the attorney's note use, rather than a de-slugged key.
    const docs = normalizeRequestedDocKeys(parsed.data.docs)
    const message = parsed.data.message
    const docNames = docs.map((doc) => DOCUMENT_REQUEST_LABELS[doc] || doc.replace(/[_-]+/g, ' '))
    const labels = docNames.join(', ')
    const specialist = specialistNameOf(req.user) || 'Your ClearCaseIQ case specialist'

    await deliverDirectNotification({
      type: 'email',
      recipient: contact.email,
      subject: 'Documents needed for your case',
      // The list is always here. It used to be the fallback for an empty
      // custom message, so the moment a specialist typed one — which is the
      // normal case — the claimant got "please send those documents" and no
      // way to know which. A note from the specialist is context for the ask,
      // not a replacement for it.
      message: [
        message?.trim() || 'To move your case forward we need a few more documents.',
        '',
        docNames.length === 1 ? 'What we need:' : `What we need (${docNames.length} items):`,
        ...docNames.map((name) => `• ${name}`),
        '',
        'You can upload them from your case documents page.',
      ].join('\n'),
      cta: { label: 'Upload documents', url: uploadLink },
      userId: assistance.assessment.user?.id || null,
      assessmentId: assistance.assessmentId,
      role: 'plaintiff',
      // Replies reach the specialist who asked, rather than a no-reply address a
      // confused claimant writes into and never hears back from.
      replyTo: req.user?.email || null,
      fromName: specialist,
      metadata: { eventType: PLAINTIFF_EVENTS.doc_requested, docs, requestedBy: req.user?.id },
    })

    await recordInteraction({
      assistance,
      user: req.user,
      channel: 'email',
      outcome: 'sent',
      notes: `Requested documents: ${labels}`,
    })

    await prisma.caseAssistance.update({
      where: { id: assistance.id },
      data: { status: 'document_requested' },
    })

    res.status(201).json({ success: true, docs, uploadLink })
  } catch (error) {
    logger.error('Failed to send specialist document request', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const EmailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
})

/** Email the claimant as a named specialist, and log it. */
router.post('/:id/email', async (req: AuthRequest, res) => {
  try {
    const parsed = EmailSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const assistance = await loadAssistance(req, req.params.id)
    if (!assistance) return res.status(404).json({ error: 'Case not found' })

    const contact = contactOf(assistance.assessment)
    if (!contact.email) {
      return res.status(409).json({
        error: 'No email address on file for this claimant. Log a call instead.',
        code: 'NO_CONTACT_EMAIL',
      })
    }

    const { subject, body } = parsed.data

    // The UPL boundary, enforced on the thing that actually reaches the
    // claimant. Phase 1 only stated it in copy, which does not stop a helpful
    // specialist from answering a legal question in prose.
    const upl = checkUplBoundary(subject, body)
    if (!upl.ok) {
      logger.warn('Specialist email blocked at the UPL boundary', {
        id: req.params.id,
        specialistId: req.user?.id,
        violations: describeUplViolations(upl.violations),
      })
      return res.status(422).json({
        error: 'This message reads as legal advice, which a specialist cannot give. Rewrite the flagged parts or route the question to the attorney.',
        code: 'UPL_BOUNDARY',
        violations: upl.violations,
      })
    }

    await deliverDirectNotification({
      type: 'email',
      recipient: contact.email,
      subject,
      message: body,
      userId: assistance.assessment.user?.id || null,
      assessmentId: assistance.assessmentId,
      role: 'plaintiff',
      replyTo: req.user?.email || null,
      fromName: specialistNameOf(req.user) || 'ClearCaseIQ',
      metadata: { eventType: 'specialist.email', sentBy: req.user?.id },
    })

    const interaction = await recordInteraction({
      assistance,
      user: req.user,
      channel: 'email',
      outcome: 'sent',
      notes: subject,
    })

    res.status(201).json({ success: true, interaction: serializeInteraction(interaction) })
  } catch (error) {
    logger.error('Failed to send specialist email', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
