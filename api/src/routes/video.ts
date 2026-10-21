import { Router } from 'express'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { getZoomUserToken, isZoomEmbedEnabled, signZoomSdkJoin } from '../lib/zoom'

const router = Router()
router.use(authMiddleware)

/**
 * Credentials for joining a video meeting inside the platform. The attorney who
 * owns the Zoom meeting joins as host (ZAK); the case's client joins as an
 * attendee with an on-behalf-of token from the attorney's account. Everyone
 * else is refused. `fallbackUrl` opens the same meeting in the Zoom app.
 */
router.get('/:kind/:id/join', async (req: AuthRequest, res) => {
  try {
    const kind = String(req.params.kind)
    const id = String(req.params.id || '')
    if (kind !== 'appointment' && kind !== 'meeting') return res.status(404).json({ error: 'Not found' })

    const meeting =
      kind === 'meeting'
        ? await prisma.videoMeeting.findUnique({ where: { id } })
        : await prisma.videoMeeting.findFirst({ where: { appointmentId: id }, orderBy: { createdAt: 'desc' } })
    if (!meeting) return res.status(404).json({ error: 'Video meeting not found' })

    const attorney = req.user?.email
      ? await prisma.attorney.findFirst({ where: { email: req.user.email }, select: { id: true, name: true, email: true } })
      : null
    const isHost = Boolean(attorney && attorney.id === meeting.attorneyId)

    let clientUserId = meeting.userId
    if (!clientUserId && meeting.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: meeting.appointmentId },
        select: { userId: true },
      })
      clientUserId = appointment?.userId || null
    }
    const isClient = Boolean(req.user?.id && clientUserId && req.user.id === clientUserId)
    if (!isHost && !isClient) return res.status(404).json({ error: 'Video meeting not found' })

    const fallbackUrl = isHost ? meeting.startUrl : meeting.joinUrl
    if (!isZoomEmbedEnabled()) {
      return res.status(409).json({ error: 'In-platform video is not enabled.', fallbackUrl })
    }
    if (meeting.status === 'ended' && meeting.kind === 'instant') {
      return res.status(410).json({ error: 'This call has ended.', fallbackUrl: null })
    }

    const token = isHost
      ? await getZoomUserToken(meeting.attorneyId, 'zak')
      : await getZoomUserToken(meeting.attorneyId, 'onbehalf', meeting.externalMeetingId)
    if (!token) {
      return res.status(409).json({ error: 'Zoom could not authorize this join. Use the Zoom app instead.', fallbackUrl })
    }

    const { signature, sdkKey } = signZoomSdkJoin(meeting.externalMeetingId, isHost ? 1 : 0)
    const userName = isHost
      ? attorney?.name || 'Attorney'
      : `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Client'

    res.json({
      sdkKey,
      signature,
      meetingNumber: meeting.externalMeetingId,
      password: meeting.password,
      userName,
      userEmail: isHost ? attorney?.email || null : req.user?.email || null,
      role: isHost ? 1 : 0,
      zak: isHost ? token : null,
      obfToken: isHost ? null : token,
      fallbackUrl,
    })
  } catch (error: any) {
    logger.error('Failed to build video join', { error: error?.message, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to join the video call' })
  }
})

export default router
