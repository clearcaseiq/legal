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
import { prisma } from '../lib/prisma'

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
  /**
   * Honeypot. Bounded, but deliberately not required to be empty.
   *
   * Admitting only '' makes a filled field fail validation, and the 400 that
   * comes back names the offending field. That is backwards twice over: it hands
   * a bot the one input it needs to leave alone, and it silently unreachable-ifies
   * the branch below that exists to swallow spam quietly. It also rejects the
   * real person whose password manager decided a hidden "Company" input wanted
   * filling — they get the form's generic "couldn't send" and no way to fix it.
   *
   * Whether a value here means spam is a judgment for the handler, not the
   * schema. The cap is only there to bound what we accept.
   */
  company: z.string().max(200).optional(),
})

function inboxForTopic(topic: (typeof TOPICS)[number]): string {
  // Privacy requests go to the legal inbox; everything else to support. Both are
  // overridable via env for staging/testing.
  if (topic === 'privacy') return process.env.CONTACT_LEGAL_EMAIL || 'legal@clearcaseiq.com'
  return process.env.CONTACT_INBOX_EMAIL || 'support@clearcaseiq.com'
}

type Requester = { userId?: string; attorneyId?: string; role: string }

/**
 * Attach an inbound message to an existing account by email, so the team sees
 * who is asking. A sender with no match is a guest, which is the normal case on
 * a public form and not a failure. A lookup that throws is also not a failure:
 * knowing who sent it is worth less than keeping the message.
 */
async function identifyRequester(email: string): Promise<Requester> {
  try {
    const [user, attorney] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.attorney.findUnique({ where: { email }, select: { id: true } }),
    ])
    if (attorney) return { attorneyId: attorney.id, role: 'attorney' }
    if (user) return { userId: user.id, role: 'plaintiff' }
  } catch {
    // Fall through to a guest record.
  }
  return { role: 'guest' }
}

router.post('/', async (req, res) => {
  const parsed = InquirySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { name, email, topic, message, company } = parsed.data

  // Honeypot tripped -> answer exactly as we would on success, so a bot learns
  // nothing from the difference.
  if (company && company.trim()) {
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

  // Write the inquiry down before trying to send it anywhere.
  //
  // This endpoint answers 200 whatever happens to the email, which is the right
  // call — the sender can do nothing about our mail provider. But an inquiry
  // that exists *only* as a message to a shared mailbox is one SES hiccup or
  // spam rule away from being lost while the sender is told it arrived. A row
  // also puts it in the admin triage queue, which someone watches, rather than
  // depending on someone watching an inbox.
  //
  // The support-request handler below has always done this. The two forms are
  // the same promise to the person filling them in, so they should keep the
  // same one.
  const requester = await identifyRequester(email)
  let ticketId: string | null = null
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: requester.userId,
        attorneyId: requester.attorneyId,
        role: requester.role,
        category: topic,
        subject: `[Contact] ${topicLabel} — ${name}`,
        description: [`Requester: ${name} <${email}>`, ``, message].join('\n'),
        priority: 'medium',
      },
      select: { id: true },
    })
    ticketId = ticket.id
  } catch (err) {
    logger.error('Contact inquiry could not be persisted', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  let emailSent = false
  try {
    emailSent = await sendTransactionalEmail({
      to,
      subject: `[Contact: ${topicLabel}] ${name}`,
      body: ticketId ? `${body}\n\nTicket: ${ticketId}` : body,
      replyTo: email,
      fromName: 'ClearCaseIQ Contact Form',
    })
  } catch (err) {
    logger.warn('Contact inquiry email failed', { error: err instanceof Error ? err.message : String(err) })
  }

  // Logged either way, so the message survives in a third place even when both
  // the database write and the send have gone wrong.
  logger.info('Contact inquiry received', {
    topic,
    to,
    ticketId,
    emailSent,
    from: email.slice(0, 3),
  })

  // Only claim success when the inquiry is somewhere we can find it again.
  // Failing both is rare, but telling someone their message was delivered when
  // it went nowhere is worse than asking them to use the address on the page.
  if (!ticketId && !emailSent) {
    return res.status(500).json({ error: 'Could not submit your message' })
  }

  return res.status(200).json({ ok: true })
})

/**
 * Public support request (triage form).
 *
 * Unlike the "Contact us" note above, this creates a real SupportTicket so the
 * request lands in the admin triage dashboard (queryable by status / priority /
 * category) instead of only an inbox. Works for guests and logged-in users; we
 * link the ticket to a matching account by email when one exists so the team has
 * context. Email to the team is best-effort and never blocks the response.
 */
const SUPPORT_CATEGORIES = [
  'technical_issue',
  'case_help',
  'attorney_matching',
  'account_access',
  'privacy',
  'other',
] as const

const SUPPORT_CATEGORY_LABELS: Record<(typeof SUPPORT_CATEGORIES)[number], string> = {
  technical_issue: 'Technical issue',
  case_help: 'Help with my case',
  attorney_matching: 'Attorney matching',
  account_access: 'Account / login',
  privacy: 'Privacy request',
  other: 'Other',
}

const SupportRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  category: z.enum(SUPPORT_CATEGORIES).default('technical_issue'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  // Optional context captured client-side to speed up triage.
  pageUrl: z.string().trim().max(500).optional(),
  /** Honeypot — see the note on InquirySchema for why this is not `max(0)`. */
  company: z.string().max(200).optional(),
})

router.post('/support-request', async (req, res) => {
  const parsed = SupportRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { name, email, category, priority, subject, description, pageUrl, company } = parsed.data

  // Honeypot tripped -> silently accept without creating a ticket.
  if (company && company.trim()) {
    logger.info('Support request ignored (honeypot)', { email: email.slice(0, 3) })
    return res.status(200).json({ ok: true })
  }

  // Link to an existing account by email so the team sees who's asking. Guests
  // (no match) still get a ticket; role is recorded as "guest".
  const { userId, attorneyId, role } = await identifyRequester(email)

  const categoryLabel = SUPPORT_CATEGORY_LABELS[category]
  // Requester contact + context live in the description since the ticket model
  // has no dedicated guest-contact fields; keeps the team able to reply.
  const fullDescription = [
    `Requester: ${name} <${email}>`,
    pageUrl ? `Reported from: ${pageUrl}` : null,
    ``,
    description,
  ]
    .filter((line) => line !== null)
    .join('\n')

  let ticketId: string | null = null
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        attorneyId,
        role,
        category,
        subject,
        description: fullDescription,
        priority,
      },
      select: { id: true },
    })
    ticketId = ticket.id
  } catch (err) {
    logger.error('Support request ticket create failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return res.status(500).json({ error: 'Could not create support request' })
  }

  // Best-effort email to the team so it surfaces immediately, not just in-app.
  const to = category === 'privacy'
    ? process.env.CONTACT_LEGAL_EMAIL || 'legal@clearcaseiq.com'
    : process.env.CONTACT_INBOX_EMAIL || 'support@clearcaseiq.com'
  const body = [
    `New support request submitted from the ClearCaseIQ Help Center.`,
    ``,
    `Ticket:    ${ticketId}`,
    `Category:  ${categoryLabel}`,
    `Priority:  ${priority}`,
    `Name:      ${name}`,
    `Email:     ${email}`,
    pageUrl ? `Page:      ${pageUrl}` : null,
    ``,
    `Subject: ${subject}`,
    ``,
    description,
  ]
    .filter((line) => line !== null)
    .join('\n')

  try {
    const sent = await sendTransactionalEmail({
      to,
      subject: `[Support: ${priority.toUpperCase()} · ${categoryLabel}] ${subject}`,
      body,
      replyTo: email,
      fromName: 'ClearCaseIQ Support',
    })
    logger.info('Support request received', { ticketId, category, priority, emailSent: sent })
  } catch (err) {
    logger.warn('Support request email failed', {
      ticketId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return res.status(200).json({ ok: true, ticketId })
})

export default router
