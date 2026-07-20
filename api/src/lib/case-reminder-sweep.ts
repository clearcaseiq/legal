/**
 * Case reminder sweep (Phase 1 — Intake & matter setup automation).
 *
 * `CaseReminder` rows are scheduled all over the app — SOL deadlines and escalation
 * alerts (see attorney-dashboard `scheduleTaskReminder` / `scheduleEscalationAlert`),
 * readiness nudges, case-health alerts, invoice reminders, and negotiation cadences.
 * Historically the ONLY thing that fired them was a manual, per-lead endpoint
 * (`POST /leads/:leadId/reminders/process`), so a scheduled SOL reminder would never
 * actually reach the attorney unless someone clicked. This sweep drains every due
 * reminder platform-wide on an interval, delivers it to the assigned attorney via the
 * standard notification pipeline, marks it sent, and writes an automation audit entry.
 *
 * Exposed to the in-process scheduler (api/src/index.ts). Idempotent and safe to run
 * repeatedly: it only touches `scheduled` reminders whose `dueAt` has passed, flips
 * them to `sent`, and retries transient delivery failures up to MAX_ATTEMPTS.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { notifyAttorneyInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'

export interface CaseReminderSweepResult {
  scanned: number
  sent: number
  failed: number
  skipped: number
  skippedReason?: string
}

/** Max scheduled reminders to process per sweep pass (protects a cold-start backlog). */
const BATCH_LIMIT = 200
/** Delivery attempts before a reminder is marked permanently failed. */
const MAX_ATTEMPTS = 5
/** Unassigned reminders older than this are marked failed instead of scanned forever. */
const UNASSIGNED_STALE_DAYS = 60

interface ReminderClass {
  subject: string
  priority: 'low' | 'normal' | 'high'
  kind: string
}

/**
 * Derive a human subject + urgency from the reminder message. The message text is the
 * canonical payload the schedulers write; we key off its well-known prefixes.
 */
function classifyReminder(message: string): ReminderClass {
  const text = (message || '').trim()
  const lower = text.toLowerCase()

  // Statute of limitations is the highest-stakes case: surface it first and loudest.
  if (lower.includes('statute of limitations') || lower.includes('statute') || lower.includes(' sol ')) {
    return { subject: 'Statute of limitations deadline', priority: 'high', kind: 'sol' }
  }
  if (/^escalation:/i.test(text)) {
    return { subject: 'Case deadline escalation', priority: 'high', kind: 'escalation' }
  }
  if (/^\[readiness\]/i.test(text)) {
    return { subject: 'Case readiness reminder', priority: 'normal', kind: 'readiness' }
  }
  if (/^\[case health\]/i.test(text)) {
    return { subject: 'Case health alert', priority: 'high', kind: 'health' }
  }
  if (/^task reminder:/i.test(text)) {
    return { subject: 'Task reminder', priority: 'normal', kind: 'task' }
  }
  if (lower.startsWith('invoice ') || lower.includes(' invoice ')) {
    return { subject: 'Invoice reminder', priority: 'normal', kind: 'billing' }
  }
  return { subject: 'Case reminder', priority: 'normal', kind: 'general' }
}

async function writeReminderAudit(args: {
  attorneyId?: string | null
  reminderId: string
  assessmentId: string
  kind: string
  delivered: boolean
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: null,
        attorneyId: args.attorneyId || null,
        action: 'automation_reminder_sent',
        entityType: 'case_reminder',
        entityId: args.reminderId,
        metadata: JSON.stringify({
          assessmentId: args.assessmentId,
          kind: args.kind,
          delivered: args.delivered,
          sweptAt: new Date().toISOString(),
        }),
      },
    })
  } catch (error: any) {
    logger.warn('Case reminder audit write failed', { reminderId: args.reminderId, error: error?.message })
  }
}

export async function runCaseReminderSweep(): Promise<CaseReminderSweepResult> {
  if (process.env.CASE_REMINDER_SWEEP_ENABLED === 'false') {
    return { scanned: 0, sent: 0, failed: 0, skipped: 0, skippedReason: 'Disabled by env' }
  }

  const now = new Date()
  const due = await prisma.caseReminder.findMany({
    where: { status: 'scheduled', dueAt: { lte: now } },
    orderBy: { dueAt: 'asc' },
    take: BATCH_LIMIT,
  })

  if (due.length === 0) {
    return { scanned: 0, sent: 0, failed: 0, skipped: 0 }
  }

  // Resolve each assessment to its assigned attorney + a lead id for deep-linking, in
  // one query, so per-reminder delivery doesn't fan out into N round-trips.
  const assessmentIds = [...new Set(due.map((r) => r.assessmentId))]
  const leads = await prisma.leadSubmission.findMany({
    where: { assessmentId: { in: assessmentIds } },
    select: { id: true, assessmentId: true, assignedAttorneyId: true },
    orderBy: { createdAt: 'desc' },
  })
  const leadByAssessment = new Map<string, { leadId: string; attorneyId: string | null }>()
  for (const lead of leads) {
    const existing = leadByAssessment.get(lead.assessmentId)
    // Prefer a lead that actually has an assigned attorney.
    if (!existing || (!existing.attorneyId && lead.assignedAttorneyId)) {
      leadByAssessment.set(lead.assessmentId, { leadId: lead.id, attorneyId: lead.assignedAttorneyId })
    }
  }

  const staleCutoff = new Date(now.getTime() - UNASSIGNED_STALE_DAYS * 24 * 60 * 60 * 1000)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const reminder of due) {
    const target = leadByAssessment.get(reminder.assessmentId)
    const attorneyId = target?.attorneyId || null

    // No attorney owns this case yet — leave the reminder scheduled so it delivers once
    // the case is assigned, but don't let truly stale rows linger in the scan forever.
    if (!attorneyId) {
      if (reminder.dueAt < staleCutoff) {
        await prisma.caseReminder
          .update({
            where: { id: reminder.id },
            data: { status: 'failed', deliveryStatus: 'failed', lastAttemptAt: now, attempts: reminder.attempts + 1 },
          })
          .catch(() => {})
        failed += 1
      } else {
        skipped += 1
      }
      continue
    }

    const info = classifyReminder(reminder.message)
    let delivered = false
    try {
      delivered = await notifyAttorneyInApp({
        attorneyId,
        assessmentId: reminder.assessmentId,
        eventType: ATTORNEY_EVENTS.case_reminder,
        subject: info.subject,
        body: reminder.message,
        leadId: target?.leadId || null,
        link: target?.leadId ? `/attorney-dashboard/lead/${target.leadId}/overview` : null,
        payload: { reminderId: reminder.id, kind: info.kind, priority: info.priority, channel: reminder.channel },
      })
    } catch (error: any) {
      logger.warn('Case reminder delivery threw', { reminderId: reminder.id, error: error?.message })
      delivered = false
    }

    if (delivered) {
      await prisma.caseReminder
        .update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            deliveryStatus: 'delivered',
            attempts: reminder.attempts + 1,
            sentAt: now,
            lastAttemptAt: now,
          },
        })
        .catch(() => {})
      await writeReminderAudit({
        attorneyId,
        reminderId: reminder.id,
        assessmentId: reminder.assessmentId,
        kind: info.kind,
        delivered: true,
      })
      sent += 1
    } else {
      const attempts = reminder.attempts + 1
      const exhausted = attempts >= MAX_ATTEMPTS
      await prisma.caseReminder
        .update({
          where: { id: reminder.id },
          data: {
            status: exhausted ? 'failed' : 'scheduled',
            deliveryStatus: 'failed',
            attempts,
            lastAttemptAt: now,
          },
        })
        .catch(() => {})
      if (exhausted) {
        await writeReminderAudit({
          attorneyId,
          reminderId: reminder.id,
          assessmentId: reminder.assessmentId,
          kind: info.kind,
          delivered: false,
        })
        failed += 1
      }
    }
  }

  return { scanned: due.length, sent, failed, skipped }
}
