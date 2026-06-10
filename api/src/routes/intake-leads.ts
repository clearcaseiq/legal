import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const router = Router()

const MAX_SNAPSHOT_LENGTH = 100_000

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
  } catch (error) {
    logger.error('Failed to update intake lead', { error, leadId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
