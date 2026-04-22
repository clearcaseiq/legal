import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import {
  buildCalendarAuthorizeUrl,
  calendarFrontendRedirect,
  disconnectAttorneyCalendarConnection,
  getAttorneyCalendarHealth,
  handleGoogleCalendarWebhook,
  handleMicrosoftCalendarWebhook,
  listAttorneyCalendarConnections,
  syncCalendarConnection,
  upsertCalendarConnectionFromCode,
  verifyCalendarStateToken,
  type CalendarProvider,
} from '../lib/calendar-sync'

const router = Router()

const ProviderSchema = z.enum(['google', 'microsoft'])

async function getAttorneyByUser(req: AuthRequest) {
  if (!req.user?.email) {
    return null
  }

  return prisma.attorney.findFirst({
    where: { email: req.user.email },
    select: { id: true, email: true, name: true },
  })
}

router.get('/callback/:provider', async (req, res) => {
  const providerParsed = ProviderSchema.safeParse(req.params.provider)
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''

  if (!providerParsed.success || !code || !state) {
    return res.redirect(calendarFrontendRedirect('google', 'error', 'missing_callback_params'))
  }

  const provider = providerParsed.data

  try {
    const verified = verifyCalendarStateToken(state)
    if (verified.provider !== provider) {
      throw new Error('Provider mismatch')
    }

    const attorney = await prisma.attorney.findUnique({
      where: { id: verified.attorneyId },
      select: { id: true },
    })

    if (!attorney) {
      throw new Error('Attorney profile not found')
    }

    const connection = await upsertCalendarConnectionFromCode({
      attorneyId: attorney.id,
      provider,
      code,
    })

    await syncCalendarConnection(connection.id)

    return res.redirect(calendarFrontendRedirect(provider, 'success'))
  } catch (error) {
    logger.error('Attorney calendar callback failed', { error, provider })
    const message = error instanceof Error ? error.message : 'calendar_sync_failed'
    return res.redirect(calendarFrontendRedirect(provider, 'error', message))
  }
})

router.post('/webhooks/google', async (req, res) => {
  try {
    await handleGoogleCalendarWebhook(req.headers)
    res.status(200).send('ok')
  } catch (error) {
    logger.error('Google calendar webhook failed', { error })
    res.status(500).send('error')
  }
})

router.post('/webhooks/microsoft', async (req, res) => {
  const validationToken = typeof req.query.validationToken === 'string' ? req.query.validationToken : ''
  if (validationToken) {
    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(validationToken)
  }

  try {
    await handleMicrosoftCalendarWebhook(req.body)
    res.status(202).json({ accepted: true })
  } catch (error) {
    logger.error('Microsoft calendar webhook failed', { error })
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const connections = await listAttorneyCalendarConnections(attorney.id)
    res.json({ connections })
  } catch (error) {
    logger.error('Failed to load attorney calendar connections', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/health', async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const health = await getAttorneyCalendarHealth(attorney.id)
    res.json(health)
  } catch (error) {
    logger.error('Failed to load attorney calendar health', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:provider/connect', async (req: AuthRequest, res) => {
  const providerParsed = ProviderSchema.safeParse(req.params.provider)
  if (!providerParsed.success) {
    return res.status(400).json({ error: 'Unsupported calendar provider' })
  }

  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const authorizeUrl = buildCalendarAuthorizeUrl(attorney.id, providerParsed.data)
    res.json({ authorizeUrl })
  } catch (error) {
    logger.error('Failed to create calendar authorize url', { error, provider: req.params.provider, userId: req.user?.id })
    const message = error instanceof Error ? error.message : 'Calendar provider is not configured'
    res.status(503).json({ error: message })
  }
})

router.post('/:provider/sync', async (req: AuthRequest, res) => {
  const providerParsed = ProviderSchema.safeParse(req.params.provider)
  if (!providerParsed.success) {
    return res.status(400).json({ error: 'Unsupported calendar provider' })
  }

  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const connection = await prisma.attorneyCalendarConnection.findUnique({
      where: {
        attorneyId_provider: {
          attorneyId: attorney.id,
          provider: providerParsed.data,
        },
      },
      select: { id: true },
    })

    if (!connection) {
      return res.status(404).json({ error: 'Calendar connection not found' })
    }

    const result = await syncCalendarConnection(connection.id)
    res.json(result)
  } catch (error) {
    logger.error('Failed to sync attorney calendar', { error, provider: req.params.provider, userId: req.user?.id })
    const message = error instanceof Error ? error.message : 'Calendar sync failed'
    res.status(500).json({ error: message })
  }
})

router.delete('/:provider', async (req: AuthRequest, res) => {
  const providerParsed = ProviderSchema.safeParse(req.params.provider)
  if (!providerParsed.success) {
    return res.status(400).json({ error: 'Unsupported calendar provider' })
  }

  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const result = await disconnectAttorneyCalendarConnection(attorney.id, providerParsed.data as CalendarProvider)
    res.json(result)
  } catch (error) {
    logger.error('Failed to disconnect attorney calendar', { error, provider: req.params.provider, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
