/**
 * Public "Contact us" inquiry endpoint.
 *
 * Unlike /v1/support-tickets (which requires an authenticated plaintiff/attorney),
 * this accepts inquiries from anyone — prospective clients, attorneys, press, or
 * general questions from the marketing site's Contact page. It validates the
 * payload, applies a simple honeypot spam guard, and emails the inquiry to the
 * team inbox with the submitter as reply-to. Best-effort: email failures are
 * logged but still return success to the user (we don't leak infra state).
 */

import { Router } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { sendTransactionalEmail } from '../lib/claims'

const router = Router()

// Topics the Contact form offers. Kept in sync with the client <select>.
const TOPICS = ['general', 'plaintiff_support', 'attorney_partnership', 'media_press', 'privacy', 'other'] as const

const TOPIC_LABELS: Record<(typeof TOPICS)[number], string> = {
  general: 'General inquiry',
  plaintiff_support: 'Help with my case',
  attorney_partnership: 'Attorney / firm partnership',
  media_press: 'Media & press',
  privacy: 'Privacy request',
  other: 'Other',
}

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  topic: z.enum(TOPICS).default('general'),
  message: z.string().trim().min(10).max(4000),
  // Honeypot: real users never fill this hidden field; bots often do.
  company: z.string().max(0).optional().or(z.literal('')),
})

function inboxForTopic(topic: (typeof TOPICS)[number]): string {
  // Privacy requests go to the legal inbox; everything else to support. Both are
  // overridable via env for staging/testing.
  if (topic === 'privacy') return process.env.CONTACT_LEGAL_EMAIL || 'legal@clearcaseiq.com'
  return process.env.CONTACT_INBOX_EMAIL || 'support@clearcaseiq.com'
}

router.post('/', async (req, res) => {
  const parsed = InquirySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { name, email, topic, message, company } = parsed.data

  // Honeypot tripped -> silently accept without emailing so bots get no signal.
  if (company) {
    logger.info('Contact inquiry ignored (honeypot)', { email: email.slice(0, 3) })
    return res.status(200).json({ ok: true })
  }

  const topicLabel = TOPIC_LABELS[topic]
  const to = inboxForTopic(topic)
  const body = [
    `New contact inquiry from the ClearCaseIQ website.`,
    ``,
    `Topic:   ${topicLabel}`,
    `Name:    ${name}`,
    `Email:   ${email}`,
    ``,
    `Message:`,
    message,
  ].join('\n')

  try {
    const sent = await sendTransactionalEmail({
      to,
      subject: `[Contact: ${topicLabel}] ${name}`,
      body,
      replyTo: email,
      fromName: 'ClearCaseIQ Contact Form',
    })
    // Always log so an inquiry is never lost even if email is unconfigured.
    logger.info('Contact inquiry received', { topic, to, emailSent: sent, from: email.slice(0, 3) })
  } catch (err) {
    logger.warn('Contact inquiry email failed', { error: err instanceof Error ? err.message : String(err) })
  }

  // Best-effort: we accepted the inquiry regardless of email delivery outcome.
  return res.status(200).json({ ok: true })
})

export default router
