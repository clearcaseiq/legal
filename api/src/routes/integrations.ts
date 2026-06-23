/**
 * CMS integration routes (Phase 0–4).
 *
 *   GET    /v1/integrations/providers           list providers + config status
 *   GET    /v1/integrations/connections         list this firm's connections
 *   POST   /v1/integrations/connect/:provider   begin connect (OAuth url or creds)
 *   GET    /v1/integrations/callback/:provider   OAuth redirect target
 *   POST   /v1/integrations/connections         create credential connection (pat/partner/webhook)
 *   DELETE /v1/integrations/connections/:id      disconnect
 *   GET    /v1/integrations/connections/:id/logs recent sync log
 *   POST   /v1/integrations/export              manually export a case
 *   POST   /v1/integrations/webhooks/inbound/:provider  inbound status sync
 */
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { ENV } from '../env'
import {
  applyInboundMatterStatus,
  createCredentialConnection,
  disconnectConnection,
  exportCaseToConnection,
  EthicalWallBlockedError,
  getConnection,
  getConnector,
  listConnections,
  listProviderMeta,
  signCmsState,
  upsertOAuthConnection,
  verifyCmsState,
} from '../lib/cms'

const router = Router()

/** Resolve the acting user's firm + attorney identity. */
async function getActorContext(req: AuthRequest): Promise<{
  lawFirmId: string | null
  attorneyId: string | null
}> {
  const email = req.user?.email
  const userId = req.user?.id
  let attorneyId: string | null = null
  let lawFirmId: string | null = null

  if (email) {
    const attorney = await prisma.attorney.findFirst({
      where: { email },
      select: { id: true, lawFirmId: true },
    })
    if (attorney) {
      attorneyId = attorney.id
      lawFirmId = attorney.lawFirmId
    }
  }
  if (!lawFirmId && userId) {
    const member = await prisma.firmMember.findFirst({
      where: { userId, status: 'active' },
      select: { lawFirmId: true, attorneyId: true },
    })
    if (member) {
      lawFirmId = member.lawFirmId
      attorneyId = attorneyId ?? member.attorneyId
    }
  }
  return { lawFirmId, attorneyId }
}

function frontendRedirect(provider: string, status: 'success' | 'error', error?: string) {
  const url = new URL('/integrations', ENV.WEB_URL)
  url.searchParams.set('cms_provider', provider)
  url.searchParams.set('cms_status', status)
  if (error) url.searchParams.set('cms_error', error)
  return url.toString()
}

// --- Providers --------------------------------------------------------------
router.get('/providers', authMiddleware, async (_req, res) => {
  res.json({ providers: listProviderMeta() })
})

// --- Connections list -------------------------------------------------------
router.get('/connections', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId } = await getActorContext(req)
  if (!lawFirmId) return res.json({ connections: [] })
  const connections = await listConnections(lawFirmId)
  res.json({
    connections: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      authType: c.authType,
      status: c.status,
      externalAccountEmail: c.externalAccountEmail,
      apiBaseUrl: c.apiBaseUrl,
      lastSyncedAt: c.lastSyncedAt,
      lastError: c.lastError,
      createdAt: c.createdAt,
    })),
  })
})

// --- Begin connect ----------------------------------------------------------
const ConnectSchema = z.object({
  // For credential providers (pat/partner/webhook):
  apiBaseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  pat: z.string().optional(),
  webhookUrl: z.string().url().optional(),
})

router.post('/connect/:provider', authMiddleware, async (req: AuthRequest, res) => {
  const provider = req.params.provider
  const connector = getConnector(provider)
  if (!connector) return res.status(404).json({ error: 'Unknown provider' })

  const { lawFirmId, attorneyId } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })

  // OAuth providers return an authorize URL the client should open.
  if (connector.authType === 'oauth') {
    if (!connector.buildAuthorizeUrl) return res.status(400).json({ error: 'Provider missing OAuth support' })
    try {
      const state = signCmsState({ provider: connector.id, lawFirmId, attorneyId, userId: req.user?.id })
      return res.json({ mode: 'oauth', authorizeUrl: connector.buildAuthorizeUrl(state) })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'oauth_unavailable'
      return res.status(400).json({ error: message })
    }
  }

  // Credential providers create the connection inline.
  const parsed = ConnectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const body = parsed.data

  try {
    let connection
    if (connector.authType === 'pat') {
      if (!body.pat) return res.status(400).json({ error: 'A Personal Access Token (pat) is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'pat',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        apiBaseUrl: body.apiBaseUrl,
        refreshSecret: body.pat,
      })
    } else if (connector.authType === 'partner') {
      if (!body.apiKey) return res.status(400).json({ error: 'An API key is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'partner',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        apiBaseUrl: body.apiBaseUrl,
        config: { apiKey: body.apiKey, apiBaseUrl: body.apiBaseUrl },
      })
    } else {
      // webhook
      if (!body.webhookUrl) return res.status(400).json({ error: 'A webhookUrl is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'webhook',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        config: { webhookUrl: body.webhookUrl },
      })
    }
    return res.json({ mode: 'connected', connectionId: connection.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'connect_failed'
    logger.error('CMS connect failed', { error, provider })
    return res.status(400).json({ error: message })
  }
})

// --- OAuth callback ---------------------------------------------------------
router.get('/callback/:provider', async (req, res) => {
  const provider = req.params.provider
  const connector = getConnector(provider)
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''

  if (!connector || !connector.exchangeCode || !code || !state) {
    return res.redirect(frontendRedirect(provider, 'error', 'missing_callback_params'))
  }

  try {
    const decoded = verifyCmsState(state)
    if (decoded.provider !== provider) throw new Error('provider_mismatch')

    const tokens = await connector.exchangeCode(code)
    await upsertOAuthConnection({
      provider: connector.id,
      lawFirmId: decoded.lawFirmId,
      attorneyId: decoded.attorneyId,
      createdByUserId: decoded.userId,
      tokens,
      apiBaseUrl: provider === 'clio' ? ENV.CLIO_API_BASE : null,
    })
    return res.redirect(frontendRedirect(provider, 'success'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_failed'
    logger.error('CMS OAuth callback failed', { error, provider })
    return res.redirect(frontendRedirect(provider, 'error', message))
  }
})

// --- Disconnect -------------------------------------------------------------
router.delete('/connections/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId } = await getActorContext(req)
  const connection = await getConnection(req.params.id)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }
  await disconnectConnection(connection.id)
  res.json({ ok: true })
})

// --- Sync log ---------------------------------------------------------------
router.get('/connections/:id/logs', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId } = await getActorContext(req)
  const connection = await getConnection(req.params.id)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }
  const logs = await prisma.cmsSyncLog.findMany({
    where: { connectionId: connection.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({ logs })
})

// --- Manual export ----------------------------------------------------------
const ExportSchema = z.object({
  assessmentId: z.string().min(1),
  connectionId: z.string().min(1).optional(),
})

router.post('/export', authMiddleware, async (req: AuthRequest, res) => {
  const parsed = ExportSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { lawFirmId, attorneyId } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })

  // Resolve target connection(s).
  let connectionIds: string[] = []
  if (parsed.data.connectionId) {
    const c = await getConnection(parsed.data.connectionId)
    if (!c || c.lawFirmId !== lawFirmId) return res.status(404).json({ error: 'Connection not found' })
    connectionIds = [c.id]
  } else {
    const conns = await listConnections(lawFirmId)
    connectionIds = conns.filter((c) => c.status === 'connected').map((c) => c.id)
  }
  if (connectionIds.length === 0) return res.status(400).json({ error: 'No connected CMS to export to' })

  const results = []
  for (const connectionId of connectionIds) {
    try {
      results.push(
        await exportCaseToConnection({
          connectionId,
          assessmentId: parsed.data.assessmentId,
          actorUserId: req.user?.id,
          actorAttorneyId: attorneyId,
        })
      )
    } catch (error) {
      if (error instanceof EthicalWallBlockedError) {
        return res.status(403).json({ error: error.message })
      }
      const message = error instanceof Error ? error.message : 'export_failed'
      results.push({ connectionId, error: message })
    }
  }
  res.json({ results })
})

// --- Inbound webhook (status sync) -----------------------------------------
router.post('/webhooks/inbound/:provider', async (req, res) => {
  const provider = req.params.provider
  const connectionId = typeof req.body?.connectionId === 'string' ? req.body.connectionId : ''
  const externalMatterId = typeof req.body?.matterId === 'string' ? req.body.matterId : String(req.body?.matterId ?? '')
  const status = typeof req.body?.status === 'string' ? req.body.status : ''

  if (!connectionId || !externalMatterId || !status) {
    return res.status(400).json({ error: 'connectionId, matterId and status are required' })
  }
  try {
    const result = await applyInboundMatterStatus({ connectionId, externalMatterId, status, raw: req.body })
    res.json(result)
  } catch (error) {
    logger.error('Inbound CMS webhook failed', { error, provider })
    res.status(500).json({ error: 'inbound_failed' })
  }
})

export default router
