import { prisma } from './prisma'
import { logger } from './logger'
import { deliverDirectNotification } from './platform-notifications'

const DEFAULT_REMINDER_SCHEDULE = [
  { key: 'upcoming_24h', minutesBefore: 24 * 60 },
  { key: 'upcoming_2h', minutesBefore: 2 * 60 },
  { key: 'upcoming_15m', minutesBefore: 15 },
] as const

type AssessmentFacts = {
  incident?: { narrative?: string; location?: string }
}

type PrepSeedMetadata = {
  appointmentId: string
  assessmentId?: string | null
  eventType: 'prep_seeded'
  items: Array<{
    itemType: string
    label: string
    description: string
    isRequired: boolean
  }>
}

function parseJson<T>(value?: string | null, fallback?: T): T | undefined {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

async function createNotification(params: {
  type?: string
  recipient: string
  subject: string
  message: string
  metadata?: Record<string, unknown>
  userId?: string | null
  status?: string
}) {
  if (params.type === 'email' || params.type === 'sms' || params.type === 'push' || !params.type) {
    const { notification } = await deliverDirectNotification({
      type: (params.type as 'email' | 'sms' | 'push') || 'email',
      recipient: params.recipient,
      subject: params.subject,
      message: params.message,
      metadata: params.metadata,
      userId: params.userId || null,
      attorneyId: typeof params.metadata?.attorneyId === 'string' ? params.metadata.attorneyId : null,
      assessmentId: typeof params.metadata?.assessmentId === 'string' ? params.metadata.assessmentId : null,
      role: typeof params.metadata?.attorneyId === 'string' ? 'attorney' : 'plaintiff',
    })
    return notification
  }

  return prisma.notification.create({
    data: {
      userId: params.userId || null,
      type: params.type,
      recipient: params.recipient,
      subject: params.subject,
      message: params.message,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      status: params.status || 'SENT',
    },
  })
}

export function getDefaultReminderSchedule() {
  return [...DEFAULT_REMINDER_SCHEDULE]
}

export async function buildPrepItemsForAppointment(assessmentId?: string | null) {
  if (!assessmentId) {
    return [{
      itemType: 'consult_goal',
      label: 'Write down your top three questions for the attorney',
      description: 'This helps you use the consultation time efficiently.',
      isRequired: true,
    }]
  }

  const [assessment, evidenceFiles, leadSubmission] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { facts: true },
    }),
    prisma.evidenceFile.findMany({
      where: { assessmentId },
      select: { category: true },
    }).catch(() => [] as Array<{ category?: string | null }>),
    prisma.leadSubmission.findUnique({
      where: { assessmentId },
      select: { evidenceChecklist: true },
    }).catch(() => null),
  ])

  const facts = parseJson<AssessmentFacts>(assessment?.facts, {}) || {}
  const checklist = parseJson<{ required?: string[] }>(leadSubmission?.evidenceChecklist || '', { required: [] }) || { required: [] }
  const evidenceCategories = new Set(evidenceFiles.map((file) => (file.category || '').toLowerCase()).filter(Boolean))

  return [
    !facts.incident?.narrative && {
      itemType: 'incident_summary',
      label: 'Add or refine your incident summary',
      description: 'A short timeline of what happened helps the attorney prepare quickly.',
      isRequired: true,
    },
    !evidenceCategories.has('medical_records') && {
      itemType: 'medical_records',
      label: 'Upload any medical records or visit summaries',
      description: 'Bring or upload records from urgent care, ER, specialists, or PT.',
      isRequired: true,
    },
    !evidenceCategories.has('injury_photos') && !evidenceCategories.has('photos') && {
      itemType: 'injury_photos',
      label: 'Upload injury or damage photos',
      description: 'Photos often answer questions before the call starts.',
      isRequired: false,
    },
    checklist.required?.includes('wage_loss') && {
      itemType: 'wage_loss',
      label: 'Prepare wage loss proof',
      description: 'Have recent pay stubs, missed-work dates, or employer contact ready.',
      isRequired: false,
    },
    {
      itemType: 'consult_goal',
      label: 'Write down your top three questions for the attorney',
      description: 'This helps you use the consultation time efficiently.',
      isRequired: true,
    },
  ].filter(Boolean) as Array<{
    itemType: string
    label: string
    description: string
    isRequired: boolean
  }>
}

export async function seedAppointmentPrepItems(appointmentId: string, assessmentId?: string | null) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: { select: { email: true } },
    },
  })
  if (!appointment?.user?.email) return

  const existingSeed = await prisma.notification.findFirst({
    where: {
      recipient: appointment.user.email,
      metadata: { contains: appointmentId },
      subject: 'Consultation checklist ready',
    },
    select: { id: true },
  })
  if (existingSeed) return

  const items = await buildPrepItemsForAppointment(assessmentId)
  await createNotification({
    recipient: appointment.user.email,
    userId: appointment.userId,
    subject: 'Consultation checklist ready',
    message: 'Your consultation prep checklist is ready.',
    metadata: {
      appointmentId,
      assessmentId: assessmentId || null,
      eventType: 'prep_seeded',
      items,
    } satisfies PrepSeedMetadata,
  })
}

export async function notifyAppointmentEvent(params: {
  appointmentId: string
  userId: string
  attorneyId: string
  assessmentId?: string | null
  type: 'scheduled' | 'rescheduled' | 'cancelled' | 'earlier_slot'
  scheduledAt?: Date
}) {
  const [user, attorney] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    }),
    prisma.attorney.findUnique({
      where: { id: params.attorneyId },
      select: { name: true },
    }),
  ])

  if (!user?.email || !attorney?.name) return

  const when = params.scheduledAt
    ? new Date(params.scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null
  const subjectMap = {
    scheduled: 'Consultation booked',
    rescheduled: 'Consultation updated',
    cancelled: 'Consultation cancelled',
    earlier_slot: 'Earlier consultation slot available',
  } as const
  const messageMap = {
    scheduled: `Your consultation with ${attorney.name} is booked${when ? ` for ${when}` : ''}.`,
    rescheduled: `Your consultation with ${attorney.name} was updated${when ? ` to ${when}` : ''}.`,
    cancelled: `Your consultation with ${attorney.name} was cancelled.`,
    earlier_slot: `An earlier consultation slot with ${attorney.name} is now available${when ? ` at ${when}` : ''}.`,
  } as const

  await createNotification({
    recipient: user.email,
    userId: params.userId,
    subject: subjectMap[params.type],
    message: messageMap[params.type],
    metadata: {
      appointmentId: params.appointmentId,
      assessmentId: params.assessmentId || null,
      attorneyId: params.attorneyId,
      eventType: params.type,
      scheduledAt: params.scheduledAt?.toISOString?.() || null,
    },
  })
}

export async function joinAppointmentWaitlist(params: {
  attorneyId: string
  userId: string
  assessmentId?: string | null
  appointmentId?: string | null
  preferredDate?: Date | null
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  })
  if (!user?.email) {
    throw new Error('User not found')
  }

  return createNotification({
    type: 'waitlist',
    recipient: user.email,
    userId: params.userId,
    subject: 'Earlier-slot waitlist joined',
    message: 'You joined the earlier-slot waitlist for this attorney.',
    metadata: {
      attorneyId: params.attorneyId,
      assessmentId: params.assessmentId || null,
      appointmentId: params.appointmentId || null,
      preferredDate: params.preferredDate?.toISOString?.() || null,
      waitlistStatus: 'active',
      eventType: 'waitlist_joined',
    },
    status: 'PENDING',
  })
}

export async function notifyWaitlistForFreedSlot(params: {
  attorneyId: string
  slotStart: Date
  appointmentId?: string | null
}) {
  const entries = await prisma.notification.findMany({
    where: {
      type: 'waitlist',
      status: 'PENDING',
      metadata: { contains: params.attorneyId },
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })

  for (const entry of entries) {
    await createNotification({
      recipient: entry.recipient,
      userId: entry.userId,
      subject: 'Earlier consultation slot available',
      message: `A new consultation opening is available on ${params.slotStart.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      metadata: {
        attorneyId: params.attorneyId,
        appointmentId: params.appointmentId || null,
        eventType: 'earlier_slot',
      },
    })
    await prisma.notification.update({
      where: { id: entry.id },
      data: { status: 'COMPLETED' },
    })
  }

  return { notifiedCount: entries.length }
}

export async function sweepUpcomingAppointmentReminders() {
  const now = new Date()
  const upcoming = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: {
        gte: now,
        lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      user: { select: { email: true } },
    },
  })

  let sentCount = 0
  for (const appointment of upcoming) {
    if (!appointment.user.email) continue
    const minutesUntil = Math.round((appointment.scheduledAt.getTime() - now.getTime()) / 60000)
    for (const reminder of DEFAULT_REMINDER_SCHEDULE) {
      const inWindow = minutesUntil <= reminder.minutesBefore && minutesUntil > reminder.minutesBefore - 15
      if (!inWindow) continue

      const alreadySent = await prisma.notification.findFirst({
        where: {
          recipient: appointment.user.email,
          subject: 'Consultation reminder',
          metadata: { contains: reminder.key },
        },
        select: { id: true },
      })
      if (alreadySent) continue

      await createNotification({
        recipient: appointment.user.email,
        userId: appointment.userId,
        subject: 'Consultation reminder',
        message: `${reminder.key}: your consultation starts on ${appointment.scheduledAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        metadata: {
          appointmentId: appointment.id,
          assessmentId: appointment.assessmentId,
          eventType: reminder.key,
        },
      })
      sentCount += 1
    }
  }

  return { scanned: upcoming.length, sentCount }
}

export async function getAppointmentPreparation(appointmentId: string, userId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      userId,
    },
    include: {
      user: { select: { email: true } },
    },
  })
  if (!appointment?.user.email) return null

  const [seedNotification, prepUpdates, notesEntry, waitlistEntry] = await Promise.all([
    prisma.notification.findFirst({
      where: {
        recipient: appointment.user.email,
        metadata: { contains: appointmentId },
        subject: 'Consultation checklist ready',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: {
        recipient: appointment.user.email,
        metadata: { contains: appointmentId },
        subject: 'Consultation prep updated',
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.notification.findFirst({
      where: {
        recipient: appointment.user.email,
        metadata: { contains: appointmentId },
        subject: 'Consultation prep notes',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findFirst({
      where: {
        recipient: appointment.user.email,
        type: 'waitlist',
        metadata: { contains: appointment.attorneyId },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const seed = parseJson<PrepSeedMetadata>(seedNotification?.metadata || '', {
    appointmentId,
    eventType: 'prep_seeded',
    items: await buildPrepItemsForAppointment(appointment.assessmentId),
  })
  const notesMetadata = parseJson<{ preparationNotes?: string; checkInStatus?: string }>(notesEntry?.metadata || '', {})
  const waitlistMetadata = parseJson<{ waitlistStatus?: string }>(waitlistEntry?.metadata || '', {})

  const prepItems = (seed?.items || []).map((item) => {
    const latest = prepUpdates
      .filter((entry) => entry.metadata?.includes(`"itemType":"${item.itemType}"`))
      .at(-1)
    const latestMetadata = parseJson<{ status?: string }>(latest?.metadata || '', {})
    return {
      id: `${appointment.id}:${item.itemType}`,
      label: item.label,
      description: item.description,
      isRequired: item.isRequired,
      status: latestMetadata?.status || 'pending',
    }
  })

  return {
    appointmentId: appointment.id,
    scheduledAt: appointment.scheduledAt,
    checkInStatus: notesMetadata?.checkInStatus || 'pending',
    preparationNotes: notesMetadata?.preparationNotes || '',
    prepItems,
    waitlistStatus: waitlistMetadata?.waitlistStatus || null,
    reminderSchedule: getDefaultReminderSchedule(),
  }
}

export async function updateAppointmentPreparation(params: {
  appointmentId: string
  userId: string
  preparationNotes?: string
  checkInStatus?: string
  items?: Array<{ id: string; status: string }>
}) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      userId: params.userId,
    },
    include: {
      user: { select: { email: true } },
    },
  })
  if (!appointment?.user.email) return null

  for (const item of params.items || []) {
    const itemType = item.id.split(':')[1] || item.id
    await createNotification({
      recipient: appointment.user.email,
      userId: params.userId,
      subject: 'Consultation prep updated',
      message: `Prep item ${itemType} updated to ${item.status}.`,
      metadata: {
        appointmentId: appointment.id,
        itemType,
        status: item.status,
      },
    })
  }

  if (params.preparationNotes !== undefined || params.checkInStatus !== undefined) {
    await createNotification({
      recipient: appointment.user.email,
      userId: params.userId,
      subject: 'Consultation prep notes',
      message: 'Consultation prep notes saved.',
      metadata: {
        appointmentId: appointment.id,
        preparationNotes: params.preparationNotes || '',
        checkInStatus: params.checkInStatus || 'pending',
      },
    })
  }

  return getAppointmentPreparation(appointment.id, params.userId)
}

export async function buildAttorneyConversionMetrics(attorneyId: string) {
  const [introductions, appointments, reviews] = await Promise.all([
    prisma.introduction.findMany({
      where: { attorneyId },
      select: { status: true },
    }),
    prisma.appointment.findMany({
      where: { attorneyId },
      select: { status: true },
    }),
    prisma.attorneyReview.findMany({
      where: { attorneyId },
      select: { isVerified: true },
    }),
  ])

  const routed = introductions.length
  const accepted = introductions.filter((intro) => intro.status === 'ACCEPTED').length
  const booked = appointments.filter((appointment) => ['SCHEDULED', 'CONFIRMED', 'COMPLETED'].includes(appointment.status)).length
  const completed = appointments.filter((appointment) => appointment.status === 'COMPLETED').length
  const verifiedReviews = reviews.filter((review) => review.isVerified).length

  return {
    routed,
    accepted,
    booked,
    completed,
    acceptanceRate: routed > 0 ? Math.round((accepted / routed) * 100) : 0,
    bookingRate: accepted > 0 ? Math.round((booked / accepted) * 100) : 0,
    completionRate: booked > 0 ? Math.round((completed / booked) * 100) : 0,
    verifiedReviews,
  }
}

export async function getResponseTimeBadge(attorneyId: string, fallbackHours: number) {
  const acceptedIntros = await prisma.introduction.findMany({
    where: {
      attorneyId,
      respondedAt: { not: null },
    },
    select: {
      requestedAt: true,
      respondedAt: true,
    },
    orderBy: { respondedAt: 'desc' },
    take: 20,
  })

  const responseHours = acceptedIntros
    .map((intro) => {
      if (!intro.requestedAt || !intro.respondedAt) return 0
      return (new Date(intro.respondedAt).getTime() - new Date(intro.requestedAt).getTime()) / 3600000
    })
    .filter((hours) => hours > 0)

  const effectiveHours = responseHours.length > 0
    ? Math.round(responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length)
    : fallbackHours

  const badge = effectiveHours <= 2
    ? 'Fast responder'
    : effectiveHours <= 8
      ? 'Same-day replies'
      : effectiveHours <= 24
        ? 'Typically replies within 24h'
        : 'Replies within a few days'

  return { hours: effectiveHours, badge }
}

export async function maybeVerifyAttorneyReview(params: { attorneyId: string; userId: string }) {
  const [completedAppointment, acceptedIntro] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        attorneyId: params.attorneyId,
        userId: params.userId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      select: { id: true },
    }),
    prisma.introduction.findFirst({
      where: {
        attorneyId: params.attorneyId,
        status: 'ACCEPTED',
        assessment: {
          userId: params.userId,
        },
      },
      select: { id: true },
    }).catch(() => null),
  ])

  return Boolean(completedAppointment || acceptedIntro)
}

export async function runAppointmentEngagementSweep() {
  try {
    return await sweepUpcomingAppointmentReminders()
  } catch (error) {
    logger.error('Appointment engagement sweep failed', { error })
    throw error
  }
}
