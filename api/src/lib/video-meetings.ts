import { prisma } from './prisma'
import { logger } from './logger'
import { computeAmount, resolveHourlyRate } from './time-tracking'

type ZoomMeetingObject = {
  id?: string | number
  start_time?: string
  end_time?: string
}

/** Whole minutes between Zoom's start and end times, never below 1; null when unusable. */
export function callMinutes(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null
  const start = Date.parse(startTime)
  const end = Date.parse(endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.max(1, Math.ceil((end - start) / 60_000))
}

export async function handleZoomMeetingStarted(object: ZoomMeetingObject) {
  const externalMeetingId = object.id != null ? String(object.id) : ''
  if (!externalMeetingId) return
  const startedAt = object.start_time ? new Date(object.start_time) : new Date()
  await prisma.videoMeeting.updateMany({
    where: { externalMeetingId, status: 'scheduled' },
    data: { status: 'started', startedAt },
  })
}

/**
 * Close out a video meeting: record when it ran and, for meetings on a case,
 * leave an internal case note plus a draft time entry for the attorney to
 * review. Idempotent, since Zoom retries webhooks.
 */
export async function handleZoomMeetingEnded(object: ZoomMeetingObject) {
  const externalMeetingId = object.id != null ? String(object.id) : ''
  if (!externalMeetingId) return { logged: false as const, reason: 'missing_id' }

  const meeting = await prisma.videoMeeting.findUnique({ where: { externalMeetingId } })
  if (!meeting) return { logged: false as const, reason: 'unknown_meeting' }
  if (meeting.status === 'ended') return { logged: false as const, reason: 'already_ended' }

  const minutes = callMinutes(object.start_time, object.end_time)
  await prisma.videoMeeting.update({
    where: { id: meeting.id },
    data: {
      status: 'ended',
      startedAt: meeting.startedAt || (object.start_time ? new Date(object.start_time) : null),
      endedAt: object.end_time ? new Date(object.end_time) : new Date(),
      durationMinutes: minutes,
    },
  })

  if (!meeting.assessmentId || !minutes) return { logged: false as const, reason: 'no_case' }

  const attorney = await prisma.attorney.findUnique({
    where: { id: meeting.attorneyId },
    select: { id: true, name: true, email: true, lawFirmId: true },
  })
  const label = meeting.kind === 'instant' ? 'Video call' : 'Video consultation'
  const description = `${label} with client (Zoom), ${minutes} min`

  await prisma.caseNote
    .create({
      data: {
        assessmentId: meeting.assessmentId,
        authorId: attorney?.id || null,
        authorName: attorney?.name || null,
        authorEmail: attorney?.email || null,
        noteType: 'internal',
        message: `${description}. Logged automatically when the meeting ended.`,
      },
    })
    .catch((error: any) => logger.warn('Video call case note failed', { meetingId: meeting.id, error: error?.message }))

  if (!attorney?.lawFirmId) return { logged: true as const, timeEntryId: null }

  const member = await prisma.firmMember.findFirst({
    where: { lawFirmId: attorney.lawFirmId, attorneyId: attorney.id },
    select: { id: true, userId: true, role: true },
  })
  const role = member?.role || 'attorney'
  const hourlyRate = await resolveHourlyRate(attorney.lawFirmId, { firmMemberId: member?.id, role })
  const entry = await prisma.timeEntry.create({
    data: {
      lawFirmId: attorney.lawFirmId,
      assessmentId: meeting.assessmentId,
      userId: member?.userId || null,
      firmMemberId: member?.id || null,
      attorneyId: attorney.id,
      role,
      workDate: meeting.startedAt || (object.start_time ? new Date(object.start_time) : new Date()),
      minutes,
      activityType: 'comms',
      description,
      billable: true,
      hourlyRate,
      amount: computeAmount(minutes, hourlyRate, true),
      // Draft so the attorney confirms it before it reaches an invoice.
      status: 'draft',
    },
    select: { id: true },
  })
  await prisma.videoMeeting.update({ where: { id: meeting.id }, data: { timeEntryId: entry.id } })
  return { logged: true as const, timeEntryId: entry.id }
}
