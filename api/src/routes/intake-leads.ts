import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { sendClaimEmail } from '../lib/claims'
import { sendSms } from '../lib/sms'
import { provisionAndLinkIntakeAccount } from '../lib/intake-account'
import { scheduleReportReady } from '../lib/report-ready'
import { webUrl } from '../lib/app-url'

const router = Router()

const MAX_SNAPSHOT_LENGTH = 100_000

// A resume link stops resurfacing saved contact + case answers once the lead has
// been idle this long. Keyed off last activity (updatedAt), so an active intake
// keeps working while a stale or forwarded link expires. Mirrors the abandonment
// re-engagement window (ABANDON_WINDOW_HOURS in intake-abandonment.ts).
const RESUME_LINK_TTL_HOURS = 72

function resumeUrl(leadId: string): string {
  return webUrl(`/assess?lead=${encodeURIComponent(leadId)}`)
}

/**
 * Whether a lead is still inside its resume window.
 *
 * The lead id is a bearer credential handed out in an email link, so the window
 * has to bound writes as well as reads. Only the read path enforced it, which
 * left an unauthenticated caller able to keep overwriting a stale lead's saved
 * contact details and answers indefinitely.
 */
function isResumeWindowOpen(lead: { updatedAt: Date }): boolean {
  return Date.now() <= lead.updatedAt.getTime() + RESUME_LINK_TTL_HOURS * 60 * 60_000
}

/**
 * Best-effort: email/SMS the saved "return later" link. Never throws.
 *
 * This goes out the moment contact details are captured, which is partway
 * through the wizard while the person is still answering. The copy therefore
 * cannot say they left off — most recipients have not, and are reading it in
 * another tab. It is a receipt for saved progress; the genuine "you left"
 * nudge belongs to the abandonment sweep, which waits for real idleness.
 */
async function sendResumeLink(lead: { id: string; email: string | null; phone: string | null }): Promise<void> {
  const link = resumeUrl(lead.id)
  try {
    if (lead.email) {
      await sendClaimEmail({
        to: lead.email,
        subject: 'Your ClearCaseIQ case assessment is saved',
        body: `Hi,\n\nThanks for starting your case assessment with ClearCaseIQ. Your answers are saved, so you can finish now or come back to it later.\n\nWhen your case report is ready, we'll send it to you here.\n\nIf you didn't start this, you can safely ignore this email.`,
        cta: { label: 'Continue your assessment', url: link },
      })
    }
    if (lead.phone) {
      await sendSms(lead.phone, `ClearCaseIQ: your case assessment is saved. Finish it any time: ${link}`)
    }
  } catch (error) {
    logger.warn('Failed to send intake resume link', { leadId: lead.id, error })
  }
}

const emailField = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().email().max(254).optional().or(z.literal(''))
)

const IntakeLeadCreate = z.object({
  email: emailField,
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  injuryType: z.string().trim().max(60).optional(),
  venueState: z.string().trim().max(10).optional(),
  venueCounty: z.string().trim().max(120).optional(),
  currentStep: z.string().trim().max(60).optional(),
  formSnapshot: z.record(z.any()).optional(),
})

const IntakeLeadUpdate = IntakeLeadCreate.extend({
  assessmentId: z.string().trim().max(64).optional(),
  status: z.enum(['in_progress', 'completed']).optional(),
})

function serializeSnapshot(snapshot: unknown): string | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  const json = JSON.stringify(snapshot)
  if (json.length > MAX_SNAPSHOT_LENGTH) return undefined
  return json
}

/**
 * Steps kept per lead. Enough for the longest branch several times over, and
 * bounded so a client that re-sends a step cannot grow the row without limit.
 */
const MAX_STEP_HISTORY = 60

/**
 * Append a step to the lead's history.
 *
 * The wizard reports the step it just moved to, so appending on change gives a
 * timestamped path through the funnel: which steps a claimant reached, in what
 * order, and how long each one held them. Only `currentStep` was stored before,
 * which shows the abandonment point but nothing about the journey to it.
 */
function appendStepHistory(existing: string | null | undefined, step: string): string {
  let history: Array<{ step: string; at: string }> = []
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      if (Array.isArray(parsed)) history = parsed
    } catch {
      history = []
    }
  }
  history.push({ step, at: new Date().toISOString() })
  return JSON.stringify(history.slice(-MAX_STEP_HISTORY))
}

// Create a partial intake lead (no auth: the plaintiff has not registered yet).
router.post('/', async (req, res) => {
  try {
    const parsed = IntakeLeadUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const { email, phone, injuryType, venueState, venueCounty, currentStep, formSnapshot, assessmentId, status } = parsed.data
    if (!email && !phone?.trim()) {
      return res.status(400).json({ error: 'An email or phone number is required' })
    }

    const lead = await prisma.intakeLead.create({
      data: {
        email: email || null,
        phone: phone?.trim() || null,
        injuryType: injuryType || null,
        venueState: venueState || null,
        venueCounty: venueCounty || null,
        currentStep: currentStep || null,
        stepHistory: currentStep ? appendStepHistory(null, currentStep) : null,
        formSnapshot: serializeSnapshot(formSnapshot) ?? null,
        assessmentId: assessmentId || null,
        status: status || 'in_progress',
      },
    })

    logger.info('Intake lead captured', { leadId: lead.id, currentStep: lead.currentStep })
    res.status(201).json({ id: lead.id })

    // Fire-and-forget after responding: send the "return later" link on first contact capture.
    if (lead.email || lead.phone) {
      void sendResumeLink({ id: lead.id, email: lead.email, phone: lead.phone })
    }
    // Provision a passwordless account from the captured email and link it.
    if (lead.email) {
      void provisionAndLinkIntakeAccount({ id: lead.id, email: lead.email, phone: lead.phone })
    }
  } catch (error) {
    logger.error('Failed to create intake lead', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update progress, contact details, or link the completed assessment.
router.patch('/:id', async (req, res) => {
  try {
    const parsed = IntakeLeadUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const existing = await prisma.intakeLead.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' })
    }
    if (!isResumeWindowOpen(existing)) {
      logger.info('Expired intake lead write attempted', { leadId: existing.id })
      return res.status(410).json({ error: 'This resume link has expired. Please start a new assessment.' })
    }

    const { email, phone, injuryType, venueState, venueCounty, currentStep, formSnapshot, assessmentId, status } = parsed.data
    const snapshot = serializeSnapshot(formSnapshot)

    // The assessment link is write-once. Re-pointing it would let a caller graft
    // somebody else's finished case onto this lead, which then drives the
    // report-ready email and the account that gets provisioned from it.
    if (assessmentId && existing.assessmentId && existing.assessmentId !== assessmentId) {
      logger.warn('Rejected intake lead assessment relink', { leadId: existing.id })
      return res.status(409).json({ error: 'This assessment is already linked to another intake.' })
    }

    const lead = await prisma.intakeLead.update({
      where: { id: existing.id },
      data: {
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
        ...(injuryType !== undefined ? { injuryType } : {}),
        ...(venueState !== undefined ? { venueState } : {}),
        ...(venueCounty !== undefined ? { venueCounty } : {}),
        ...(currentStep !== undefined ? { currentStep } : {}),
        // Only on an actual change: the wizard re-sends the same step on every
        // autosave, which would otherwise fill the history with duplicates.
        ...(currentStep && currentStep !== existing.currentStep
          ? { stepHistory: appendStepHistory(existing.stepHistory, currentStep) }
          : {}),
        ...(snapshot !== undefined ? { formSnapshot: snapshot } : {}),
        ...(assessmentId !== undefined ? { assessmentId } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    res.json({ id: lead.id, status: lead.status })

    // Fire-and-forget notifications after responding.
    const hadContact = Boolean(existing.email || existing.phone)
    const hasContact = Boolean(lead.email || lead.phone)
    // Send the resume link the first time contact info appears on this lead.
    if (!hadContact && hasContact) {
      void sendResumeLink({ id: lead.id, email: lead.email, phone: lead.phone })
    }
    // Provision/link an account once we have an email (idempotent: reuses an
    // existing account, backfills phone, and links the lead).
    if (lead.email && (!existing.email || existing.email !== lead.email)) {
      void provisionAndLinkIntakeAccount({ id: lead.id, email: lead.email, phone: lead.phone })
    }
    // Queue the report link once, when the lead transitions to completed with a
    // linked assessment. Queued rather than sent because submitting the case is
    // a separate, later action that sends its own receipt; see report-ready.ts.
    const justCompleted = existing.status !== 'completed' && lead.status === 'completed'
    if (justCompleted && lead.assessmentId && hasContact) {
      void scheduleReportReady(lead.id)
    }
  } catch (error) {
    logger.error('Failed to update intake lead', { error, leadId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Resume a saved intake from a link (no auth: token is the unguessable lead id).
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.intakeLead.findUnique({ where: { id: req.params.id } })
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Expire stale/forwarded links so saved PII isn't resurfaced indefinitely.
    if (!isResumeWindowOpen(lead)) {
      logger.info('Expired intake resume link accessed', { leadId: lead.id })
      return res.status(410).json({ error: 'This resume link has expired. Please start a new assessment.' })
    }

    let formSnapshot: Record<string, unknown> | null = null
    if (lead.formSnapshot) {
      try {
        const parsed = JSON.parse(lead.formSnapshot)
        if (parsed && typeof parsed === 'object') formSnapshot = parsed as Record<string, unknown>
      } catch {
        formSnapshot = null
      }
    }

    res.json({
      id: lead.id,
      status: lead.status,
      email: lead.email,
      phone: lead.phone,
      currentStep: lead.currentStep,
      injuryType: lead.injuryType,
      venueState: lead.venueState,
      venueCounty: lead.venueCounty,
      assessmentId: lead.assessmentId,
      formSnapshot,
    })
  } catch (error) {
    logger.error('Failed to load intake lead', { error, leadId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
