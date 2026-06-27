import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { sendClaimEmail } from '../lib/claims'
import { sendSms } from '../lib/sms'
import { provisionAndLinkIntakeAccount } from '../lib/intake-account'

const router = Router()

const MAX_SNAPSHOT_LENGTH = 100_000

function webBaseUrl(): string {
  return (process.env.WEB_URL || 'https://www.clearcaseiq.com').replace(/\/$/, '')
}

function resumeUrl(leadId: string): string {
  return `${webBaseUrl()}/assess?lead=${encodeURIComponent(leadId)}`
}

function resultsUrl(assessmentId: string): string {
  return `${webBaseUrl()}/results/${encodeURIComponent(assessmentId)}`
}

/** Best-effort: email/SMS the saved "return later" link. Never throws. */
async function sendResumeLink(lead: { id: string; email: string | null; phone: string | null }): Promise<void> {
  const link = resumeUrl(lead.id)
  try {
    if (lead.email) {
      await sendClaimEmail({
        to: lead.email,
        subject: 'Pick up your ClearCaseIQ case where you left off',
        body: `Hi,\n\nThanks for starting your case assessment with ClearCaseIQ. Your answers are saved, so you can return any time to finish.\n\nContinue your assessment: ${link}\n\nWhen your case report is ready, we'll send it to you here.\n\nIf you didn't start this, you can safely ignore this email.`,
      })
    }
    if (lead.phone) {
      await sendSms(lead.phone, `ClearCaseIQ: your case assessment is saved. Continue where you left off: ${link}`)
    }
  } catch (error) {
    logger.warn('Failed to send intake resume link', { leadId: lead.id, error })
  }
}

/** Best-effort: email/SMS the finished case report link. Never throws. */
async function sendReportReady(lead: { id: string; email: string | null; phone: string | null; assessmentId: string | null }): Promise<void> {
  if (!lead.assessmentId) return
  const link = resultsUrl(lead.assessmentId)
  try {
    if (lead.email) {
      await sendClaimEmail({
        to: lead.email,
        subject: 'Your ClearCaseIQ case report is ready',
        body: `Good news — your case assessment is complete.\n\nView your case report: ${link}\n\nYou can review your estimated case value, liability analysis, and next steps any time.`,
      })
    }
    if (lead.phone) {
      await sendSms(lead.phone, `ClearCaseIQ: your case report is ready. View it here: ${link}`)
    }
  } catch (error) {
    logger.warn('Failed to send intake report-ready link', { leadId: lead.id, error })
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

    const { email, phone, injuryType, venueState, venueCounty, currentStep, formSnapshot, assessmentId, status } = parsed.data
    const snapshot = serializeSnapshot(formSnapshot)

    const lead = await prisma.intakeLead.update({
      where: { id: existing.id },
      data: {
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
        ...(injuryType !== undefined ? { injuryType } : {}),
        ...(venueState !== undefined ? { venueState } : {}),
        ...(venueCounty !== undefined ? { venueCounty } : {}),
        ...(currentStep !== undefined ? { currentStep } : {}),
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
    // Send the report link once, when the lead transitions to completed with a linked assessment.
    const justCompleted = existing.status !== 'completed' && lead.status === 'completed'
    if (justCompleted && lead.assessmentId && hasContact) {
      void sendReportReady({ id: lead.id, email: lead.email, phone: lead.phone, assessmentId: lead.assessmentId })
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
