/**
 * Phase 2: Platform notification service
 * Creates notification events and handles delivery (email placeholder, in-app record).
 */

import { prisma } from './prisma'
import { logger } from './logger'
import type { CreateNotificationEventInput } from './notification-events'
import { sendSms } from './sms'
import { sendExpoPushNotifications } from './expo-push'
import { sendTransactionalEmail } from './claims'

const MAX_RESENDS_PER_24H = 3

// Provider-aware email delivery (SES or Resend, per EMAIL_PROVIDER). Previously
// this path was hardcoded to Resend, so in SES-configured production no routing
// or case-notification emails were ever sent to attorneys (#38).
async function sendNotificationEmail(params: {
  to: string
  subject?: string | null
  body?: string | null
  replyTo?: string | null
  fromName?: string | null
}): Promise<boolean> {
  if (!params.to) return false
  return sendTransactionalEmail({
    to: params.to,
    subject: params.subject || 'ClearCaseIQ notification',
    body: params.body || '',
    replyTo: params.replyTo || undefined,
    fromName: params.fromName || undefined,
  })
}

async function createInAppNotification(notificationId: string): Promise<boolean> {
  const event = await prisma.platformNotificationEvent.findUnique({
    where: { id: notificationId },
  })
  if (!event || !event.userId || !event.recipient) {
    return false
  }

  await prisma.notification.create({
    data: {
      userId: event.userId,
      type: event.templateKey || event.eventType || 'platform_notification',
      recipient: event.recipient,
      subject: event.subject || 'ClearCaseIQ update',
      message: event.body || '',
      metadata: event.payloadJson,
      status: 'PENDING',
    },
  })
  return true
}

async function deliverPush(notificationId: string): Promise<boolean> {
  const event = await prisma.platformNotificationEvent.findUnique({
    where: { id: notificationId },
    include: {
      attorney: { select: { email: true } },
      user: { select: { id: true } },
    },
  })
  if (!event) return false

  if (event.attorney?.email) {
    const user = await prisma.user.findUnique({
      where: { email: event.attorney.email },
      select: { id: true },
    })
    if (!user) return false

    const devices = await prisma.attorneyPushDevice.findMany({
      where: { userId: user.id },
      select: { expoPushToken: true },
    })
    const tokens = devices.map((d) => d.expoPushToken)
    if (!tokens.length) return false

    await sendExpoPushNotifications(tokens, {
      title: event.subject || 'ClearCaseIQ update',
      body: event.body || '',
      data: {
        eventType: event.eventType,
        assessmentId: event.assessmentId || '',
      },
    })
    return true
  }

  return false
}

export async function createNotificationEvent(input: CreateNotificationEventInput) {
  const event = await prisma.platformNotificationEvent.create({
    data: {
      userId: input.userId,
      attorneyId: input.attorneyId,
      assessmentId: input.assessmentId,
      role: input.role,
      channel: input.channel,
      eventType: input.eventType,
      templateKey: input.templateKey,
      subject: input.subject,
      body: input.body,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
      recipient: input.recipient,
      status: 'pending',
    },
  })

  // Attempt delivery (sync for now - in production would use queue)
  try {
    await attemptDelivery(event.id)
  } catch (err) {
    logger.warn('Notification delivery failed', { eventId: event.id, error: err })
  }

  return event
}

export async function attemptDelivery(notificationId: string): Promise<boolean> {
  const event = await prisma.platformNotificationEvent.findUnique({
    where: { id: notificationId },
  })
  if (!event || event.status === 'suppressed') return false

  const attempt = await prisma.platformNotificationAttempt.create({
    data: {
      notificationId,
      provider: event.channel === 'sms' ? 'twilio' : 'email',
      status: 'pending',
    },
  })

  // Sender identity (reply-to / display name) is carried on the event payload so
  // attorney-originated mail can appear to come from the attorney.
  let senderReplyTo: string | undefined
  let senderFromName: string | undefined
  if (event.payloadJson) {
    try {
      const payload = JSON.parse(event.payloadJson)
      if (typeof payload?.replyTo === 'string') senderReplyTo = payload.replyTo
      if (typeof payload?.fromName === 'string') senderFromName = payload.fromName
    } catch {}
  }

  try {
    let delivered = false
    if (event.channel === 'email') {
      delivered = await sendNotificationEmail({
        to: event.recipient || '',
        subject: event.subject,
        body: event.body,
        replyTo: senderReplyTo,
        fromName: senderFromName,
      })
    } else if (event.channel === 'sms') {
      delivered = event.recipient ? await sendSms(event.recipient, event.body || '') : false
    } else if (event.channel === 'in_app') {
      delivered = await createInAppNotification(notificationId)
    } else if (event.channel === 'push') {
      delivered = await deliverPush(notificationId)
    }

    if (!delivered) {
      // Provider not configured or refused the message — record the truth instead
      // of marking the event as sent (attorneys were "notified" without any email going out).
      const reason = event.channel === 'email'
        ? 'Email provider not configured or send failed (check RESEND_API_KEY / RESEND_FROM_EMAIL)'
        : event.channel === 'sms'
          ? 'SMS provider not configured or send failed'
          : 'Delivery failed'
      await prisma.platformNotificationAttempt.update({
        where: { id: attempt.id },
        data: { status: 'failed', errorMessage: reason },
      })
      await prisma.platformNotificationEvent.update({
        where: { id: notificationId },
        data: {
          status: 'failed',
          failedAt: new Date(),
          failureReason: reason,
          retryCount: { increment: 1 },
        },
      })
      logger.warn('Notification not delivered', { eventId: notificationId, channel: event.channel, reason })
      return false
    }

    await prisma.platformNotificationAttempt.update({
      where: { id: attempt.id },
      data: { status: 'success', providerStatusCode: 200 },
    })
    await prisma.platformNotificationEvent.update({
      where: { id: notificationId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        failedAt: null,
        failureReason: null,
        nextRetryAt: null,
        retryCount: { increment: 0 },
      },
    })
    return true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await prisma.platformNotificationAttempt.update({
      where: { id: attempt.id },
      data: { status: 'failed', errorMessage: msg, providerStatusCode: 500 },
    })
    await prisma.platformNotificationEvent.update({
      where: { id: notificationId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        failureReason: msg,
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    })
    return false
  }
}

export async function resendNotification(
  notificationId: string,
  options?: { switchChannel?: string }
): Promise<{ success: boolean; error?: string }> {
  const event = await prisma.platformNotificationEvent.findUnique({
    where: { id: notificationId },
  })
  if (!event) return { success: false, error: 'Notification not found' }
  if (event.status === 'suppressed') return { success: false, error: 'Notification suppressed' }

  // Guard: max resends per 24h
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (event.resendCount >= MAX_RESENDS_PER_24H && event.lastResendAt && event.lastResendAt > dayAgo) {
    return { success: false, error: `Max ${MAX_RESENDS_PER_24H} resends per 24 hours` }
  }

  const channel = options?.switchChannel || event.channel
  await prisma.platformNotificationEvent.update({
    where: { id: notificationId },
    data: {
      channel,
      status: 'pending',
      resendCount: { increment: 1 },
      lastResendAt: new Date(),
      failureReason: null,
      failedAt: null,
    },
  })

  const ok = await attemptDelivery(notificationId)
  return { success: ok }
}

export async function retryPendingPlatformNotifications(limit = 25) {
  const now = new Date()
  const stalePendingCutoff = new Date(Date.now() - 2 * 60 * 1000)
  const events = await prisma.platformNotificationEvent.findMany({
    where: {
      status: { in: ['failed', 'pending'] },
      OR: [
        {
          status: 'failed',
          nextRetryAt: { lte: now },
        },
        {
          status: 'pending',
          sentAt: null,
          createdAt: { lte: stalePendingCutoff },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      status: true,
      retryCount: true,
    },
  })

  let attemptedCount = 0
  let deliveredCount = 0
  let failedCount = 0

  for (const event of events) {
    attemptedCount += 1
    const ok = await attemptDelivery(event.id)
    if (ok) deliveredCount += 1
    else failedCount += 1
  }

  return {
    scannedCount: events.length,
    attemptedCount,
    deliveredCount,
    failedCount,
  }
}

export async function deliverDirectNotification(input: {
  type: 'email' | 'sms' | 'push'
  recipient: string
  subject?: string | null
  message: string
  metadata?: Record<string, unknown>
  userId?: string | null
  attorneyId?: string | null
  assessmentId?: string | null
  role?: 'plaintiff' | 'attorney' | 'admin'
  // When set, email is sent through the platform provider but shows this display
  // name and routes replies to this address (attorney-originated mail).
  replyTo?: string | null
  fromName?: string | null
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId || null,
      type: input.type,
      recipient: input.recipient,
      subject: input.subject || '',
      message: input.message,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      status: 'PENDING',
    },
  })

  const event = await createNotificationEvent({
    userId: input.userId || undefined,
    attorneyId: input.attorneyId || undefined,
    assessmentId: input.assessmentId || undefined,
    role: input.role || (input.attorneyId ? 'attorney' : 'plaintiff'),
    channel: input.type,
    eventType: typeof input.metadata?.eventType === 'string'
      ? input.metadata.eventType
      : `direct.${input.type}`,
    templateKey: 'direct_notification',
    subject: input.subject || 'ClearCaseIQ update',
    body: input.message,
    payload: {
      ...(input.metadata || {}),
      notificationId: notification.id,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.fromName ? { fromName: input.fromName } : {}),
    },
    recipient: input.recipient,
  })

  const refreshedEvent = await prisma.platformNotificationEvent.findUnique({
    where: { id: event.id },
    select: {
      status: true,
      sentAt: true,
      deliveredAt: true,
      failedAt: true,
      failureReason: true,
    },
  })

  const delivered = refreshedEvent?.status === 'sent' || refreshedEvent?.status === 'delivered'

  const updatedNotification = await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: delivered ? 'SENT' : 'FAILED',
      sentAt: delivered ? (refreshedEvent?.sentAt || new Date()) : undefined,
      deliveredAt: delivered ? (refreshedEvent?.deliveredAt || refreshedEvent?.sentAt || new Date()) : undefined,
      metadata: JSON.stringify({
        ...(input.metadata || {}),
        platformNotificationEventId: event.id,
        failureReason: delivered ? null : refreshedEvent?.failureReason || null,
      }),
    },
  })

  return {
    notification: updatedNotification,
    delivered,
    platformEventId: event.id,
  }
}

/**
 * Fan-out a notification to every platform admin. Admins are identified two ways:
 * the ADMIN_EMAILS allow-list and any User row with role='admin'. Best-effort and
 * de-duplicated by email; never throws to the caller. Used for events the ops team
 * must act on, e.g. an attorney declining a routed case so it can be re-routed
 * (CP-390).
 */
export async function notifyAdmins(input: {
  subject: string
  message: string
  metadata?: Record<string, unknown>
  assessmentId?: string | null
}): Promise<number> {
  try {
    const envEmails = (process.env.ADMIN_EMAILS || 'admin@caseiq.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true },
    })

    const recipients = new Map<string, string | null>()
    for (const email of envEmails) recipients.set(email, null)
    for (const u of adminUsers) {
      if (u.email) recipients.set(u.email.toLowerCase(), u.id)
    }

    let sent = 0
    for (const [email, userId] of recipients) {
      try {
        await deliverDirectNotification({
          type: 'email',
          recipient: email,
          subject: input.subject,
          message: input.message,
          role: 'admin',
          userId: userId || undefined,
          assessmentId: input.assessmentId || undefined,
          metadata: { ...(input.metadata || {}), eventType: input.metadata?.eventType || 'admin.alert' },
        })
        sent += 1
      } catch (err: any) {
        logger.warn('Failed to deliver admin notification', { email, error: err?.message })
      }
    }
    return sent
  } catch (error: any) {
    logger.warn('notifyAdmins failed', { error: error?.message })
    return 0
  }
}
